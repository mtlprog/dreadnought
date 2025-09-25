import { Asset, Horizon } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig } from "./config";
import { StellarError, TokenPriceError } from "./errors";
import { AssetInfo, TokenPairPrice } from "./types";

export interface PriceService {
  readonly getTokenPrice: (
    tokenA: AssetInfo,
    tokenB: AssetInfo,
  ) => Effect.Effect<TokenPairPrice, TokenPriceError | StellarError>;
}

export const PriceService = Context.GenericTag<PriceService>("@dreadnought/PriceService");

const createAsset = (assetInfo: AssetInfo): Asset => {
  if (assetInfo.type === "native") {
    return Asset.native();
  }
  return new Asset(assetInfo.code, assetInfo.issuer);
};

const fetchOrderbook = (
  server: Horizon.Server,
  selling: Asset,
  buying: Asset,
): Effect.Effect<Horizon.HorizonApi.OrderbookRecord, StellarError> =>
  Effect.tryPromise({
    try: () => server.orderbook(selling, buying).call(),
    catch: (error) =>
      new StellarError({
        operation: "fetchOrderbook",
        cause: error,
      }),
  });

const calculateAveragePrice = (
  orderbook: Horizon.HorizonApi.OrderbookRecord,
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
        console.log(`Best Bid: ${bestBidPrice}, Best Ask: ${bestAskPrice}, Mid Price: ${midPrice}`);
      }
      // If only bids available, use best bid
      else if (bestBidPrice > 0) {
        midPrice = bestBidPrice;
        console.log(`Only bids available, using best bid: ${midPrice}`);
      }
      // If only asks available, use best ask
      else if (bestAskPrice > 0) {
        midPrice = bestAskPrice;
        console.log(`Only asks available, using best ask: ${midPrice}`);
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
): Effect.Effect<TokenPairPrice, TokenPriceError | StellarError> =>
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
        Effect.catchAll((error) => {
          if (error._tag === "StellarError") {
            return Effect.fail(error);
          }
          return Effect.fail(
            new TokenPriceError({
              message: "Failed to calculate token price",
              tokenA: tokenA.code,
              tokenB: tokenB.code,
              cause: error,
            }),
          );
        }),
      );
    }),
  );

export const PriceServiceLive = Layer.succeed(PriceService, {
  getTokenPrice: getTokenPriceImpl,
});