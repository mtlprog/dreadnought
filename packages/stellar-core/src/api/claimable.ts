import type { Horizon } from "@stellar/stellar-sdk";
import { Effect } from "effect";
import { StellarError } from "../errors";

/**
 * Get claimable balances for a claimant account
 * Wraps server.claimableBalances() in Effect.tryPromise with proper error handling
 *
 * @param server - Horizon server instance
 * @param claimantAccountId - Account ID of the claimant
 * @returns Effect with array of claimable balance records or StellarError
 *
 * @example
 * ```typescript
 * pipe(
 *   getStellarConfig(),
 *   Effect.flatMap((config) =>
 *     getClaimableBalances(config.server, "GABC...")
 *   )
 * )
 * ```
 */
export const getClaimableBalances = (
  server: Horizon.Server,
  claimantAccountId: string,
): Effect.Effect<readonly Horizon.ServerApi.ClaimableBalanceRecord[], StellarError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await server
        .claimableBalances()
        .claimant(claimantAccountId)
        .limit(200)
        .call();
      return response.records;
    },
    catch: (error) =>
      new StellarError({
        operation: "getClaimableBalances",
        cause: error,
      }),
  });
