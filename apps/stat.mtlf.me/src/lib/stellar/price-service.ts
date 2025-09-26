import { Asset, Horizon } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig } from "./config";
import { StellarError, TokenPriceError, EnvironmentError } from "./errors";
import { AssetInfo, TokenPairPrice } from "./types";

export interface TokenPriceWithBalance {
  readonly asset: AssetInfo;
  readonly balance: string;
  readonly priceInEURMTL: string | null;
  readonly priceInXLM: string | null;
  readonly valueInEURMTL: string | null;
  readonly valueInXLM: string | null;
}

export interface PriceService {
  readonly getTokenPrice: (
    tokenA: AssetInfo,
    tokenB: AssetInfo,
  ) => Effect.Effect<TokenPairPrice, TokenPriceError | StellarError | EnvironmentError>;

  readonly getTokensWithPrices: (
    tokens: readonly { asset: AssetInfo; balance: string }[],
    baseTokens: { eurmtl: AssetInfo; xlm: AssetInfo },
  ) => Effect.Effect<readonly TokenPriceWithBalance[], TokenPriceError | StellarError | EnvironmentError>;
}

export const PriceService = Context.GenericTag<PriceService>("@dreadnought/PriceService");

const createAsset = (assetInfo: AssetInfo): Asset => {
  if (assetInfo.type === "native" || assetInfo.code === "XLM") {
    return Asset.native();
  }

  if (!assetInfo.issuer) {
    throw new Error(`Asset ${assetInfo.code} has no issuer`);
  }

  return new Asset(assetInfo.code, assetInfo.issuer);
};

const fetchOrderbook = (
  server: Horizon.Server,
  selling: Asset,
  buying: Asset,
): Effect.Effect<any, StellarError> =>
  Effect.tryPromise({
    try: () => server.orderbook(selling, buying).call(),
    catch: (error) =>
      new StellarError({
        operation: "fetchOrderbook",
        cause: error,
      }),
  });

const calculateAveragePrice = (
  orderbook: any,
): Effect.Effect<string, TokenPriceError> =>
  pipe(
    Effect.sync(() => {
      const bids = orderbook.bids;
      const asks = orderbook.asks;

      if (bids.length === 0 && asks.length === 0) {
        return Effect.fail(
          new TokenPriceError({
            message: "No orderbook data available",
          }),
        );
      }

      // Calculate best bid (highest buy price)
      let bestBidPrice = 0;
      if (bids.length > 0) {
        const bestBid = bids[0]; // Bids are sorted descending
        bestBidPrice = parseFloat(bestBid.price);
      }

      // Calculate best ask (lowest sell price)
      let bestAskPrice = 0;
      if (asks.length > 0) {
        const bestAsk = asks[0]; // Asks are sorted ascending
        bestAskPrice = parseFloat(bestAsk.price);
      }

      let midPrice: number;

      // If we have both bid and ask, use mid-market price
      if (bestBidPrice > 0 && bestAskPrice > 0) {
        midPrice = (bestBidPrice + bestAskPrice) / 2;
      }
      // If only bids available, use best bid
      else if (bestBidPrice > 0) {
        midPrice = bestBidPrice;
      }
      // If only asks available, use best ask
      else if (bestAskPrice > 0) {
        midPrice = bestAskPrice;
      }
      // No valid prices
      else {
        return Effect.fail(
          new TokenPriceError({
            message: "No valid price data found in orderbook",
          }),
        );
      }

      return Effect.succeed(midPrice.toString());
    }),
    Effect.flatten,
  );

const getTokenPriceImpl = (
  tokenA: AssetInfo,
  tokenB: AssetInfo,
): Effect.Effect<TokenPairPrice, TokenPriceError | StellarError | EnvironmentError> =>
  pipe(
    getStellarConfig(),
    Effect.flatMap((config) => {
      const assetA = createAsset(tokenA);
      const assetB = createAsset(tokenB);

      return pipe(
        fetchOrderbook(config.server, assetA, assetB),
        Effect.flatMap(calculateAveragePrice),
        Effect.map((price) => ({
          tokenA: `${tokenA.code}${tokenA.issuer ? ":" + tokenA.issuer : ""}`,
          tokenB: `${tokenB.code}${tokenB.issuer ? ":" + tokenB.issuer : ""}`,
          price,
          timestamp: new Date(),
        })),
        Effect.catchTag("StellarError", (error) => Effect.fail(error)),
        Effect.catchTag("TokenPriceError", (error) => Effect.fail(error)),
        Effect.catchAll((error) =>
          Effect.fail(
            new TokenPriceError({
              message: "Failed to calculate token price",
              tokenA: tokenA.code,
              tokenB: tokenB.code,
              cause: error,
            }),
          )
        ),
      );
    }),
  );

const getTokensWithPricesImpl = (
  tokens: readonly { asset: AssetInfo; balance: string }[],
  baseTokens: { eurmtl: AssetInfo; xlm: AssetInfo },
): Effect.Effect<readonly TokenPriceWithBalance[], TokenPriceError | StellarError | EnvironmentError> =>
  pipe(
    Effect.all(
      tokens.map((token) =>
        pipe(
          Effect.all({
            eurmtlPrice: pipe(
              getTokenPriceImpl(token.asset, baseTokens.eurmtl),
              Effect.map((result) => result.price),
              Effect.catchAll(() => Effect.succeed(null)),
            ),
            xlmPrice: pipe(
              getTokenPriceImpl(token.asset, baseTokens.xlm),
              Effect.map((result) => result.price),
              Effect.catchAll(() => Effect.succeed(null)),
            ),
          }),
          Effect.map(({ eurmtlPrice, xlmPrice }) => {
            const balance = parseFloat(token.balance);
            const valueInEURMTL = eurmtlPrice ? (balance * parseFloat(eurmtlPrice)).toFixed(2) : null;
            const valueInXLM = xlmPrice ? (balance * parseFloat(xlmPrice)).toFixed(7) : null;

            return {
              asset: token.asset,
              balance: token.balance,
              priceInEURMTL: eurmtlPrice,
              priceInXLM: xlmPrice,
              valueInEURMTL,
              valueInXLM,
            };
          }),
        )
      ),
      { concurrency: 5 }, // Limit concurrent requests
    ),
  );

export const PriceServiceLive = Layer.succeed(PriceService, {
  getTokenPrice: getTokenPriceImpl,
  getTokensWithPrices: getTokensWithPricesImpl,
});