import type { Horizon } from "@stellar/stellar-sdk";
import { Effect, pipe } from "effect";
import { StellarError } from "./errors";
import type { ProjectData, ProjectInfo } from "./types";

/**
 * Fetch project data from IPFS using CID
 */
export const fetchProjectDataFromIPFS = (cid: string): Effect.Effect<ProjectData, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
        const response = await fetch(ipfsUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json() as ProjectData;
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
