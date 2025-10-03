import type { Asset, Horizon } from "@stellar/stellar-sdk";
import { Effect } from "effect";
import { StellarError } from "../errors";

/**
 * Orderbook record from Horizon API
 */
export interface OrderbookRecord {
  readonly price: string;
  readonly amount: string;
}

/**
 * Orderbook response from Horizon API
 */
export interface OrderbookResponse {
  readonly bids: readonly OrderbookRecord[];
  readonly asks: readonly OrderbookRecord[];
}

/**
 * Fetch orderbook from Stellar Horizon API
 * Wraps server.orderbook() in Effect.tryPromise with proper error handling
 *
 * @param server - Horizon server instance
 * @param selling - Asset being sold
 * @param buying - Asset being bought
 * @returns Effect with OrderbookResponse or StellarError
 *
 * @example
 * ```typescript
 * pipe(
 *   getStellarConfig(),
 *   Effect.flatMap((config) =>
 *     fetchOrderbook(config.server, Asset.native(), new Asset("USDC", issuer))
 *   )
 * )
 * ```
 */
export const fetchOrderbook = (
  server: Readonly<Horizon.Server>,
  selling: Readonly<Asset>,
  buying: Readonly<Asset>,
): Effect.Effect<OrderbookResponse, StellarError> =>
  Effect.tryPromise({
    try: () => server.orderbook(selling, buying).call() as Promise<OrderbookResponse>,
    catch: (error) =>
      new StellarError({
        operation: "fetchOrderbook",
        cause: error,
      }),
  });
