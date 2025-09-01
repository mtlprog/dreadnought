import type { Horizon } from "@stellar/stellar-sdk";
import { Effect, pipe } from "effect";
import { StellarError } from "./errors";
import type { ProjectData } from "./types";

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
 */
export const isProjectExpired = (deadline: string): boolean => {
  const deadlineDate = new Date(deadline);
  return deadlineDate <= new Date();
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
    const assetCode = asset !== "native" ? asset.split(":")[0] : "native";

    // Check if this is a claimable balance for our crowdfunding token (C-prefix)
    if (asset !== "native" && assetCode === crowdfundingTokenCode) {
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

    // Check if this is a claimable balance for our crowdfunding token (C-prefix)
    if (asset !== "native" && asset.split(":")[0] === crowdfundingTokenCode) {
      // Check if STELLAR_ACCOUNT_ID is among the claimants
      const isClaimableByAccount = balance.claimants?.some(claimant => claimant.destination === stellarAccountId);

      if (isClaimableByAccount) {
        totalAmount += parseFloat(balance.amount);
      }
    }
  }

  return totalAmount.toString();
};
