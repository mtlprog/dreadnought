import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig, type StellarConfig } from "./config";
import { StellarError, type StellarServiceError } from "./errors";

export interface BalanceService {
  readonly getMTLCrowdBalance: (accountId: string) => Effect.Effect<string, StellarServiceError>;
}

export const BalanceServiceTag = Context.GenericTag<BalanceService>(
  "@crowd.mtla.me/BalanceService",
);

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

export const BalanceServiceLive = Layer.succeed(
  BalanceServiceTag,
  BalanceServiceTag.of({
    getMTLCrowdBalance: (accountId: string) =>
      pipe(
        getStellarConfig(),
        Effect.flatMap((config) => getMTLCrowdBalanceImpl(config, accountId)),
      ),
  }),
);
