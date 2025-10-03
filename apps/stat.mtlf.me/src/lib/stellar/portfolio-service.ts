import {
  type AccountResponse,
  type EnvironmentError,
  getStellarConfig,
  loadAccount,
  type StellarError,
} from "@dreadnought/stellar-core";
import { Context, Effect, Layer, pipe } from "effect";
import type { AssetInfo } from "./types";

export interface TokenBalance {
  readonly asset: AssetInfo;
  readonly balance: string;
  readonly limit?: string | undefined;
}

export interface AccountPortfolio {
  readonly accountId: string;
  readonly tokens: readonly TokenBalance[];
  readonly xlmBalance: string;
}

export interface PortfolioService {
  readonly getAccountPortfolio: (
    accountId: string,
  ) => Effect.Effect<AccountPortfolio, StellarError | EnvironmentError>;
}

export const PortfolioServiceTag = Context.GenericTag<PortfolioService>("@dreadnought/PortfolioService");

const parseBalances = (
  accountRecord: AccountResponse,
): Effect.Effect<{ tokens: readonly TokenBalance[]; xlmBalance: string }, never> =>
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

const getAccountPortfolioImpl = (
  accountId: string,
): Effect.Effect<AccountPortfolio, StellarError | EnvironmentError, never> =>
  pipe(
    getStellarConfig(),
    Effect.flatMap((config) =>
      pipe(
        loadAccount(config.server, accountId),
        Effect.flatMap(parseBalances),
        Effect.map(({ tokens, xlmBalance }) => ({
          accountId,
          tokens,
          xlmBalance,
        })),
      )
    ),
  );

export const PortfolioServiceLive = Layer.succeed(PortfolioServiceTag, {
  getAccountPortfolio: getAccountPortfolioImpl,
});
