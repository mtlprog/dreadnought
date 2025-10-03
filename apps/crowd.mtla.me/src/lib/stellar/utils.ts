import type { Horizon } from "@stellar/stellar-sdk";
import { Effect, pipe } from "effect";
import { StellarError } from "./errors";
import type { ProjectData, ProjectDataWithResults, ProjectInfo } from "./types";

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
 * Count total unique supporters from both claimable balances and token holders
 * Combines supporters from claimable balances (sponsors) and token holders (account IDs)
 */
export const countTotalSupporters = (
  claimableBalances: Readonly<readonly Horizon.ServerApi.ClaimableBalanceRecord[]>,
  tokenHolders: Readonly<readonly { readonly accountId: string; readonly balance: string }[]>,
  assetCode: Readonly<string>,
  stellarAccountId: Readonly<string>,
): number => {
  const uniqueSupporters = new Set<string>();
  const crowdfundingTokenCode = `C${assetCode}`;

  // Add supporters from claimable balances
  for (const balance of claimableBalances) {
    const asset = balance.asset;
    const assetCodeFromBalance = asset !== "native" ? asset.split(":")[0] : "native";

    if (asset !== "native" && assetCodeFromBalance === crowdfundingTokenCode) {
      const isClaimableByAccount = balance.claimants?.some(claimant => claimant.destination === stellarAccountId);

      if (isClaimableByAccount && balance.sponsor !== undefined) {
        uniqueSupporters.add(balance.sponsor);
      }
    }
  }

  // Add token holders (excluding issuer)
  for (const holder of tokenHolders) {
    if (holder.accountId !== stellarAccountId && parseFloat(holder.balance) > 0) {
      uniqueSupporters.add(holder.accountId);
    }
  }

  return uniqueSupporters.size;
};

/**
 * Collect all supporters with their contributions
 * Returns array of {account_id, amount} for all unique supporters
 */
export const collectSupportersData = (
  claimableBalances: Readonly<readonly Horizon.ServerApi.ClaimableBalanceRecord[]>,
  tokenHolders: Readonly<readonly { readonly accountId: string; readonly balance: string }[]>,
  assetCode: Readonly<string>,
  stellarAccountId: Readonly<string>,
): readonly { readonly account_id: string; readonly amount: string }[] => {
  const supportersMap = new Map<string, number>();
  const crowdfundingTokenCode = `C${assetCode}`;

  // Collect from claimable balances
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

  // Collect from token holders (excluding issuer)
  for (const holder of tokenHolders) {
    if (holder.accountId !== stellarAccountId && parseFloat(holder.balance) > 0) {
      const currentAmount = supportersMap.get(holder.accountId) ?? 0;
      supportersMap.set(holder.accountId, currentAmount + parseFloat(holder.balance));
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

  // Active project - calculate from blockchain
  return {
    amount: calculateRaisedAmount(claimableBalances, assetCode, stellarAccountId),
    supporters: countUniqueSupporters(claimableBalances, assetCode, stellarAccountId),
  };
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
