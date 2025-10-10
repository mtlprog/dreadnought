import { Asset, type Horizon } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig } from "./config";
import { type EnvironmentError, StellarError, TokenPriceError } from "./errors";
import type { AssetInfo, PriceDetails, TokenPairPrice } from "./types";

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

      // Build simplified path without orderbook details
      const pathHops: Array<{ from: string; to: string }> = [];

      if (bestPath.path != null && bestPath.path.length > 0) {
        let currentAssetCode = tokenA.code;

        // Process each intermediate hop
        for (const hop of bestPath.path) {
          const nextAssetCode = hop.asset_code ?? "XLM";
          pathHops.push({
            from: currentAssetCode,
            to: nextAssetCode,
          });
          currentAssetCode = nextAssetCode;
        }

        // Add final hop to destination if needed
        if (currentAssetCode !== tokenB.code) {
          pathHops.push({
            from: currentAssetCode,
            to: tokenB.code,
          });
        }
      } else {
        // Direct path
        pathHops.push({
          from: tokenA.code,
          to: tokenB.code,
        });
      }

      const pathDetails: PriceDetails = {
        source: "path" as const,
        path: pathHops,
      };

      return Effect.succeed({
        tokenA: `${tokenA.code}${tokenA.issuer !== "" && tokenA.issuer != null ? `:${tokenA.issuer}` : ""}`,
        tokenB: `${tokenB.code}${tokenB.issuer !== "" && tokenB.issuer != null ? `:${tokenB.issuer}` : ""}`,
        price,
        timestamp: new Date(),
        details: pathDetails,
      });
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
