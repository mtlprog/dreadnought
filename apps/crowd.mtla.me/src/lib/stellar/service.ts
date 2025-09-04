import type { Horizon } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig, type StellarConfig } from "./config";
import { StellarError, type StellarServiceError } from "./errors";
import type { ProjectData, ProjectInfo } from "./types";
import { calculateRaisedAmount, countUniqueSupporters, fetchProjectDataFromIPFS, isProjectExpired } from "./utils";

export interface StellarService {
  readonly getProjects: () => Effect.Effect<ProjectInfo[], StellarServiceError>;
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

const getClaimableBalances = (
  server: Readonly<Horizon.Server>,
  publicKey: Readonly<string>,
): Effect.Effect<readonly Horizon.ServerApi.ClaimableBalanceRecord[], StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const claimableBalances = await server.claimableBalances()
          .claimant(publicKey)
          .call();
        return claimableBalances.records;
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
                  getStellarConfig(), // Add config to the Effect.all result
                ]),
                Effect.map(
                  (
                    [projectData, tokenExists, claimableBalances, config]: readonly [
                      ProjectData,
                      boolean,
                      readonly Horizon.ServerApi.ClaimableBalanceRecord[],
                      StellarConfig,
                    ],
                  ) => {
                    if (!tokenExists) {
                      return null; // Skip projects without P-tokens (project doesn't exist)
                    }

                    // Calculate crowdfunding metrics (will be 0 if no C-tokens exist)
                    const supportersCount = countUniqueSupporters(claimableBalances, entry.code, config.publicKey);
                    const currentAmount = calculateRaisedAmount(claimableBalances, entry.code, config.publicKey);
                    const isExpired = isProjectExpired(projectData.deadline);
                    const isFullyFunded = parseFloat(currentAmount) >= parseFloat(projectData.target_amount);

                    const projectInfo: ProjectInfo = {
                      name: projectData.name,
                      code: projectData.code,
                      description: projectData.description,
                      contact_account_id: projectData.contact_account_id,
                      project_account_id: projectData.project_account_id,
                      target_amount: projectData.target_amount,
                      deadline: projectData.deadline,
                      current_amount: currentAmount,
                      supporters_count: supportersCount,
                      ipfsUrl: `https://ipfs.io/ipfs/${entry.cid}`,
                      status: isExpired || isFullyFunded ? "completed" : "active",
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
        Effect.map((projects: readonly (ProjectInfo | null)[]) =>
          projects.filter((p: Readonly<ProjectInfo | null>): p is ProjectInfo => p !== null)
        ),
      ),
  }),
);
