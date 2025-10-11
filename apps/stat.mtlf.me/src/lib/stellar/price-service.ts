import { Asset, type Horizon } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { fetchOrderbook } from "@dreadnought/stellar-core";
import { getStellarConfig } from "./config";
import { type EnvironmentError, StellarError, TokenPriceError } from "./errors";
import type { AssetInfo, OrderbookData, PriceDetails, PriceSource, TokenPairPrice } from "./types";

// Horizon API response interfaces
interface PathRecord {
  readonly source_amount: string;
  readonly destination_amount: string;
  readonly source_asset_type: string;
  readonly source_asset_code?: string;
  readonly source_asset_issuer?: string;
  readonly destination_asset_type: string;
  readonly destination_asset_code?: string;
  readonly destination_asset_issuer?: string;
  readonly path: readonly PathHop[];
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

  return Effect.try({
    try: () => new Asset(assetInfo.code, assetInfo.issuer),
    catch: (error) =>
      new TokenPriceError({
        message: `Invalid asset: ${assetInfo.code}:${assetInfo.issuer}`,
        cause: error,
      }),
  });
};

// Helper to create AssetInfo from code and issuer
const createAssetInfo = (code: string, issuer?: string): AssetInfo => ({
  code,
  issuer: issuer ?? "",
  type: code === "XLM" || !issuer ? "native" : "credit_alphanum4",
});

// Fetch liquidity pool price for a trading pair
const fetchLiquidityPoolPrice = (
  server: Horizon.Server,
  assetA: Asset,
  assetB: Asset,
): Effect.Effect<PriceSource & { readonly poolId?: string }, never> =>
  pipe(
    Effect.tryPromise({
      try: () => server.liquidityPools().forAssets(assetA, assetB).limit(1).call(),
      catch: (error) =>
        new StellarError({
          operation: "fetchLiquidityPools",
          cause: error,
        }),
    }),
    Effect.map((poolsResponse) => {
      const pool = poolsResponse.records?.[0];
      if (pool === null || pool === undefined || pool.reserves.length !== 2) {
        return { ask: null, bid: null };
      }

      // Extract reserves - pool.reserves is array of {asset: string, amount: string}
      const reserveA = pool.reserves[0];
      const reserveB = pool.reserves[1];
      if (reserveA === undefined || reserveB === undefined) {
        return { ask: null, bid: null };
      }

      const amountA = parseFloat(reserveA.amount);
      const amountB = parseFloat(reserveB.amount);

      // Calculate spot price: how much of assetA to get 1 assetB
      // AMM price = reserveB / reserveA (assuming reserve order matches asset order)
      const spotPrice = (amountB / amountA).toFixed(7);

      // In AMM, ask and bid are the same (spot price)
      return {
        ask: spotPrice,
        bid: spotPrice,
        poolId: pool.id,
      };
    }),
    Effect.catchAll((error) =>
      pipe(
        Effect.log(
          `Failed to fetch liquidity pool: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
        Effect.flatMap(() => Effect.succeed({ ask: null, bid: null })),
      )
    ),
  );

// Helper to determine best price source
const determineBestSource = (
  orderbookPrice: PriceSource,
  ammPrice: PriceSource,
): "orderbook" | "amm" | "none" => {
  const obAsk = orderbookPrice.ask !== null ? parseFloat(orderbookPrice.ask) : null;
  const ammAsk = ammPrice.ask !== null ? parseFloat(ammPrice.ask) : null;

  // If both have prices, compare (lower ask is better for buying)
  if (obAsk !== null && ammAsk !== null) {
    return obAsk <= ammAsk ? "orderbook" : "amm";
  }

  // If only one has price, use it
  if (obAsk !== null) return "orderbook";
  if (ammAsk !== null) return "amm";

  // Neither has price
  return "none";
};

// Fetch orderbook data for a trading pair (fetches BOTH orderbook and AMM)
const fetchOrderbookData = (
  server: Horizon.Server,
  sellingCode: string,
  sellingIssuer: string | undefined,
  buyingCode: string,
  buyingIssuer: string | undefined,
): Effect.Effect<OrderbookData, never> =>
  pipe(
    Effect.all({
      selling: createAsset(createAssetInfo(sellingCode, sellingIssuer)),
      buying: createAsset(createAssetInfo(buyingCode, buyingIssuer)),
    }),
    Effect.flatMap(({ selling, buying }) =>
      pipe(
        // Fetch BOTH sources in parallel
        Effect.all(
          {
            orderbookData: pipe(
              fetchOrderbook(server, selling, buying),
              Effect.map((orderbookResponse) => ({
                ask: orderbookResponse.asks?.[0]?.price ?? null,
                bid: orderbookResponse.bids?.[0]?.price ?? null,
              })),
              Effect.catchAll(() => Effect.succeed({ ask: null, bid: null })),
            ),
            ammData: fetchLiquidityPoolPrice(server, selling, buying),
          },
          { concurrency: 2 }, // Fetch both in parallel
        ),
        Effect.map(({ orderbookData, ammData }) => {
          const bestSource = determineBestSource(orderbookData, ammData);

          return {
            orderbook: orderbookData,
            amm: ammData,
            bestSource,
          };
        }),
      )
    ),
    // Catch any TokenPriceError from createAsset and return empty orderbook data
    Effect.catchAll((error) =>
      pipe(
        Effect.log(
          `Failed to create assets for ${sellingCode}->${buyingCode}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
        Effect.flatMap(() =>
          Effect.succeed({
            orderbook: { ask: null, bid: null },
            amm: { ask: null, bid: null },
            bestSource: "none" as const,
          })
        ),
      )
    ),
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
      pipe(
        // Try strictSendPaths first with amount "1"
        Effect.tryPromise({
          try: () =>
            config.server
              .strictSendPaths(sourceAsset, "1", [destAsset])
              .call() as Promise<PathResponse>,
          catch: (error) =>
            new StellarError({
              operation: "pathFindingSend",
              cause: error,
            }),
        }),
        Effect.tap((sendResponse) =>
          Effect.log(
            `strictSendPaths for ${tokenA.code} -> ${tokenB.code}: found ${sendResponse.records?.length ?? 0} paths`,
          )
        ),
        // If that fails, try strictReceivePaths as fallback
        Effect.catchAll((sendError) =>
          pipe(
            Effect.log(`strictSendPaths failed for ${tokenA.code} -> ${tokenB.code}: ${sendError}`),
            Effect.flatMap(() =>
              Effect.tryPromise({
                try: () =>
                  config.server
                    .strictReceivePaths([sourceAsset], destAsset, "1")
                    .call() as Promise<PathResponse>,
                catch: (error) =>
                  new StellarError({
                    operation: "pathFindingReceive",
                    cause: error,
                  }),
              })
            ),
            Effect.tap((receiveResponse) =>
              Effect.log(
                `strictReceivePaths for ${tokenA.code} -> ${tokenB.code}: found ${
                  receiveResponse.records?.length ?? 0
                } paths`,
              )
            ),
            Effect.catchAll((receiveError) =>
              pipe(
                Effect.log(`strictReceivePaths also failed for ${tokenA.code} -> ${tokenB.code}: ${receiveError}`),
                Effect.flatMap(() => Effect.fail(receiveError)),
              )
            ),
          )
        ),
      )
    ),
    Effect.flatMap((response: PathResponse) => {
      const paths = response.records ?? [];

      if (paths.length === 0) {
        return pipe(
          Effect.log(
            `No payment paths found between ${tokenA.code}:${tokenA.issuer} and ${tokenB.code}:${tokenB.issuer}`,
          ),
          Effect.flatMap(() =>
            Effect.fail(
              new TokenPriceError({
                message: "No payment paths found",
                tokenA: tokenA.code,
                tokenB: tokenB.code,
              }),
            )
          ),
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

      // Build path with hop information for orderbook fetching
      interface HopInfo {
        from: string;
        fromIssuer?: string;
        to: string;
        toIssuer?: string;
      }

      const hopsInfo: HopInfo[] = [];

      if (bestPath.path != null && bestPath.path.length > 0) {
        let currentAssetCode = tokenA.code;
        let currentAssetIssuer = tokenA.issuer !== "" ? tokenA.issuer : undefined;

        // Process each intermediate hop
        for (const hop of bestPath.path) {
          const nextAssetCode = hop.asset_code ?? "XLM";
          const nextAssetIssuer = hop.asset_issuer ?? undefined;

          hopsInfo.push({
            from: currentAssetCode,
            to: nextAssetCode,
            ...(currentAssetIssuer !== undefined ? { fromIssuer: currentAssetIssuer } : {}),
            ...(nextAssetIssuer !== undefined ? { toIssuer: nextAssetIssuer } : {}),
          });

          currentAssetCode = nextAssetCode;
          currentAssetIssuer = nextAssetIssuer;
        }

        // Add final hop to destination if needed
        if (currentAssetCode !== tokenB.code) {
          const toIssuer = tokenB.issuer !== "" ? tokenB.issuer : undefined;
          hopsInfo.push({
            from: currentAssetCode,
            to: tokenB.code,
            ...(currentAssetIssuer !== undefined ? { fromIssuer: currentAssetIssuer } : {}),
            ...(toIssuer !== undefined ? { toIssuer } : {}),
          });
        }
      } else {
        // Direct path
        const fromIssuer = tokenA.issuer !== "" ? tokenA.issuer : undefined;
        const toIssuer = tokenB.issuer !== "" ? tokenB.issuer : undefined;
        hopsInfo.push({
          from: tokenA.code,
          to: tokenB.code,
          ...(fromIssuer !== undefined ? { fromIssuer } : {}),
          ...(toIssuer !== undefined ? { toIssuer } : {}),
        });
      }

      // Fetch orderbook data for all hops (with caching via Map)
      const orderbookCache = new Map<string, OrderbookData>();

      return pipe(
        Effect.all(
          hopsInfo.map((hop) => {
            // Create cache key for this trading pair
            const cacheKey = `${hop.from}:${hop.fromIssuer ?? "native"}->${hop.to}:${hop.toIssuer ?? "native"}`;

            // Check cache first
            const cached = orderbookCache.get(cacheKey);
            if (cached !== undefined) {
              return Effect.succeed({ hop, orderbook: cached });
            }

            // Fetch orderbook data
            return pipe(
              fetchOrderbookData(config.server, hop.from, hop.fromIssuer, hop.to, hop.toIssuer),
              Effect.map((orderbook) => {
                // Store in cache
                orderbookCache.set(cacheKey, orderbook);
                return { hop, orderbook };
              }),
            );
          }),
          { concurrency: 3 }, // Limit concurrent orderbook requests
        ),
        Effect.map((hopsWithOrderbook) => {
          // Build final path details with orderbook data
          const pathHops = hopsWithOrderbook.map(({ hop, orderbook }) => ({
            from: hop.from,
            to: hop.to,
            orderbook,
          }));

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
    Effect.flatMap((config): Effect.Effect<TokenPairPrice, TokenPriceError | StellarError> =>
      pipe(
        tryPathFinding(tokenA, tokenB, config),
        Effect.tap(() => Effect.log(`Path finding for ${tokenA.code} -> ${tokenB.code}`)),
        Effect.catchTag("StellarError", (error) => Effect.fail(error)),
        Effect.catchTag("TokenPriceError", (error) => Effect.fail(error)),
        Effect.catchAll((error) =>
          pipe(
            Effect.log(
              `Path finding error for ${tokenA.code} -> ${tokenB.code}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            ),
            Effect.flatMap(() =>
              Effect.fail(
                new TokenPriceError({
                  message: "Failed to calculate token price via path finding",
                  tokenA: tokenA.code,
                  tokenB: tokenB.code,
                  cause: error,
                }),
              )
            ),
          )
        ),
      )
    ),
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
              Effect.catchAll((error) =>
                pipe(
                  Effect.logError(`EURMTL pricing failed for ${token.asset.code}: ${error}`),
                  Effect.flatMap(() => Effect.succeed({ price: null, details: undefined })),
                )
              ),
            ),
            xlmData: pipe(
              getTokenPriceImpl(token.asset, baseTokens.xlm),
              Effect.map((result) => ({ price: result.price, details: result.details })),
              Effect.catchAll((error) =>
                pipe(
                  Effect.logError(`XLM pricing failed for ${token.asset.code}: ${error}`),
                  Effect.flatMap(() => Effect.succeed({ price: null, details: undefined })),
                )
              ),
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
