import type { Horizon } from "@stellar/stellar-sdk";
import { Effect, pipe } from "effect";
import type { StellarConfig } from "./config";
import { StellarError } from "./errors";
import type { ProjectData, ProjectDataWithResults, ProjectInfo, SupporterContributionExact } from "./types";

/**
 * In-memory cache for account names
 * TTL: 24 hours (86400000 ms)
 */
interface CachedName {
  readonly name: string | undefined;
  readonly timestamp: number;
}

const accountNamesCache = new Map<string, CachedName>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get account name from manageData entry "Name" with 24h caching
 * Returns decoded name or undefined if not found
 *
 * Cache rationale:
 * - Account names change very rarely
 * - Reduces Horizon API calls significantly
 * - 24h TTL ensures eventual consistency
 */
export const getAccountName = (
  config: Readonly<StellarConfig>,
  accountId: Readonly<string>,
): Effect.Effect<string | undefined, StellarError> => {
  // Check cache first
  const cached = accountNamesCache.get(accountId);
  const now = Date.now();

  if (cached !== undefined && (now - cached.timestamp) < CACHE_TTL_MS) {
    return pipe(
      Effect.succeed(cached.name),
      Effect.tap(() => Effect.log(`[Cache HIT] Account name for ${accountId.slice(0, 8)}...`)),
    );
  }

  // Cache miss or expired - fetch from Horizon
  return pipe(
    Effect.tryPromise({
      try: async () => {
        try {
          const account = await config.server.loadAccount(accountId);
          const nameEntry = account.data_attr["Name"];

          if (nameEntry === undefined) {
            return undefined;
          }

          // Decode base64 name
          const decoded = Buffer.from(nameEntry, "base64").toString("utf-8");
          return decoded;
        } catch {
          // Account not found or no Name entry
          return undefined;
        }
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "get_account_name",
        }),
    }),
    Effect.tap((name) => {
      // Store in cache
      accountNamesCache.set(accountId, { name, timestamp: now });
      return Effect.log(
        `[Cache MISS] Fetched account name for ${accountId.slice(0, 8)}...: ${name ?? "undefined"}`,
      );
    }),
  );
};

/**
 * Enrich supporters array with account names from Stellar manageData
 * Fetches names in parallel with caching (24h TTL in getAccountName)
 * Skips supporters that already have names for efficiency
 *
 * @param config - Stellar configuration
 * @param supporters - Supporters array (may or may not have names)
 * @returns Effect with enriched supporters
 */
export const enrichSupportersWithNames = <
  T extends { readonly account_id: string; readonly amount: string; readonly name?: string | undefined },
>(
  config: Readonly<StellarConfig>,
  supporters: readonly T[],
): Effect.Effect<readonly T[], StellarError> =>
  pipe(
    Effect.all(
      supporters.map((supporter) => {
        // Skip if already has name
        if (supporter.name !== undefined) {
          return Effect.succeed(supporter);
        }
        // Fetch name from Horizon
        return pipe(
          getAccountName(config, supporter.account_id),
          Effect.map((name): T =>
            ({
              ...supporter,
              ...(name !== undefined ? { name } : {}),
            }) as T
          ),
          Effect.catchAll(() => Effect.succeed(supporter)),
        );
      }),
      { concurrency: "unbounded" },
    ),
    Effect.tap((enriched) => {
      const withNames = enriched.filter((s) => s.name !== undefined).length;
      return Effect.logInfo(
        `Enriched ${withNames}/${supporters.length} supporters with names`,
      );
    }),
  );

/**
 * Fetch project data from IPFS using CID
 * Returns ProjectDataWithResults which includes optional funding results
 */
export const fetchProjectDataFromIPFS = (cid: string): Effect.Effect<ProjectDataWithResults, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
        const response = await fetch(ipfsUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json() as ProjectDataWithResults;
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "fetch_ipfs_data",
        }),
    }),
  );

/**
 * Check if a project deadline has expired
 * A project is expired when the deadline date is in the past (before today)
 * If today is the deadline, the project is still active
 */
export const isProjectExpired = (deadline: string): boolean => {
  // Extract date part only (YYYY-MM-DD) for comparison
  const deadlineDay = deadline.split("T")[0] ?? deadline;
  const todayDay = new Date().toISOString().split("T")[0] ?? "";

  return deadlineDay < todayDay;
};

/**
 * Count unique supporters from claimable balances
 * Supporters are unique sponsor addresses that created claimable balances for the crowdfunding token
 * Only count balances where STELLAR_ACCOUNT_ID is a claimant
 */
export const countUniqueSupporters = (
  claimableBalances: Readonly<readonly Horizon.ServerApi.ClaimableBalanceRecord[]>,
  assetCode: Readonly<string>,
  stellarAccountId: Readonly<string>,
): number => {
  const uniqueSponsors = new Set<string>();
  const crowdfundingTokenCode = `C${assetCode}`;

  for (const balance of claimableBalances) {
    const asset = balance.asset;
    const assetCodeFromBalance = asset !== "native" ? asset.split(":")[0] : "native";

    // Check if this is a claimable balance for our crowdfunding token (C-prefix)
    if (asset !== "native" && assetCodeFromBalance === crowdfundingTokenCode) {
      // Check if STELLAR_ACCOUNT_ID is among the claimants
      const isClaimableByAccount = balance.claimants?.some(claimant => claimant.destination === stellarAccountId);

      if (isClaimableByAccount && balance.sponsor !== undefined) {
        uniqueSponsors.add(balance.sponsor);
      }
    }
  }

  return uniqueSponsors.size;
};

/**
 * Collect all supporters with their contributions from claimable balances only
 * Returns array of {account_id, amount} for all unique supporters
 *
 * Note: Only includes sponsors who created claimable balances (real supporters),
 * not token holders who may have bought tokens on DEX.
 */
export const collectSupportersData = (
  claimableBalances: Readonly<readonly Horizon.ServerApi.ClaimableBalanceRecord[]>,
  assetCode: Readonly<string>,
  stellarAccountId: Readonly<string>,
): readonly { readonly account_id: string; readonly amount: string }[] => {
  const supportersMap = new Map<string, number>();
  const crowdfundingTokenCode = `C${assetCode}`;

  // Collect from claimable balances only (real supporters)
  for (const balance of claimableBalances) {
    const asset = balance.asset;
    const assetCodeFromBalance = asset !== "native" ? asset.split(":")[0] : "native";

    if (asset !== "native" && assetCodeFromBalance === crowdfundingTokenCode) {
      const isClaimableByAccount = balance.claimants?.some(claimant => claimant.destination === stellarAccountId);

      if (isClaimableByAccount && balance.sponsor !== undefined) {
        const currentAmount = supportersMap.get(balance.sponsor) ?? 0;
        supportersMap.set(balance.sponsor, currentAmount + parseFloat(balance.amount));
      }
    }
  }

  // Convert to array and sort by amount (descending)
  return Array.from(supportersMap.entries())
    .map(([account_id, amount]) => ({
      account_id,
      amount: amount.toString(),
    }))
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
};

/**
 * Calculate total amount raised from claimable balances
 * Sum all token amounts in claimable balances for the crowdfunding token
 * Only count balances where STELLAR_ACCOUNT_ID is a claimant
 */
export const calculateRaisedAmount = (
  claimableBalances: Readonly<readonly Horizon.ServerApi.ClaimableBalanceRecord[]>,
  assetCode: Readonly<string>,
  stellarAccountId: Readonly<string>,
): string => {
  let totalAmount = 0;
  const crowdfundingTokenCode = `C${assetCode}`;

  for (const balance of claimableBalances) {
    const asset = balance.asset;
    const assetCodeFromBalance = asset !== "native" ? asset.split(":")[0] : "native";

    // Check if this is a claimable balance for our crowdfunding token (C-prefix)
    if (asset !== "native" && assetCodeFromBalance === crowdfundingTokenCode) {
      // Check if STELLAR_ACCOUNT_ID is among the claimants
      const isClaimableByAccount = balance.claimants?.some(claimant => claimant.destination === stellarAccountId);

      if (isClaimableByAccount) {
        totalAmount += parseFloat(balance.amount);
      }
    }
  }

  return totalAmount.toString();
};

/**
 * Get current funding metrics for a project
 *
 * Priority logic:
 * 1. If project has funding_status in IPFS → use IPFS data (source of truth for closed projects)
 * 2. Otherwise → calculate from blockchain (for active projects)
 *
 * This ensures:
 * - Closed projects show finalized data from IPFS (even if blockchain is cleared)
 * - Active projects show real-time data from blockchain
 *
 * @param projectData - Project data from IPFS
 * @param claimableBalances - Claimable balances from blockchain
 * @param assetCode - Project asset code (without P/C prefix)
 * @param stellarAccountId - Issuer account ID
 * @returns Current funding amount and supporters count
 */
export const getCurrentFundingMetrics = (
  projectData: Readonly<ProjectData | ProjectDataWithResults>,
  claimableBalances: Readonly<readonly Horizon.ServerApi.ClaimableBalanceRecord[]>,
  assetCode: Readonly<string>,
  stellarAccountId: Readonly<string>,
): { readonly amount: string; readonly supporters: number } => {
  // Check if project has finalized funding data in IPFS
  const hasIPFSFundingData = "funding_status" in projectData
    && projectData.funding_status !== undefined
    && "funded_amount" in projectData
    && projectData.funded_amount !== undefined
    && "supporters_count" in projectData
    && projectData.supporters_count !== undefined;

  if (hasIPFSFundingData) {
    // Closed project - use IPFS as source of truth
    return {
      amount: projectData.funded_amount,
      supporters: projectData.supporters_count,
    };
  }

  // Active project - calculate from blockchain (only claimable balances = real supporters)
  return {
    amount: calculateRaisedAmount(claimableBalances, assetCode, stellarAccountId),
    supporters: countUniqueSupporters(claimableBalances, assetCode, stellarAccountId),
  };
};

/**
 * Get top supporters for a project with account names
 *
 * Priority logic:
 * 1. If project has supporters in IPFS → use IPFS data (source of truth for closed projects)
 * 2. Otherwise → calculate from blockchain (for active projects)
 *
 * Fetches account names from manageData "Name" entry for each supporter
 *
 * @param config - Stellar configuration
 * @param projectData - Project data from IPFS
 * @param claimableBalances - Claimable balances from blockchain
 * @param assetCode - Project asset code (without P/C prefix)
 * @param stellarAccountId - Issuer account ID
 * @param limit - Maximum number of supporters to return (default: 10)
 * @returns Effect with array of top supporters sorted by contribution amount (descending)
 */
export const getTopSupporters = (
  config: Readonly<StellarConfig>,
  projectData: Readonly<ProjectData | ProjectDataWithResults>,
  claimableBalances: Readonly<readonly Horizon.ServerApi.ClaimableBalanceRecord[]>,
  assetCode: Readonly<string>,
  stellarAccountId: Readonly<string>,
  limit = 10,
): Effect.Effect<readonly SupporterContributionExact[], StellarError> => {
  // Check if project has finalized supporters data in IPFS
  const hasIPFSSupportersData = "supporters" in projectData
    && projectData.supporters !== undefined
    && Array.isArray(projectData.supporters)
    && projectData.supporters.length > 0;

  // Get top supporters from IPFS (closed projects) or blockchain (active projects)
  const topSupporters = hasIPFSSupportersData
    ? projectData.supporters.slice(0, limit)
    : collectSupportersData(claimableBalances, assetCode, stellarAccountId).slice(0, limit);

  // Enrich with names (skips supporters that already have names)
  return enrichSupportersWithNames(config, topSupporters);
};

/**
 * Sort projects by deadline (ascending) and raised amount (descending)
 * Projects with sooner deadlines and higher raised amounts appear first
 */
export const sortProjectsByPriority = (projects: readonly ProjectInfo[]): ProjectInfo[] => {
  return [...projects].sort((a, b) => {
    const aDeadline = new Date(a.deadline);
    const bDeadline = new Date(b.deadline);
    const aAmount = parseFloat(a.current_amount);
    const bAmount = parseFloat(b.current_amount);

    // First sort by deadline (ascending - sooner deadlines first)
    const deadlineComparison = aDeadline.getTime() - bDeadline.getTime();

    if (deadlineComparison !== 0) {
      return deadlineComparison;
    }

    // If deadlines are equal, sort by raised amount (descending - higher amounts first)
    return bAmount - aAmount;
  });
};
