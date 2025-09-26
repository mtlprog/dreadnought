import type { Horizon } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig } from "./config";
import { type EnvironmentError, StellarError } from "./errors";
import type { AssetInfo } from "./types";

// Stellar account balance interface
interface BalanceRecord {
  readonly balance: string;
  readonly limit?: string;
  readonly buying_liabilities?: string;
  readonly selling_liabilities?: string;
  readonly asset_type: string;
  readonly asset_code?: string;
  readonly asset_issuer?: string;
}

// Stellar account response interface
interface AccountResponse {
  readonly id: string;
  readonly sequence: string;
  readonly balances: readonly BalanceRecord[];
}

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

const loadAccountBalances = (
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
): Effect.Effect<AccountPortfolio, StellarError | EnvironmentError> =>
  pipe(
    getStellarConfig(),
    Effect.flatMap((config) =>
      pipe(
        loadAccountBalances(config.server, accountId),
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
