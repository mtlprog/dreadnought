import { Asset, Claimant, type Horizon, Operation, type xdr } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig, type StellarConfig } from "./config";
import { StellarError, type StellarServiceError } from "./errors";
import type { ProjectData } from "./types";
import { fetchProjectDataFromIPFS, isProjectExpired } from "./utils";

/**
 * Account holding (or once holding) a C-token, with authorization state.
 * `balance === "0"` with `isAuthorized === false` means the trustline is
 * effectively closed from the issuer's side — no further action needed.
 */
interface TrustlineAccount {
  readonly accountId: string;
  readonly balance: string;
  readonly isAuthorized: boolean;
}

export interface ProjectCheckResult {
  readonly code: string;
  readonly name: string;
  readonly deadline: string;
  readonly targetAmount: string;
  readonly currentAmount: string;
  readonly isExpired: boolean;
  readonly isGoalReached: boolean;
  readonly action: "refund" | "fund_project" | "no_action";
  readonly claimableBalancesCount: number;
  readonly tokenHoldersCount: number;
  readonly claimableBalances: readonly Horizon.ServerApi.ClaimableBalanceRecord[];
  /** Accounts with a non-zero C-token balance (real holders). */
  readonly tokenHolders: readonly TrustlineAccount[];
  /**
   * Operations to include in the closing transaction, in the correct order.
   * Empty for `no_action`. The CLI wraps these into a TransactionBuilder
   * together with the IPFS-update `manageData` operation.
   */
  readonly operations: readonly xdr.Operation[];
  /** Active sell offer for this C-token on the issuer account, if any. */
  readonly activeOffer?: Horizon.ServerApi.OfferRecord;
  readonly error?: string;
}

export interface StellarCheckService {
  readonly checkAllProjects: () => Effect.Effect<ProjectCheckResult[], StellarServiceError>;
}

export const StellarCheckServiceTag = Context.GenericTag<StellarCheckService>(
  "@crowd.mtla.me/StellarCheckService",
);

/**
 * Generic pagination helper for Horizon endpoints.
 * Stops once a page returns fewer records than the limit.
 */
const paginateAll = async <T extends { paging_token: string }>(
  buildCall: (cursor?: string) => { call: () => Promise<{ records: T[] }> },
  limit = 200,
): Promise<T[]> => {
  const all: T[] = [];
  let cursor: string | undefined;

  while (true) {
    const response = await buildCall(cursor).call();
    all.push(...response.records);

    if (response.records.length < limit) break;

    const last = response.records[response.records.length - 1];
    if (last === undefined) break;
    cursor = last.paging_token;
  }

  return all;
};

/**
 * Fetch ALL claimable balances where the issuer is a claimant, once.
 * Callers group by asset code locally instead of paginating per project.
 */
const getAllClaimableBalances = (
  server: Horizon.Server,
  accountId: string,
): Effect.Effect<readonly Horizon.ServerApi.ClaimableBalanceRecord[], StellarError> =>
  Effect.tryPromise({
    try: () =>
      paginateAll<Horizon.ServerApi.ClaimableBalanceRecord>((cursor) => {
        let cb = server.claimableBalances().claimant(accountId).limit(200);
        if (cursor !== undefined) cb = cb.cursor(cursor);
        return cb;
      }),
    catch: (error) => new StellarError({ cause: error, operation: "get_claimable_balances" }),
  });

/**
 * Fetch all accounts with a trustline to a given C-token, including `is_authorized`.
 * A single request replaces the previous two separate scans (token holders +
 * all trustlines).
 */
const getTrustlineAccounts = (
  config: StellarConfig,
  assetCode: string,
): Effect.Effect<readonly TrustlineAccount[], never> =>
  Effect.tryPromise({
    try: async () => {
      const crowdfundingTokenCode = `C${assetCode}`;
      const asset = new Asset(crowdfundingTokenCode, config.publicKey);

      const accounts = await paginateAll<Horizon.ServerApi.AccountRecord>((cursor) => {
        let cb = config.server.accounts().forAsset(asset).limit(200);
        if (cursor !== undefined) cb = cb.cursor(cursor);
        return cb;
      });

      const result: TrustlineAccount[] = [];
      for (const account of accounts) {
        if (account.id === config.publicKey) continue;

        for (const balance of account.balances) {
          if (
            balance.asset_type !== "native"
            && balance.asset_type !== "liquidity_pool_shares"
            && "asset_code" in balance
            && "asset_issuer" in balance
            && balance.asset_code === crowdfundingTokenCode
            && balance.asset_issuer === config.publicKey
          ) {
            result.push({
              accountId: account.id,
              balance: balance.balance,
              isAuthorized: balance.is_authorized === true,
            });
            break;
          }
        }
      }

      return result;
    },
    catch: (error) => new StellarError({ cause: error, operation: "get_trustline_accounts" }),
  }).pipe(
    Effect.catchAll(() => Effect.succeed([] as readonly TrustlineAccount[])),
  );

const getActiveOffers = (
  server: Horizon.Server,
  accountId: string,
): Effect.Effect<readonly Horizon.ServerApi.OfferRecord[], StellarError> =>
  Effect.tryPromise({
    try: () =>
      paginateAll<Horizon.ServerApi.OfferRecord>((cursor) => {
        let cb = server.offers().forAccount(accountId).limit(200);
        if (cursor !== undefined) cb = cb.cursor(cursor);
        return cb;
      }),
    catch: (error) => new StellarError({ cause: error, operation: "get_active_offers" }),
  });

/**
 * Does the project account already trust the MTLCrowd asset?
 * Determines whether funding uses a direct payment or a claimable balance.
 */
const checkProjectTrustline = (
  config: StellarConfig,
  projectAccountId: string,
): Effect.Effect<boolean, StellarError> =>
  Effect.tryPromise({
    try: async () => {
      const account = await config.server.loadAccount(projectAccountId);
      return account.balances.some((balance) =>
        balance.asset_type !== "native"
        && balance.asset_type !== "liquidity_pool_shares"
        && "asset_code" in balance
        && "asset_issuer" in balance
        && balance.asset_code === config.mtlCrowdAsset.code
        && balance.asset_issuer === config.mtlCrowdAsset.issuer
      );
    },
    catch: (error) => new StellarError({ cause: error, operation: "check_trustline" }),
  });

/**
 * Build the list of operations that revoke authorization on every C-token
 * trustline that is still authorized. Already-revoked trustlines are skipped:
 * calling `setTrustLineFlags(authorized=false)` on them is a no-op that just
 * wastes fee and bloats the transaction.
 *
 * NOTE: The issuer cannot delete a user's trustline — only the user can
 * (`changeTrust(limit=0)` at zero balance). Revoking authorization is the
 * strongest action available and, once done, never needs repeating.
 */
const buildRevokeOps = (
  asset: Asset,
  trustlineAccounts: readonly TrustlineAccount[],
): readonly xdr.Operation[] =>
  trustlineAccounts
    .filter((t) => t.isAuthorized)
    .map((t) =>
      Operation.setTrustLineFlags({
        trustor: t.accountId,
        asset,
        flags: { authorized: false },
      })
    );

/**
 * Build operations to cancel all sell offers for a given C-token on the
 * issuer account.
 */
const buildCancelOffersOps = (
  offers: readonly Horizon.ServerApi.OfferRecord[],
  crowdfundingAsset: Asset,
  mtlCrowdAsset: Asset,
): readonly xdr.Operation[] =>
  offers
    .filter((offer) =>
      offer.selling.asset_type !== "native"
      && offer.selling.asset_code === crowdfundingAsset.code
      && offer.selling.asset_issuer === crowdfundingAsset.issuer
    )
    .map((offer) =>
      Operation.manageSellOffer({
        selling: crowdfundingAsset,
        buying: mtlCrowdAsset,
        amount: "0",
        price: offer.price,
        offerId: offer.id,
      })
    );

const sumBalances = (
  claimableBalances: readonly Horizon.ServerApi.ClaimableBalanceRecord[],
  tokenHolders: readonly TrustlineAccount[],
): string => {
  let total = 0;
  for (const balance of claimableBalances) total += parseFloat(balance.amount);
  for (const holder of tokenHolders) total += parseFloat(holder.balance);
  return total.toString();
};

/**
 * Build the refund transaction operations: claim all C-token claimable
 * balances, clawback all C-token balances, revoke authorization on still-live
 * trustlines, refund each supporter in MTLCrowd, and cancel any active offers.
 */
const buildRefundOperations = (
  config: StellarConfig,
  assetCode: string,
  claimableBalances: readonly Horizon.ServerApi.ClaimableBalanceRecord[],
  tokenHolders: readonly TrustlineAccount[],
  trustlineAccounts: readonly TrustlineAccount[],
  activeOffers: readonly Horizon.ServerApi.OfferRecord[],
): readonly xdr.Operation[] => {
  const crowdfundingAsset = new Asset(`C${assetCode}`, config.publicKey);
  const ops: xdr.Operation[] = [];

  for (const balance of claimableBalances) {
    ops.push(Operation.claimClaimableBalance({ balanceId: balance.id }));
  }

  for (const holder of tokenHolders) {
    ops.push(Operation.clawback({
      asset: crowdfundingAsset,
      from: holder.accountId,
      amount: holder.balance,
    }));
  }

  ops.push(...buildRevokeOps(crowdfundingAsset, trustlineAccounts));

  // Aggregate refunds per supporter (sponsors + holders).
  const refunds = new Map<string, number>();
  for (const balance of claimableBalances) {
    if (balance.sponsor !== undefined && balance.sponsor !== null) {
      refunds.set(balance.sponsor, (refunds.get(balance.sponsor) ?? 0) + parseFloat(balance.amount));
    }
  }
  for (const holder of tokenHolders) {
    refunds.set(holder.accountId, (refunds.get(holder.accountId) ?? 0) + parseFloat(holder.balance));
  }

  for (const [supporter, amount] of refunds) {
    ops.push(Operation.payment({
      destination: supporter,
      asset: config.mtlCrowdAsset,
      amount: amount.toString(),
    }));
  }

  ops.push(...buildCancelOffersOps(activeOffers, crowdfundingAsset, config.mtlCrowdAsset));

  return ops;
};

/**
 * Build the funding transaction operations: claim/clawback all C-tokens,
 * revoke authorization on still-live trustlines, deliver the raised MTLCrowd
 * to the project account (direct payment or claimable balance), and cancel
 * any active offers.
 */
const buildFundingOperations = (
  config: StellarConfig,
  assetCode: string,
  projectAccountId: string,
  claimableBalances: readonly Horizon.ServerApi.ClaimableBalanceRecord[],
  tokenHolders: readonly TrustlineAccount[],
  trustlineAccounts: readonly TrustlineAccount[],
  hasTrustline: boolean,
  activeOffers: readonly Horizon.ServerApi.OfferRecord[],
): readonly xdr.Operation[] => {
  const crowdfundingAsset = new Asset(`C${assetCode}`, config.publicKey);
  const ops: xdr.Operation[] = [];

  for (const balance of claimableBalances) {
    ops.push(Operation.claimClaimableBalance({ balanceId: balance.id }));
  }

  for (const holder of tokenHolders) {
    ops.push(Operation.clawback({
      asset: crowdfundingAsset,
      from: holder.accountId,
      amount: holder.balance,
    }));
  }

  ops.push(...buildRevokeOps(crowdfundingAsset, trustlineAccounts));

  const totalCollected = sumBalances(claimableBalances, tokenHolders);

  if (hasTrustline) {
    ops.push(Operation.payment({
      destination: projectAccountId,
      asset: config.mtlCrowdAsset,
      amount: totalCollected,
    }));
  } else {
    ops.push(Operation.createClaimableBalance({
      asset: config.mtlCrowdAsset,
      amount: totalCollected,
      claimants: [new Claimant(projectAccountId)],
    }));
  }

  ops.push(...buildCancelOffersOps(activeOffers, crowdfundingAsset, config.mtlCrowdAsset));

  return ops;
};

/** Filter all claimable balances to just those for a specific C-token. */
const filterByAssetCode = (
  allBalances: readonly Horizon.ServerApi.ClaimableBalanceRecord[],
  assetCode: string,
): readonly Horizon.ServerApi.ClaimableBalanceRecord[] => {
  const crowdfundingTokenCode = `C${assetCode}`;
  return allBalances.filter((balance) => {
    const asset = balance.asset;
    return asset !== "native" && asset.split(":")[0] === crowdfundingTokenCode;
  });
};

const findOfferForCode = (
  offers: readonly Horizon.ServerApi.OfferRecord[],
  assetCode: string,
  issuer: string,
): Horizon.ServerApi.OfferRecord | undefined => {
  const crowdfundingTokenCode = `C${assetCode}`;
  return offers.find((offer) =>
    offer.selling.asset_type !== "native"
    && offer.selling.asset_code === crowdfundingTokenCode
    && offer.selling.asset_issuer === issuer
  );
};

const noActionResult = (
  project: Pick<ProjectData, "code" | "name" | "deadline" | "target_amount">,
  currentAmount: string,
  isExpired: boolean,
  isGoalReached: boolean,
  claimableBalances: readonly Horizon.ServerApi.ClaimableBalanceRecord[],
  tokenHolders: readonly TrustlineAccount[],
  activeOffer?: Horizon.ServerApi.OfferRecord,
): ProjectCheckResult => ({
  code: project.code,
  name: project.name,
  deadline: project.deadline,
  targetAmount: project.target_amount,
  currentAmount,
  isExpired,
  isGoalReached,
  action: "no_action",
  claimableBalancesCount: claimableBalances.length,
  tokenHoldersCount: tokenHolders.length,
  claimableBalances,
  tokenHolders,
  operations: [],
  ...(activeOffer !== undefined ? { activeOffer } : {}),
});

const checkSingleProject = (
  config: StellarConfig,
  project: {
    code: string;
    name: string;
    deadline: string;
    target_amount: string;
    project_account_id: string;
    funding_status?: "completed" | "canceled";
  },
  allClaimableBalances: readonly Horizon.ServerApi.ClaimableBalanceRecord[],
  activeOffers: readonly Horizon.ServerApi.OfferRecord[],
): Effect.Effect<ProjectCheckResult, never> =>
  Effect.gen(function*() {
    const isExpired = isProjectExpired(project.deadline);

    yield* Effect.logInfo(`🔍 ${project.code} (${project.name}) — deadline ${project.deadline}, expired=${isExpired}`);

    // Filter claimable balances for this project from the pre-fetched global list.
    const claimableBalances = filterByAssetCode(allClaimableBalances, project.code);

    // Single scan of trustline accounts → gives us holders AND auth state.
    const trustlineAccounts = yield* getTrustlineAccounts(config, project.code);
    const tokenHolders = trustlineAccounts.filter((t) => parseFloat(t.balance) > 0);

    const currentAmount = sumBalances(claimableBalances, tokenHolders);
    const currentAmountNum = parseFloat(currentAmount);
    const targetAmountNum = parseFloat(project.target_amount);
    const isGoalReached = currentAmountNum >= targetAmountNum;

    const activeOffer = findOfferForCode(activeOffers, project.code, config.publicKey);
    const projectOfferList = activeOffer !== undefined ? [activeOffer] : [];

    yield* Effect.logInfo(
      `  raised=${currentAmount}/${project.target_amount}, goalReached=${isGoalReached}, `
        + `balances=${claimableBalances.length}, holders=${tokenHolders.length}, `
        + `trustlines=${trustlineAccounts.length}, offer=${activeOffer !== undefined ? "yes" : "no"}`,
    );

    // Active, goal not reached: nothing to do.
    if (!isGoalReached && !isExpired) {
      yield* Effect.logInfo(`  ⏳ active, no action`);
      return noActionResult(
        project,
        currentAmount,
        false,
        isGoalReached,
        claimableBalances,
        tokenHolders,
        activeOffer,
      );
    }

    const hasBalancesOrHolders = claimableBalances.length > 0 || tokenHolders.length > 0;

    // Nothing on chain to touch: no balances, no holders, no offer.
    if (!hasBalancesOrHolders && activeOffer === undefined) {
      yield* Effect.logInfo(`  ✅ nothing to process`);
      return noActionResult(
        project,
        currentAmount,
        isExpired,
        isGoalReached,
        claimableBalances,
        tokenHolders,
      );
    }

    // Only an orphaned offer to cancel (balances already cleaned up).
    if (!hasBalancesOrHolders && activeOffer !== undefined) {
      yield* Effect.logInfo(`  🔄 cancelling stale offer`);
      const crowdfundingAsset = new Asset(`C${project.code}`, config.publicKey);
      return {
        code: project.code,
        name: project.name,
        deadline: project.deadline,
        targetAmount: project.target_amount,
        currentAmount,
        isExpired,
        isGoalReached,
        action: "refund" as const,
        claimableBalancesCount: 0,
        tokenHoldersCount: 0,
        claimableBalances,
        tokenHolders,
        operations: buildCancelOffersOps(projectOfferList, crowdfundingAsset, config.mtlCrowdAsset),
        activeOffer,
      };
    }

    // Goal reached → fund. Expired but short → refund.
    if (isGoalReached) {
      yield* Effect.logInfo(`  💰 goal reached, building funding operations`);
      const hasTrustline = yield* checkProjectTrustline(config, project.project_account_id).pipe(
        Effect.catchAll(() => Effect.succeed(false)),
      );

      return {
        code: project.code,
        name: project.name,
        deadline: project.deadline,
        targetAmount: project.target_amount,
        currentAmount,
        isExpired,
        isGoalReached,
        action: "fund_project" as const,
        claimableBalancesCount: claimableBalances.length,
        tokenHoldersCount: tokenHolders.length,
        claimableBalances,
        tokenHolders,
        operations: buildFundingOperations(
          config,
          project.code,
          project.project_account_id,
          claimableBalances,
          tokenHolders,
          trustlineAccounts,
          hasTrustline,
          projectOfferList,
        ),
        ...(activeOffer !== undefined ? { activeOffer } : {}),
      };
    }

    yield* Effect.logInfo(`  ⏰ expired, building refund operations`);
    return {
      code: project.code,
      name: project.name,
      deadline: project.deadline,
      targetAmount: project.target_amount,
      currentAmount,
      isExpired,
      isGoalReached,
      action: "refund" as const,
      claimableBalancesCount: claimableBalances.length,
      tokenHoldersCount: tokenHolders.length,
      claimableBalances,
      tokenHolders,
      operations: buildRefundOperations(
        config,
        project.code,
        claimableBalances,
        tokenHolders,
        trustlineAccounts,
        projectOfferList,
      ),
      ...(activeOffer !== undefined ? { activeOffer } : {}),
    };
  });

/**
 * One-shot fetch of everything we need to decide actions for every project:
 * issuer account (flags + data attrs), active offers, and all claimable
 * balances. Per-project only loads the per-asset trustline list.
 */
const loadGlobalState = (
  config: StellarConfig,
): Effect.Effect<
  {
    readonly dataAttr: Record<string, string>;
    readonly activeOffers: readonly Horizon.ServerApi.OfferRecord[];
    readonly allClaimableBalances: readonly Horizon.ServerApi.ClaimableBalanceRecord[];
  },
  StellarError
> =>
  Effect.gen(function*() {
    yield* Effect.logInfo("🔐 Loading issuer account...");

    const issuerAccount = yield* Effect.tryPromise({
      try: () => config.server.loadAccount(config.publicKey),
      catch: (error) => new StellarError({ cause: error, operation: "load_issuer_account" }),
    });

    const flags = issuerAccount.flags;
    if (!flags.auth_revocable) {
      yield* Effect.logError("❌ AUTH_REVOCABLE_FLAG not set on issuer account");
      yield* Effect.fail(
        new StellarError({
          cause: new Error("AUTH_REVOCABLE_FLAG not set"),
          operation: "validate_account_flags",
        }),
      );
    }
    if (!flags.auth_clawback_enabled) {
      yield* Effect.logError("❌ AUTH_CLAWBACK_ENABLED_FLAG not set on issuer account");
      yield* Effect.fail(
        new StellarError({
          cause: new Error("AUTH_CLAWBACK_ENABLED_FLAG not set"),
          operation: "validate_account_flags",
        }),
      );
    }

    yield* Effect.logInfo("✅ Account flags OK (auth_revocable, auth_clawback_enabled)");

    const [activeOffers, allClaimableBalances] = yield* Effect.all(
      [
        getActiveOffers(config.server, config.publicKey),
        getAllClaimableBalances(config.server, config.publicKey),
      ],
      { concurrency: 2 },
    );

    yield* Effect.logInfo(
      `📋 Global state: ${activeOffers.length} active offers, `
        + `${allClaimableBalances.length} claimable balances`,
    );

    return {
      dataAttr: issuerAccount.data_attr,
      activeOffers,
      allClaimableBalances,
    };
  });

export const StellarCheckServiceLive = Layer.succeed(
  StellarCheckServiceTag,
  StellarCheckServiceTag.of({
    checkAllProjects: () =>
      pipe(
        getStellarConfig(),
        Effect.flatMap((config) =>
          pipe(
            loadGlobalState(config),
            Effect.flatMap(({ dataAttr, activeOffers, allClaimableBalances }) => {
              const projectEntries = Object.entries(dataAttr)
                .filter(([key]) => key.startsWith("ipfshash-"))
                .map(([key, value]) => ({
                  code: key.replace("ipfshash-", ""),
                  cid: Buffer.from(value, "base64").toString(),
                }));

              return Effect.all(
                projectEntries.map((entry) =>
                  pipe(
                    fetchProjectDataFromIPFS(entry.cid),
                    Effect.flatMap((projectData: ProjectData) =>
                      checkSingleProject(config, projectData, allClaimableBalances, activeOffers)
                    ),
                    Effect.catchAll((error) =>
                      Effect.succeed(
                        {
                          code: entry.code,
                          name: "Unknown Project",
                          deadline: "1970-01-01",
                          targetAmount: "0",
                          currentAmount: "0",
                          isExpired: true,
                          isGoalReached: false,
                          action: "no_action" as const,
                          claimableBalancesCount: 0,
                          tokenHoldersCount: 0,
                          claimableBalances: [],
                          tokenHolders: [],
                          operations: [],
                          error: `Failed to fetch project data: ${error}`,
                        } satisfies ProjectCheckResult,
                      )
                    ),
                  )
                ),
                { concurrency: 5 },
              );
            }),
          )
        ),
      ),
  }),
);
