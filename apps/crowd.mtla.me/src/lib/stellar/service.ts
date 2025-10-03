import type { Horizon } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig, type StellarConfig } from "./config";
import { StellarError, type StellarServiceError } from "./errors";
import type { ProjectData, ProjectInfo } from "./types";
import {
  fetchProjectDataFromIPFS,
  getCurrentFundingMetrics,
  getTokenHolders,
  getTopSupporters,
  isProjectExpired,
  sortProjectsByPriority,
} from "./utils";

export interface StellarService {
  readonly getProjects: () => Effect.Effect<ProjectInfo[], StellarServiceError>;
  readonly getProject: (code: string) => Effect.Effect<ProjectInfo | null, StellarServiceError>;
}

export const StellarServiceTag = Context.GenericTag<StellarService>(
  "@crowd.mtla.me/StellarService",
);

const checkTokenExists = (
  server: Readonly<Horizon.Server>,
  publicKey: Readonly<string>,
  assetCode: Readonly<string>,
): Effect.Effect<boolean, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        // Check claimable balances for the token
        const claimableBalances = await server.claimableBalances()
          .sponsor(publicKey)
          .call();

        for (const balance of claimableBalances.records) {
          const asset = balance.asset;
          if (asset !== "native" && asset.split(":")[0] === assetCode) {
            return true;
          }
        }

        // Check account balances for the token
        try {
          const account = await server.loadAccount(publicKey);
          for (const balance of account.balances) {
            if (
              balance.asset_type !== "native"
              && balance.asset_type !== "liquidity_pool_shares"
              && "asset_code" in balance
              && "asset_issuer" in balance
              && balance.asset_code === assetCode
              && balance.asset_issuer === publicKey
            ) {
              return true;
            }
          }
        } catch {
          // Account might not exist or have the token, that's ok
        }

        return false;
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "check_token_exists",
        }),
    }),
  );

const checkActiveSellOffer = (
  server: Readonly<Horizon.Server>,
  publicKey: Readonly<string>,
  crowdfundingTokenCode: Readonly<string>,
): Effect.Effect<boolean, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const allRecords: Horizon.ServerApi.OfferRecord[] = [];
        let callBuilder = server.offers()
          .forAccount(publicKey)
          .limit(200);

        while (true) {
          const response = await callBuilder.call();
          allRecords.push(...response.records);

          if (response.records.length < 200) {
            break;
          }

          const lastRecord = response.records[response.records.length - 1];
          if (lastRecord === undefined) break;

          callBuilder = server.offers()
            .forAccount(publicKey)
            .cursor(lastRecord.paging_token)
            .limit(200);
        }

        // Check if there's an active sell offer for this C-token
        return allRecords.some(offer =>
          offer.selling.asset_type !== "native"
          && offer.selling.asset_code === crowdfundingTokenCode
          && offer.selling.asset_issuer === publicKey
        );
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "check_active_sell_offer",
        }),
    }),
  );

const getClaimableBalances = (
  server: Readonly<Horizon.Server>,
  publicKey: Readonly<string>,
): Effect.Effect<readonly Horizon.ServerApi.ClaimableBalanceRecord[], StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const allRecords: Horizon.ServerApi.ClaimableBalanceRecord[] = [];
        let callBuilder = server.claimableBalances()
          .claimant(publicKey)
          .limit(200); // Maximum allowed per request

        // Fetch all pages using pagination
        while (true) {
          const response = await callBuilder.call();
          allRecords.push(...response.records);

          // If we got fewer records than the limit, we've reached the end
          if (response.records.length < 200) {
            break;
          }

          // Prepare next page request
          const lastRecord = response.records[response.records.length - 1];
          if (lastRecord === undefined) break; // Safety check

          callBuilder = server.claimableBalances()
            .claimant(publicKey)
            .cursor(lastRecord.paging_token)
            .limit(200);
        }

        return allRecords;
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "get_claimable_balances",
        }),
    }),
  );

export const StellarServiceLive = Layer.succeed(
  StellarServiceTag,
  StellarServiceTag.of({
    getProject: (code: string) =>
      pipe(
        getStellarConfig(),
        Effect.flatMap((config: Readonly<StellarConfig>) =>
          Effect.tryPromise({
            try: async () => {
              const account = await config.server.loadAccount(config.publicKey);
              return account.data_attr;
            },
            catch: (error) =>
              new StellarError({
                cause: error,
                operation: "load_account",
              }),
          })
        ),
        Effect.flatMap((dataEntries: Readonly<Record<string, string>>) => {
          // Find project entry by code (case insensitive)
          const normalizedCode = code.toUpperCase();
          const projectEntry = Object.entries(dataEntries)
            .filter(([key]: readonly [string, string]) => key.startsWith("ipfshash-"))
            .map(([key, value]: readonly [string, string]) => {
              const fullCode = key.replace("ipfshash-", "");
              const baseCode = fullCode.startsWith("P") ? fullCode.slice(1) : fullCode;
              return {
                code: baseCode,
                fullCode,
                cid: Buffer.from(value, "base64").toString(),
              };
            })
            .find((entry: Readonly<{ code: string; fullCode: string; cid: string }>) =>
              entry.code.toUpperCase() === normalizedCode
            );

          if (projectEntry === undefined) {
            return Effect.succeed(null);
          }

          return pipe(
            Effect.all([
              fetchProjectDataFromIPFS(projectEntry.cid),
              pipe(
                getStellarConfig(),
                Effect.flatMap((config: Readonly<StellarConfig>) =>
                  checkTokenExists(config.server, config.publicKey, projectEntry.fullCode)
                ),
              ),
              pipe(
                getStellarConfig(),
                Effect.flatMap((config: Readonly<StellarConfig>) =>
                  getClaimableBalances(config.server, config.publicKey)
                ),
              ),
              pipe(
                getStellarConfig(),
                Effect.flatMap((config: Readonly<StellarConfig>) =>
                  checkActiveSellOffer(config.server, config.publicKey, `C${projectEntry.code}`)
                ),
              ),
              pipe(
                getStellarConfig(),
                Effect.flatMap((config: Readonly<StellarConfig>) => getTokenHolders(config, projectEntry.code)),
              ),
              getStellarConfig(),
            ]),
            Effect.map(
              (
                [projectData, tokenExists, claimableBalances, hasActiveSellOffer, tokenHolders, config]: readonly [
                  ProjectData,
                  boolean,
                  readonly Horizon.ServerApi.ClaimableBalanceRecord[],
                  boolean,
                  readonly { readonly accountId: string; readonly balance: string }[],
                  StellarConfig,
                ],
              ) => {
                if (!tokenExists) {
                  return null;
                }

                // Get funding metrics (IPFS priority for closed projects)
                const metrics = getCurrentFundingMetrics(
                  projectData,
                  claimableBalances,
                  projectEntry.code,
                  config.publicKey,
                );

                // Get top supporters (IPFS priority for closed projects)
                const topSupporters = getTopSupporters(
                  projectData,
                  claimableBalances,
                  tokenHolders,
                  projectEntry.code,
                  config.publicKey,
                  10,
                );

                const isExpired = isProjectExpired(projectData.deadline);
                const isFullyFunded = parseFloat(metrics.amount) >= parseFloat(projectData.target_amount);

                // Determine status based on funding_status from IPFS data
                let status: "active" | "completed" | "canceled" | "expired";
                if ("funding_status" in projectData && projectData.funding_status !== undefined) {
                  // Use funding_status from IPFS if available
                  status = projectData.funding_status as "completed" | "canceled";
                } else if (isExpired || isFullyFunded || !hasActiveSellOffer) {
                  // Legacy: project is completed if expired, fully funded, or offer closed
                  status = "completed";
                } else {
                  status = "active";
                }

                const projectInfo: ProjectInfo = {
                  name: projectData.name,
                  code: projectData.code,
                  description: projectData.description,
                  fulldescription: projectData.fulldescription,
                  contact_account_id: projectData.contact_account_id,
                  project_account_id: projectData.project_account_id,
                  target_amount: projectData.target_amount,
                  deadline: projectData.deadline,
                  current_amount: metrics.amount,
                  supporters_count: metrics.supporters,
                  ipfsUrl: `https://ipfs.io/ipfs/${projectEntry.cid}`,
                  status,
                  funded_amount: "funded_amount" in projectData ? (projectData.funded_amount as string) : undefined,
                  remaining_amount: "remaining_amount" in projectData
                    ? (projectData.remaining_amount as string)
                    : undefined,
                  funding_status: "funding_status" in projectData
                    ? (projectData.funding_status as "completed" | "canceled")
                    : undefined,
                  supporters: topSupporters.length > 0 ? topSupporters : undefined,
                };

                return projectInfo;
              },
            ),
            Effect.catchAll(() => Effect.succeed(null)),
          );
        }),
      ),

    getProjects: () =>
      pipe(
        getStellarConfig(),
        Effect.flatMap((config: Readonly<StellarConfig>) =>
          Effect.tryPromise({
            try: async () => {
              const account = await config.server.loadAccount(config.publicKey);
              return account.data_attr;
            },
            catch: (error) =>
              new StellarError({
                cause: error,
                operation: "load_account",
              }),
          })
        ),
        Effect.flatMap((dataEntries: Readonly<Record<string, string>>) => {
          const projectEntries = Object.entries(dataEntries)
            .filter(([key]: readonly [string, string]) => key.startsWith("ipfshash-"))
            .map(([key, value]: readonly [string, string]) => {
              const fullCode = key.replace("ipfshash-", "");
              // Remove P prefix to get base project code (e.g., PRHODESIA -> RHODESIA)
              const baseCode = fullCode.startsWith("P") ? fullCode.slice(1) : fullCode;
              return {
                code: baseCode,
                fullCode, // Keep original P-token name for checkTokenExists
                cid: Buffer.from(value, "base64").toString(),
              };
            });

          return Effect.all(
            projectEntries.map((entry: Readonly<{ code: string; fullCode: string; cid: string }>) =>
              pipe(
                Effect.all([
                  fetchProjectDataFromIPFS(entry.cid),
                  pipe(
                    getStellarConfig(),
                    Effect.flatMap((config: Readonly<StellarConfig>) =>
                      checkTokenExists(config.server, config.publicKey, entry.fullCode)
                    ),
                  ),
                  pipe(
                    getStellarConfig(),
                    Effect.flatMap((config: Readonly<StellarConfig>) =>
                      getClaimableBalances(config.server, config.publicKey)
                    ),
                  ),
                  pipe(
                    getStellarConfig(),
                    Effect.flatMap((config: Readonly<StellarConfig>) =>
                      checkActiveSellOffer(config.server, config.publicKey, `C${entry.code}`)
                    ),
                  ),
                  getStellarConfig(),
                ]),
                Effect.map(
                  (
                    [projectData, tokenExists, claimableBalances, hasActiveSellOffer, config]: readonly [
                      ProjectData,
                      boolean,
                      readonly Horizon.ServerApi.ClaimableBalanceRecord[],
                      boolean,
                      StellarConfig,
                    ],
                  ) => {
                    if (!tokenExists) {
                      return null; // Skip projects without P-tokens (project doesn't exist)
                    }

                    // Get funding metrics (IPFS priority for closed projects)
                    const metrics = getCurrentFundingMetrics(
                      projectData,
                      claimableBalances,
                      entry.code,
                      config.publicKey,
                    );

                    const isExpired = isProjectExpired(projectData.deadline);
                    const isFullyFunded = parseFloat(metrics.amount) >= parseFloat(projectData.target_amount);

                    // Determine status based on funding_status from IPFS data
                    let status: "active" | "completed" | "canceled" | "expired";
                    if ("funding_status" in projectData && projectData.funding_status !== undefined) {
                      // Use funding_status from IPFS if available
                      status = projectData.funding_status as "completed" | "canceled";
                    } else if (isExpired || isFullyFunded || !hasActiveSellOffer) {
                      // Legacy: project is completed if expired, fully funded, or offer closed
                      status = "completed";
                    } else {
                      status = "active";
                    }

                    const projectInfo: ProjectInfo = {
                      name: projectData.name,
                      code: projectData.code,
                      description: projectData.description,
                      fulldescription: projectData.fulldescription,
                      contact_account_id: projectData.contact_account_id,
                      project_account_id: projectData.project_account_id,
                      target_amount: projectData.target_amount,
                      deadline: projectData.deadline,
                      current_amount: metrics.amount,
                      supporters_count: metrics.supporters,
                      ipfsUrl: `https://ipfs.io/ipfs/${entry.cid}`,
                      status,
                      funded_amount: "funded_amount" in projectData ? (projectData.funded_amount as string) : undefined,
                      remaining_amount: "remaining_amount" in projectData
                        ? (projectData.remaining_amount as string)
                        : undefined,
                      funding_status: "funding_status" in projectData
                        ? (projectData.funding_status as "completed" | "canceled")
                        : undefined,
                      supporters: "supporters" in projectData
                        ? (projectData.supporters as readonly {
                          readonly account_id: string;
                          readonly amount: string;
                        }[])
                        : undefined,
                    };

                    return projectInfo;
                  },
                ),
                Effect.catchAll(() => Effect.succeed(null)), // Skip failed projects
              )
            ),
            { concurrency: "unbounded" },
          );
        }),
        Effect.map((projects: readonly (ProjectInfo | null)[]) => {
          const validProjects = projects.filter((p: Readonly<ProjectInfo | null>): p is ProjectInfo => p !== null);
          return sortProjectsByPriority(validProjects);
        }),
      ),
  }),
);
