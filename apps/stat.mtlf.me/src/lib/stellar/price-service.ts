import { Asset, type Horizon } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig } from "./config";
import { type EnvironmentError, StellarError, TokenPriceError } from "./errors";
import type { AssetInfo, PriceDetails, TokenPairPrice } from "./types";

// Horizon API response interfaces
interface OrderbookRecord {
  readonly price: string;
  readonly amount: string;
}

interface OrderbookResponse {
  readonly bids: readonly OrderbookRecord[];
  readonly asks: readonly OrderbookRecord[];
}

interface PathRecord {
  readonly source_amount: string;
  readonly destination_amount: string;
  readonly source_asset_type: string;
  readonly source_asset_code?: string;
  readonly source_asset_issuer?: string;
  readonly destination_asset_type: string;
  readonly destination_asset_code?: string;
  readonly destination_asset_issuer?: string;
  readonly path: readonly unknown[];
}

interface PathResponse {
  readonly records: readonly PathRecord[];
}

interface PathHop {
  readonly asset_code?: string;
  readonly asset_issuer?: string;
}

export interface TokenPriceWithBalance {
  readonly asset: AssetInfo;
  readonly balance: string;
  readonly priceInEURMTL: string | null;
  readonly priceInXLM: string | null;
  readonly valueInEURMTL: string | null;
  readonly valueInXLM: string | null;
  readonly detailsEURMTL?: PriceDetails;
  readonly detailsXLM?: PriceDetails;
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

export const PriceServiceTag = Context.GenericTag<PriceService>("@dreadnought/PriceService");

const createAsset = (assetInfo: AssetInfo): Effect.Effect<Asset, TokenPriceError> => {
  if (assetInfo.type === "native" || assetInfo.code === "XLM") {
    return Effect.succeed(Asset.native());
  }

  if (assetInfo.issuer === "" || assetInfo.issuer === undefined) {
    return Effect.fail(
      new TokenPriceError({
        message: `Asset ${assetInfo.code} has no issuer`,
      }),
    );
  }

  return Effect.succeed(new Asset(assetInfo.code, assetInfo.issuer));
};

const fetchOrderbook = (
  server: Horizon.Server,
  selling: Asset,
  buying: Asset,
): Effect.Effect<OrderbookResponse, StellarError> =>
  Effect.tryPromise({
    try: () => server.orderbook(selling, buying).call() as Promise<OrderbookResponse>,
    catch: (error) =>
      new StellarError({
        operation: "fetchOrderbook",
        cause: error,
      }),
  });

interface PriceCalculationResult {
  readonly price: string;
  readonly details: PriceDetails;
}

const calculateAveragePrice = (
  orderbook: OrderbookResponse,
): Effect.Effect<PriceCalculationResult, TokenPriceError> =>
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
      let bestBidString: string | undefined;
      if (bids.length > 0) {
        const bestBid = bids[0]; // Bids are sorted descending
        if (bestBid != null) {
          bestBidPrice = parseFloat(bestBid.price);
          bestBidString = bestBid.price;
        }
      }

      // Calculate best ask (lowest sell price)
      let bestAskPrice = 0;
      let bestAskString: string | undefined;
      if (asks.length > 0) {
        const bestAsk = asks[0]; // Asks are sorted ascending
        if (bestAsk != null) {
          bestAskPrice = parseFloat(bestAsk.price);
          bestAskString = bestAsk.price;
        }
      }

      let midPrice: number;

      // If we have both bid and ask, use mid-market price
      if (bestBidPrice > 0 && bestAskPrice > 0) {
        midPrice = (bestBidPrice + bestAskPrice) / 2;
      } // If only bids available, use best bid
      else if (bestBidPrice > 0) {
        midPrice = bestBidPrice;
      } // If only asks available, use best ask
      else if (bestAskPrice > 0) {
        midPrice = bestAskPrice;
      } // No valid prices
      else {
        return Effect.fail(
          new TokenPriceError({
            message: "No valid price data found in orderbook",
          }),
        );
      }

      return Effect.succeed({
        price: midPrice.toString(),
        details: {
          source: "orderbook" as const,
          ...(bestBidString != null && bestBidString !== "" ? { bid: bestBidString } : {}),
          ...(bestAskString != null && bestAskString !== "" ? { ask: bestAskString } : {}),
          midPrice: midPrice.toString(),
        },
      });
    }),
    Effect.flatten,
  );

const tryPathFinding = (
  tokenA: AssetInfo,
  tokenB: AssetInfo,
  config: { server: Horizon.Server },
): Effect.Effect<TokenPairPrice, TokenPriceError | StellarError> =>
  pipe(
    Effect.all({
      sourceAsset: createAsset(tokenA),
      destAsset: createAsset(tokenB),
    }),
    Effect.flatMap(({ sourceAsset, destAsset }) =>
      Effect.tryPromise({
        try: () =>
          config.server
            .strictSendPaths(sourceAsset, "1", [destAsset])
            .call() as Promise<PathResponse>,
        catch: (error) =>
          new StellarError({
            operation: "pathFinding",
            cause: error,
          }),
      })
    ),
    Effect.flatMap((response: PathResponse) => {
      const paths = response.records ?? [];

      if (paths.length === 0) {
        return Effect.fail(
          new TokenPriceError({
            message: "No payment paths found",
            tokenA: tokenA.code,
            tokenB: tokenB.code,
          }),
        );
      }

      const bestPath = paths[0];
      if (bestPath?.destination_amount === undefined || bestPath?.destination_amount === "") {
        return Effect.fail(
          new TokenPriceError({
            message: "Invalid path response",
            tokenA: tokenA.code,
            tokenB: tokenB.code,
          }),
        );
      }

      const sourceAmount = parseFloat(bestPath.source_amount);
      const destinationAmount = parseFloat(bestPath.destination_amount);
      const price = (destinationAmount / sourceAmount).toString();

      // Build detailed path with orderbook data for each hop
      return pipe(
        Effect.all([
          // Get orderbook data for each step in the path
          bestPath.path != null && bestPath.path.length > 0
            ? pipe(
              pipe(
                createAsset(tokenA),
                Effect.flatMap((startAsset) => {
                  const hops: Effect.Effect<{
                    from: string;
                    to: string;
                    price?: string;
                    bid?: string;
                    ask?: string;
                    midPrice?: string;
                  }, TokenPriceError>[] = [];

                  let currentAssetEffect = Effect.succeed(startAsset);
                  let currentAssetCode = tokenA.code;

                  // Process each intermediate hop
                  for (const hop of bestPath.path) {
                    const nextAssetCode = (hop as PathHop).asset_code ?? "XLM";
                    const nextAssetIssuer = (hop as PathHop).asset_issuer;

                    const nextAssetInfo: AssetInfo = nextAssetCode === "XLM"
                      ? { code: "XLM", issuer: "", type: "native" }
                      : { code: nextAssetCode, issuer: nextAssetIssuer ?? "", type: "credit_alphanum4" };

                    // Get orderbook for this hop
                    const hopEffect = pipe(
                      Effect.all({
                        currentAsset: currentAssetEffect,
                        nextAsset: createAsset(nextAssetInfo),
                      }),
                      Effect.flatMap(({ currentAsset, nextAsset }) =>
                        pipe(
                          fetchOrderbook(config.server, currentAsset, nextAsset),
                          Effect.flatMap(calculateAveragePrice),
                          Effect.map((result) => ({
                            from: currentAssetCode,
                            to: nextAssetCode,
                            ...(result.price !== "" && result.price != null ? { price: result.price } : {}),
                            ...(result.details.bid != null && result.details.bid !== ""
                              ? { bid: result.details.bid }
                              : {}),
                            ...(result.details.ask != null && result.details.ask !== ""
                              ? { ask: result.details.ask }
                              : {}),
                            ...(result.details.midPrice != null && result.details.midPrice !== ""
                              ? { midPrice: result.details.midPrice }
                              : {}),
                          })),
                          Effect.catchAll(() =>
                            Effect.succeed({
                              from: currentAssetCode,
                              to: nextAssetCode,
                            })
                          ),
                        )
                      ),
                    );

                    hops.push(hopEffect);
                    currentAssetEffect = createAsset(nextAssetInfo).pipe(
                      Effect.catchAll(() => Effect.succeed(Asset.native())),
                    );
                    currentAssetCode = nextAssetCode;
                  }

                  // Add final hop to destination if needed
                  if (currentAssetCode !== tokenB.code) {
                    const finalHopEffect = pipe(
                      Effect.all({
                        currentAsset: currentAssetEffect,
                        finalAsset: createAsset(tokenB),
                      }),
                      Effect.flatMap(({ currentAsset, finalAsset }) =>
                        pipe(
                          fetchOrderbook(config.server, currentAsset, finalAsset),
                          Effect.flatMap(calculateAveragePrice),
                          Effect.map((result) => ({
                            from: currentAssetCode,
                            to: tokenB.code,
                            ...(result.price !== "" && result.price != null ? { price: result.price } : {}),
                            ...(result.details.bid != null && result.details.bid !== ""
                              ? { bid: result.details.bid }
                              : {}),
                            ...(result.details.ask != null && result.details.ask !== ""
                              ? { ask: result.details.ask }
                              : {}),
                            ...(result.details.midPrice != null && result.details.midPrice !== ""
                              ? { midPrice: result.details.midPrice }
                              : {}),
                          })),
                          Effect.catchAll(() =>
                            Effect.succeed({
                              from: currentAssetCode,
                              to: tokenB.code,
                            })
                          ),
                        )
                      ),
                    );
                    hops.push(finalHopEffect);
                  }

                  return Effect.succeed(hops);
                }),
              ),
              Effect.flatMap((hops) =>
                Effect.all(hops, { concurrency: 3 }).pipe(
                  Effect.catchAll(() =>
                    Effect.succeed([{
                      from: tokenA.code,
                      to: tokenB.code,
                      price,
                    }])
                  ),
                )
              ),
            )
            : Effect.succeed([{
              from: tokenA.code,
              to: tokenB.code,
              price,
            }]),
        ]),
        Effect.map(([pathHops]) => {
          const pathDetails: PriceDetails = {
            source: "path" as const,
            path: pathHops,
          };

          return {
            tokenA: `${tokenA.code}${tokenA.issuer !== "" && tokenA.issuer != null ? `:${tokenA.issuer}` : ""}`,
            tokenB: `${tokenB.code}${tokenB.issuer !== "" && tokenB.issuer != null ? `:${tokenB.issuer}` : ""}`,
            price,
            timestamp: new Date(),
            details: pathDetails,
          };
        }),
      );
    }),
  );

const getTokenPriceImpl = (
  tokenA: AssetInfo,
  tokenB: AssetInfo,
): Effect.Effect<TokenPairPrice, TokenPriceError | StellarError | EnvironmentError> =>
  pipe(
    getStellarConfig(),
    Effect.flatMap((config) => {
      // Try direct orderbook first
      const directPrice = pipe(
        Effect.all({
          assetA: createAsset(tokenA),
          assetB: createAsset(tokenB),
        }),
        Effect.flatMap(({ assetA, assetB }) =>
          pipe(
            fetchOrderbook(config.server, assetA, assetB),
            Effect.flatMap(calculateAveragePrice),
            Effect.map((result) => ({
              tokenA: `${tokenA.code}${tokenA.issuer !== "" && tokenA.issuer != null ? `:${tokenA.issuer}` : ""}`,
              tokenB: `${tokenB.code}${tokenB.issuer !== "" && tokenB.issuer != null ? `:${tokenB.issuer}` : ""}`,
              price: result.price,
              timestamp: new Date(),
              details: result.details,
            })),
          )
        ),
      );

      // If direct orderbook fails, try path finding as fallback
      return pipe(
        directPrice,
        Effect.catchAll(() =>
          pipe(
            tryPathFinding(tokenA, tokenB, config),
            Effect.tap(() => Effect.log(`Used path finding for ${tokenA.code} -> ${tokenB.code}`)),
          )
        ),
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
            eurmtlData: pipe(
              getTokenPriceImpl(token.asset, baseTokens.eurmtl),
              Effect.map((result) => ({ price: result.price, details: result.details })),
              Effect.catchAll(() => Effect.succeed({ price: null, details: undefined })),
            ),
            xlmData: pipe(
              getTokenPriceImpl(token.asset, baseTokens.xlm),
              Effect.map((result) => ({ price: result.price, details: result.details })),
              Effect.catchAll(() => Effect.succeed({ price: null, details: undefined })),
            ),
          }),
          Effect.map(({ eurmtlData, xlmData }) => {
            const balance = parseFloat(token.balance);
            const valueInEURMTL = eurmtlData.price != null && eurmtlData.price !== ""
              ? (balance * parseFloat(eurmtlData.price)).toFixed(2)
              : null;
            const valueInXLM = xlmData.price != null && xlmData.price !== ""
              ? (balance * parseFloat(xlmData.price)).toFixed(7)
              : null;

            return {
              asset: token.asset,
              balance: token.balance,
              priceInEURMTL: eurmtlData.price,
              priceInXLM: xlmData.price,
              valueInEURMTL,
              valueInXLM,
              ...(eurmtlData.details != null ? { detailsEURMTL: eurmtlData.details } : {}),
              ...(xlmData.details != null ? { detailsXLM: xlmData.details } : {}),
            };
          }),
        )
      ),
      { concurrency: 5 }, // Limit concurrent requests
    ),
  );

export const PriceServiceLive = Layer.succeed(PriceServiceTag, {
  getTokenPrice: getTokenPriceImpl,
  getTokensWithPrices: getTokensWithPricesImpl,
});
