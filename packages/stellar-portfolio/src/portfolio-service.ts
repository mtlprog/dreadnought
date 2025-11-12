import {
  type AccountResponse,
  type EnvironmentError,
  getStellarConfig,
  loadAccount,
  type StellarError,
} from "@dreadnought/stellar-core";
import type { AssetInfo } from "@dreadnought/stellar-utils";
import { Context, Effect, Layer, pipe } from "effect";

/**
 * Token balance with asset information
 */
export interface TokenBalance {
  readonly asset: AssetInfo;
  readonly balance: string;
  readonly limit?: string | undefined;
}

/**
 * Account portfolio with tokens and XLM balance
 */
export interface AccountPortfolio {
  readonly accountId: string;
  readonly tokens: readonly TokenBalance[];
  readonly xlmBalance: string;
}

/**
 * Portfolio service for fetching account balances
 */
export interface PortfolioService {
  readonly getAccountPortfolio: (
    accountId: string,
  ) => Effect.Effect<AccountPortfolio, StellarError | EnvironmentError, never>;
}

export const PortfolioServiceTag = Context.GenericTag<PortfolioService>("@dreadnought/PortfolioService");

/**
 * Parse Stellar account balances into tokens and XLM balance
 * Filters out liquidity pool shares and malformed tokens
 *
 * @param accountRecord - Stellar account response from Horizon API
 * @returns Effect with parsed tokens and XLM balance
 */

const parseBalances = (
  accountRecord: AccountResponse,
): Effect.Effect<{ tokens: readonly TokenBalance[]; xlmBalance: string }, never, never> =>
  Effect.sync(() => {
    const tokens: TokenBalance[] = [];
    let xlmBalance = "0";

    for (const balance of accountRecord.balances) {
      if (balance.asset_type === "native") {
        xlmBalance = balance.balance;
      } else if (
        balance.asset_type !== "liquidity_pool_shares" && "asset_code" in balance && "asset_issuer" in balance
        && balance.asset_code !== undefined && balance.asset_code !== ""
        && balance.asset_issuer !== undefined && balance.asset_issuer !== ""
      ) {
        // Only include tokens that have both code and issuer
        const assetInfo: AssetInfo = {
          code: balance.asset_code,
          issuer: balance.asset_issuer,
          type: balance.asset_type === "credit_alphanum4" ? "credit_alphanum4" : "credit_alphanum12",
        };

        tokens.push({
          asset: assetInfo,
          balance: balance.balance,
          limit: "limit" in balance ? balance.limit : undefined,
        });
      }
      // Skip tokens without proper code/issuer (malformed tokens) and liquidity pool shares
    }

    return { tokens, xlmBalance };
  });

/**
 * Get account portfolio implementation
 * Loads account from Horizon API and parses balances
 *
 * @param accountId - Stellar account ID
 * @returns Effect with account portfolio or error
 */
const getAccountPortfolioImpl = (
  accountId: string,
): Effect.Effect<AccountPortfolio, StellarError | EnvironmentError, never> =>
  pipe(
    getStellarConfig(),
    Effect.flatMap((config): Effect.Effect<AccountPortfolio, StellarError | EnvironmentError> =>
      pipe(
        loadAccount(config.server, accountId),
        Effect.flatMap(parseBalances),
        Effect.map(({ tokens, xlmBalance }): AccountPortfolio => ({
          accountId,
          tokens,
          xlmBalance,
        })),
      )
    ),
  );

/**
 * Live implementation of PortfolioService
 * Use this layer to provide PortfolioService in your application
 *
 * @example
 * ```typescript
 * const program = pipe(
 *   PortfolioServiceTag,
 *   Effect.flatMap((service) => service.getAccountPortfolio("GABC..."))
 * );
 *
 * const result = await Effect.runPromise(
 *   Effect.provide(program, PortfolioServiceLive)
 * );
 * ```
 */
export const PortfolioServiceLive = Layer.succeed(PortfolioServiceTag, {
  getAccountPortfolio: getAccountPortfolioImpl,
});
