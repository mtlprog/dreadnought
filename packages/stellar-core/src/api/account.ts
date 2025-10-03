import type { Horizon } from "@stellar/stellar-sdk";
import { Effect } from "effect";
import { StellarError } from "../errors";

/**
 * Stellar account balance record from Horizon API
 */
export interface BalanceRecord {
  readonly balance: string;
  readonly limit?: string;
  readonly buying_liabilities?: string;
  readonly selling_liabilities?: string;
  readonly asset_type: string;
  readonly asset_code?: string;
  readonly asset_issuer?: string;
}

/**
 * Stellar account response from Horizon API
 */
export interface AccountResponse {
  readonly id: string;
  readonly sequence: string;
  readonly balances: readonly BalanceRecord[];
  readonly data_attr: Record<string, string>;
}

/**
 * Load account from Stellar Horizon API
 * Wraps server.loadAccount() in Effect.tryPromise with proper error handling
 *
 * @param server - Horizon server instance
 * @param accountId - Stellar account ID (G...)
 * @returns Effect with AccountResponse or StellarError
 *
 * @example
 * ```typescript
 * pipe(
 *   getStellarConfig(),
 *   Effect.flatMap((config) => loadAccount(config.server, "GABC..."))
 * )
 * ```
 */
export const loadAccount = (
  server: Horizon.Server,
  accountId: string,
): Effect.Effect<AccountResponse, StellarError> =>
  Effect.tryPromise({
    try: () => server.loadAccount(accountId) as Promise<AccountResponse>,
    catch: (error) =>
      new StellarError({
        operation: "loadAccount",
        cause: error,
      }),
  });
