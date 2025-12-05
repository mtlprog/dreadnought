import { Asset, type Horizon } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe, Schedule } from "effect";
import { fetchOrderbook } from "@dreadnought/stellar-core";
import { getStellarConfig } from "./config";
import { type EnvironmentError, StellarError, TokenPriceError } from "./errors";
import type { AssetInfo, OrderbookData, PriceDetails, PriceSource, TokenPairPrice } from "./types";

// Retry policy for rate limit errors (429)
const retryPolicy = pipe(
  // Start with 2 seconds, exponential backoff with max 5 retries
  Schedule.exponential("2 seconds"),
  Schedule.compose(Schedule.recurs(5)), // Max 5 retries
  Schedule.whileInput((error: StellarError | TokenPriceError) => {
    // Only retry on rate limit errors
    if (error._tag === "StellarError") {
      const errorMessage = error.cause instanceof Error ? error.cause.message : String(error.cause);
      return errorMessage.includes("Too Many Requests") || errorMessage.includes("429");
    }
    return false;
  }),
);

// Global price cache to avoid duplicate requests
// Key: "tokenA:tokenB:amount" -> TokenPairPrice
const priceCache = new Map<string, { data: TokenPairPrice; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds

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
  readonly valueInEURMTL: string | null; // Total value (price × balance) for display
  readonly valueInXLM: string | null; // Total value (price × balance) for display
  readonly detailsEURMTL?: PriceDetails;
  readonly detailsXLM?: PriceDetails;
  readonly isNFT?: boolean; // True if balance = 0.0000001 (1 stroop)
  readonly nftValuationAccount?: string; // Account ID where NFT valuation was found
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
          { concurrency: 1 }, // Sequential to reduce API load
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
  amount: string = "1", // Default to 1 for spot price, but can specify full balance
): Effect.Effect<TokenPairPrice, TokenPriceError | StellarError> =>
  pipe(
    Effect.all({
      sourceAsset: createAsset(tokenA),
      destAsset: createAsset(tokenB),
    }),
    Effect.flatMap(({ sourceAsset, destAsset }) =>
      pipe(
        // Try strictSendPaths first with specified amount
        Effect.tryPromise({
          try: () =>
            config.server
              .strictSendPaths(sourceAsset, amount, [destAsset])
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
                    .strictReceivePaths([sourceAsset], destAsset, amount)
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
          { concurrency: 1 }, // Sequential to minimize rate limiting
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
            sourceAmount: sourceAmount.toString(),
            destinationAmount: destinationAmount.toString(),
            path: pathHops,
          };

          return {
            tokenA: `${tokenA.code}${tokenA.issuer !== "" && tokenA.issuer != null ? `:${tokenA.issuer}` : ""}`,
            tokenB: `${tokenB.code}${tokenB.issuer !== "" && tokenB.issuer != null ? `:${tokenB.issuer}` : ""}`,
            price,
            destinationAmount: destinationAmount.toString(),
            timestamp: new Date(),
            details: pathDetails,
          };
        }),
      );
    }),
  );

// Get price from direct orderbook (without path finding)
const tryDirectOrderbook = (
  tokenA: AssetInfo,
  tokenB: AssetInfo,
  config: { server: Horizon.Server },
): Effect.Effect<TokenPairPrice, TokenPriceError | StellarError> =>
  pipe(
    // Fetch orderbook data for direct trading pair
    fetchOrderbookData(
      config.server,
      tokenA.code,
      tokenA.issuer !== "" ? tokenA.issuer : undefined,
      tokenB.code,
      tokenB.issuer !== "" ? tokenB.issuer : undefined,
    ),
    Effect.flatMap((orderbookData) => {
      // Select best source (orderbook or AMM)
      const bestData = orderbookData.bestSource === "amm"
        ? orderbookData.amm
        : orderbookData.orderbook;

      // Priority: bid (buying) > ask (selling)
      const bid = bestData.bid !== null ? parseFloat(bestData.bid) : null;
      const ask = bestData.ask !== null ? parseFloat(bestData.ask) : null;

      const price = bid ?? ask;
      const priceType = bid !== null ? "bid" : ask !== null ? "ask" : null;

      if (price === null || priceType === null) {
        return Effect.fail(
          new TokenPriceError({
            message: "No orderbook price available (neither bid nor ask)",
            tokenA: tokenA.code,
            tokenB: tokenB.code,
          }),
        );
      }

      const priceStr = price.toString();

      return Effect.succeed({
        tokenA: `${tokenA.code}${tokenA.issuer !== "" && tokenA.issuer != null ? `:${tokenA.issuer}` : ""}`,
        tokenB: `${tokenB.code}${tokenB.issuer !== "" && tokenB.issuer != null ? `:${tokenB.issuer}` : ""}`,
        price: priceStr,
        destinationAmount: priceStr, // For amount=1, destination equals price
        timestamp: new Date(),
        details: {
          source: "orderbook" as const,
          priceType,
          orderbookData,
        },
      });
    }),
  );

const getTokenPriceImpl = (
  tokenA: AssetInfo,
  tokenB: AssetInfo,
  amount?: string, // Optional amount, defaults to "1" in tryPathFinding
): Effect.Effect<TokenPairPrice, TokenPriceError | StellarError | EnvironmentError> => {
  const actualAmount = amount ?? "1";
  const cacheKey = `${tokenA.code}:${tokenA.issuer}=>${tokenB.code}:${tokenB.issuer}:${actualAmount}`;

  // Check cache first
  const cached = priceCache.get(cacheKey);
  if (cached !== undefined && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Effect.succeed(cached.data);
  }

  // Special case: same token (e.g., XLM -> XLM)
  if (tokenA.code === tokenB.code && tokenA.issuer === tokenB.issuer) {
    const result: TokenPairPrice = {
      tokenA: `${tokenA.code}${tokenA.issuer !== "" && tokenA.issuer != null ? `:${tokenA.issuer}` : ""}`,
      tokenB: `${tokenB.code}${tokenB.issuer !== "" && tokenB.issuer != null ? `:${tokenB.issuer}` : ""}`,
      price: "1",
      destinationAmount: actualAmount, // For same token, destination equals source
      timestamp: new Date(),
      // No details for trivial 1:1 conversion (omit optional field)
    };
    // Store in cache
    priceCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return Effect.succeed(result);
  }

  return pipe(
    getStellarConfig(),
    Effect.flatMap((config): Effect.Effect<TokenPairPrice, TokenPriceError | StellarError> => {
      type ResultSuccess = { success: true; data: TokenPairPrice };
      type ResultFailure = { success: false; data: null };
      type Result = ResultSuccess | ResultFailure;

      return pipe(
        // Try path finding and orderbook (only for spot price)
        Effect.all(
          {
            pathResult: pipe(
              tryPathFinding(tokenA, tokenB, config, actualAmount),
              Effect.map((result): Result => ({ success: true, data: result })),
              Effect.catchAll((): Effect.Effect<Result, never> => Effect.succeed({ success: false, data: null })),
            ),
            orderbookResult: pipe(
              // IMPORTANT: Orderbook ONLY for spot price (amount=1)
              // For full balance (amount != 1), orderbook should not be used because:
              // 1. It doesn't account for slippage on large volumes
              // 2. Bid/ask prices for illiquid tokens don't represent real liquidity
              // 3. Only path finding can accurately price large volumes
              actualAmount === "1"
                ? pipe(
                    tryDirectOrderbook(tokenA, tokenB, config),
                    Effect.map((result): Result => ({ success: true, data: result })),
                    Effect.catchAll((): Effect.Effect<Result, never> => Effect.succeed({ success: false, data: null })),
                  )
                : Effect.succeed({ success: false, data: null } as Result),
            ),
          },
          { concurrency: 2 }, // Run both in parallel
        ),
        Effect.flatMap(({ pathResult, orderbookResult }): Effect.Effect<TokenPairPrice, TokenPriceError> => {
          // Extract prices
          const pathPrice = pathResult.success && pathResult.data !== null
            ? parseFloat(pathResult.data.price)
            : null;
          const orderbookPrice = orderbookResult.success && orderbookResult.data !== null
            ? parseFloat(orderbookResult.data.price)
            : null;

          // Determine which source to use
          // For buying (bid): higher price is better (more tokenB per tokenA)
          // Priority: use whichever gives higher price
          let chosenResult: TokenPairPrice | null = null;
          let chosenSource: "path" | "orderbook" = "path";

          if (pathPrice !== null && orderbookPrice !== null) {
            // Both succeeded - choose higher price (better for buying)
            // NOTE: This only happens for spot price (amount=1), because orderbook
            // is not queried for full balance (amount != 1)
            if (pathPrice >= orderbookPrice) {
              chosenResult = pathResult.data;
              chosenSource = "path";
            } else {
              chosenResult = orderbookResult.data;
              chosenSource = "orderbook";
            }

            if (chosenResult === null) {
              return Effect.fail(
                new TokenPriceError({
                  message: "Internal error: chosen result is null despite successful prices",
                  tokenA: tokenA.code,
                  tokenB: tokenB.code,
                }),
              );
            }

            // Create combined details
            const priceType = orderbookResult.data?.details?.source === "orderbook"
              ? orderbookResult.data.details.priceType
              : "bid"; // Default to bid if not available

            const pathDetails = pathResult.data?.details !== undefined &&
              pathResult.data.details.source === "path"
              ? pathResult.data.details
              : undefined;

            const orderbookDetails = orderbookResult.data?.details !== undefined &&
              orderbookResult.data.details.source === "orderbook"
              ? orderbookResult.data.details
              : undefined;

            const combinedDetails: PriceDetails = {
              source: "best" as const,
              priceType,
              pathPrice: pathPrice.toString(),
              orderbookPrice: orderbookPrice.toString(),
              chosenSource,
              ...(pathDetails !== undefined ? { pathDetails } : {}),
              ...(orderbookDetails !== undefined ? { orderbookDetails } : {}),
            };

            const finalResult: TokenPairPrice = {
              tokenA: chosenResult.tokenA,
              tokenB: chosenResult.tokenB,
              price: chosenResult.price,
              destinationAmount: chosenResult.destinationAmount,
              timestamp: chosenResult.timestamp,
              details: combinedDetails,
            };

            return Effect.succeed(finalResult);
          }

          if (pathPrice !== null && pathResult.data !== null) {
            // Only path succeeded
            return Effect.succeed(pathResult.data);
          }

          if (orderbookPrice !== null && orderbookResult.data !== null) {
            // Only orderbook succeeded
            // NOTE: This only happens for spot price (amount=1), because orderbook
            // is not queried for full balance (amount != 1)
            return Effect.succeed(orderbookResult.data);
          }

          // Both failed
          return Effect.fail(
            new TokenPriceError({
              message: "Both path finding and orderbook failed to find price",
              tokenA: tokenA.code,
              tokenB: tokenB.code,
            }),
          );
        }),
        Effect.tap((result) =>
          pipe(
            Effect.sync(() => {
              // Store in cache
              priceCache.set(cacheKey, { data: result, timestamp: Date.now() });
            }),
            Effect.flatMap(() => {
              const source = result.details?.source === "best"
                ? `best (${result.details.chosenSource})`
                : result.details?.source ?? "unknown";
              return Effect.log(
                `✓ Price cached: ${tokenA.code} -> ${tokenB.code} (${actualAmount}) from ${source}`,
              );
            }),
          )
        ),
        // Apply retry policy for rate limit errors
        Effect.retry({
          schedule: retryPolicy,
          while: (error: TokenPriceError) => {
            // Retry only on rate limit StellarErrors
            // TokenPriceError wraps the original error in cause
            if (error.cause != null && typeof error.cause === "object" && "_tag" in error.cause) {
              const causeError = error.cause as { _tag: string; cause?: unknown };
              if (causeError._tag === "StellarError") {
                const errorMessage = causeError.cause instanceof Error
                  ? causeError.cause.message
                  : String(causeError.cause);
                const isRateLimit = errorMessage.includes("Too Many Requests") || errorMessage.includes("429");
                if (isRateLimit) {
                  Effect.runSync(
                    Effect.logWarning(
                      `⚠ RATE LIMIT detected in combined pricing, retrying with backoff...`
                    )
                  );
                }
                return isRateLimit;
              }
            }
            return false; // Don't retry other errors
          },
        }),
        Effect.catchAll((error) =>
          pipe(
            Effect.logError(
              `🚨 CRITICAL: Price calculation failed for ${tokenA.code} -> ${tokenB.code} (${actualAmount}): ${
                error instanceof Error ? error.message : String(error)
              }`,
            ),
            Effect.flatMap(() =>
              Effect.fail(
                new TokenPriceError({
                  message: "Failed to calculate token price",
                  tokenA: tokenA.code,
                  tokenB: tokenB.code,
                  cause: error,
                }),
              )
            ),
          )
        ),
      );
    }),
  );
};

const getTokensWithPricesImpl = (
  tokens: readonly { asset: AssetInfo; balance: string }[],
  baseTokens: { eurmtl: AssetInfo; xlm: AssetInfo },
): Effect.Effect<readonly TokenPriceWithBalance[], TokenPriceError | StellarError | EnvironmentError> =>
  pipe(
    // First, get EURMTL→XLM cross rate for synthetic prices
    getTokenPriceImpl(baseTokens.eurmtl, baseTokens.xlm, "1"),
    Effect.map((result) => parseFloat(result.price)),
    Effect.catchAll(() => Effect.succeed(null as number | null)),
    Effect.flatMap((eurmtlToXlmRate) =>
      pipe(
        Effect.all(
          tokens.map((token, index) =>
            pipe(
              // Add delay before each token (except first) to avoid rate limiting
              index > 0 ? Effect.sleep("100 millis") : Effect.void,
              Effect.flatMap(() =>
                pipe(
              Effect.all({
                // Spot price (amount = 1) for calculations
                eurmtlSpotData: pipe(
                  getTokenPriceImpl(token.asset, baseTokens.eurmtl, "1"),
                  Effect.map((result) => ({ price: result.price, details: result.details })),
                  Effect.catchAll((error) =>
                    pipe(
                      Effect.logError(`EURMTL spot pricing failed for ${token.asset.code}: ${error}`),
                      Effect.flatMap(() => Effect.succeed({ price: null, details: undefined })),
                    )
                  ),
                ),
                xlmSpotData: pipe(
                  getTokenPriceImpl(token.asset, baseTokens.xlm, "1"),
                  Effect.map((result) => ({ price: result.price, details: result.details })),
                  Effect.catchAll((error) =>
                    pipe(
                      Effect.logError(`XLM spot pricing failed for ${token.asset.code}: ${error}`),
                      Effect.flatMap(() => Effect.succeed({ price: null, details: undefined })),
                    )
                  ),
                ),
              }),
              Effect.map(({ eurmtlSpotData, xlmSpotData }) => {
                // Use spot price for calculations
                let priceInEURMTL = eurmtlSpotData.price;
                let priceInXLM = xlmSpotData.price;

                // Synthetic prices through cross-rate if one price is missing
                if (priceInEURMTL !== null && priceInXLM === null && eurmtlToXlmRate !== null) {
                  // Calculate XLM price from EURMTL price: priceInXLM = priceInEURMTL * rate(EURMTL→XLM)
                  priceInXLM = (parseFloat(priceInEURMTL) * eurmtlToXlmRate).toString();
                } else if (priceInXLM !== null && priceInEURMTL === null && eurmtlToXlmRate !== null && eurmtlToXlmRate !== 0) {
                  // Calculate EURMTL price from XLM price: priceInEURMTL = priceInXLM / rate(EURMTL→XLM)
                  priceInEURMTL = (parseFloat(priceInXLM) / eurmtlToXlmRate).toString();
                }

                // Calculate total value (price × balance) for display
                const valueInEURMTL = priceInEURMTL !== null
                  ? (parseFloat(priceInEURMTL) * parseFloat(token.balance)).toFixed(2)
                  : null;
                const valueInXLM = priceInXLM !== null
                  ? (parseFloat(priceInXLM) * parseFloat(token.balance)).toFixed(7)
                  : null;

                return {
                  asset: token.asset,
                  balance: token.balance,
                  priceInEURMTL,
                  priceInXLM,
                  valueInEURMTL,
                  valueInXLM,
                  ...(eurmtlSpotData.details != null ? { detailsEURMTL: eurmtlSpotData.details } : {}),
                  ...(xlmSpotData.details != null ? { detailsXLM: xlmSpotData.details } : {}),
                };
              }),
            )
          )
        )
          ),
          { concurrency: 1 }, // Reduced to 1 to minimize rate limiting
        ),
      )
    ),
  );

export const PriceServiceLive = Layer.succeed(PriceServiceTag, {
  getTokenPrice: getTokenPriceImpl,
  getTokensWithPrices: getTokensWithPricesImpl,
});
