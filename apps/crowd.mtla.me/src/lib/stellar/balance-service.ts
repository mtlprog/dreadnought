import { Asset } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig, type StellarConfig } from "./config";
import { StellarError, type StellarServiceError } from "./errors";

export interface BalanceService {
  readonly getMTLCrowdBalance: (accountId: string) => Effect.Effect<string, StellarServiceError>;
  readonly getEURMTLBalance: (accountId: string) => Effect.Effect<string, StellarServiceError>;
  readonly getBalances: (accountId: string) => Effect.Effect<{ mtlCrowd: string; eurMtl: string }, StellarServiceError>;
}

export const BalanceServiceTag = Context.GenericTag<BalanceService>(
  "@crowd.mtla.me/BalanceService",
);

// EURMTL asset definition
const EURMTL_ASSET = new Asset("EURMTL", "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");

const getMTLCrowdBalanceImpl = (
  config: StellarConfig,
  accountId: string,
): Effect.Effect<string, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const account = await config.server.loadAccount(accountId);

        // Ищем баланс MTLCrowd токена
        for (const balance of account.balances) {
          if (
            balance.asset_type !== "native"
            && balance.asset_type !== "liquidity_pool_shares"
            && "asset_code" in balance
            && "asset_issuer" in balance
            && balance.asset_code === config.mtlCrowdAsset.code
            && balance.asset_issuer === config.mtlCrowdAsset.issuer
          ) {
            return balance.balance;
          }
        }

        // Если токен не найден, баланс = 0
        return "0";
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "get_mtl_crowd_balance",
        }),
    }),
  );

const getEURMTLBalanceImpl = (
  config: StellarConfig,
  accountId: string,
): Effect.Effect<string, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const account = await config.server.loadAccount(accountId);

        // Ищем баланс EURMTL токена
        for (const balance of account.balances) {
          if (
            balance.asset_type !== "native"
            && balance.asset_type !== "liquidity_pool_shares"
            && "asset_code" in balance
            && "asset_issuer" in balance
            && balance.asset_code === EURMTL_ASSET.code
            && balance.asset_issuer === EURMTL_ASSET.issuer
          ) {
            return balance.balance;
          }
        }

        // Если токен не найден, баланс = 0
        return "0";
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "get_eurmtl_balance",
        }),
    }),
  );

const getBalancesImpl = (
  config: StellarConfig,
  accountId: string,
): Effect.Effect<{ mtlCrowd: string; eurMtl: string }, StellarError> =>
  pipe(
    Effect.all({
      mtlCrowd: getMTLCrowdBalanceImpl(config, accountId),
      eurMtl: getEURMTLBalanceImpl(config, accountId),
    }),
  );

export const BalanceServiceLive = Layer.succeed(
  BalanceServiceTag,
  BalanceServiceTag.of({
    getMTLCrowdBalance: (accountId: string) =>
      pipe(
        getStellarConfig(),
        Effect.flatMap((config) => getMTLCrowdBalanceImpl(config, accountId)),
      ),
    getEURMTLBalance: (accountId: string) =>
      pipe(
        getStellarConfig(),
        Effect.flatMap((config) => getEURMTLBalanceImpl(config, accountId)),
      ),
    getBalances: (accountId: string) =>
      pipe(
        getStellarConfig(),
        Effect.flatMap((config) => getBalancesImpl(config, accountId)),
      ),
  }),
);
