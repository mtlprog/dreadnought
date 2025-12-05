import { Context, Effect, Layer, pipe, Ref, Schedule } from "effect";
import { EnvironmentError } from "./errors";

/**
 * Supported external price symbols that can be used in _1COST values
 */
export type ExternalPriceSymbol = "BTC" | "ETH" | "XLM" | "Sats" | "USD";

/**
 * External price data with timestamp for caching
 */
export interface ExternalPrice {
  readonly symbol: ExternalPriceSymbol;
  readonly priceInEUR: number;
  readonly timestamp: number;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  readonly priceInEUR: number;
  readonly timestamp: number;
}

/**
 * Price cache state type
 */
type PriceCache = ReadonlyMap<ExternalPriceSymbol, CacheEntry>;

// Cache duration: 1 hour (in milliseconds)
const CACHE_DURATION_MS = 60 * 60 * 1000;

// CoinGecko free tier rate limit: ~10-30 requests per minute
// We use 6 second delay between requests to stay safe (10 requests/min max)
const API_REQUEST_DELAY = "6 seconds" as const;

// Retry configuration for 429 errors
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = "10 seconds" as const;

/**
 * CoinGecko API coin IDs for supported symbols
 */
const COINGECKO_IDS: Record<ExternalPriceSymbol, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  XLM: "stellar",
  Sats: "bitcoin", // Sats = BTC / 100_000_000
  USD: "tether", // USD price via USDT
};

/**
 * Service for fetching external crypto prices from CoinGecko
 * Prices are returned in EUR and cached for 1 hour
 * Uses Effect Ref for thread-safe, testable state management
 */
export interface ExternalPriceService {
  /**
   * Get price in EUR for a given symbol
   * Returns cached price if available and not expired
   *
   * @param symbol - External price symbol (BTC, ETH, XLM, Sats, USD)
   * @returns Effect with price in EUR
   */
  readonly getPriceInEUR: (
    symbol: ExternalPriceSymbol,
  ) => Effect.Effect<number, EnvironmentError>;

  /**
   * Get all supported prices in EUR
   * Fetches from CoinGecko in a single request for efficiency
   *
   * @returns Effect with map of symbol -> price in EUR
   */
  readonly getAllPricesInEUR: () => Effect.Effect<
    ReadonlyMap<ExternalPriceSymbol, number>,
    EnvironmentError
  >;

  /**
   * Check if a value is a supported external price symbol
   *
   * @param value - Value to check
   * @returns true if value is a supported symbol
   */
  readonly isExternalPriceSymbol: (value: string) => value is ExternalPriceSymbol;

  /**
   * Clear the price cache (useful for testing)
   */
  readonly clearCache: () => Effect.Effect<void, never>;
}

export const ExternalPriceServiceTag = Context.GenericTag<ExternalPriceService>(
  "@stat.mtlf.me/ExternalPriceService",
);

/**
 * CoinGecko API response type
 */
interface CoinGeckoSimplePriceResponse {
  [coinId: string]: {
    eur: number;
  };
}

/**
 * Check if cache entry is still valid
 */
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_DURATION_MS;
};

/**
 * Custom error for rate limiting to enable retry
 */
class RateLimitError {
  readonly _tag = "RateLimitError";
  constructor(readonly message: string) {}
}

/**
 * Fetch prices from CoinGecko API with rate limiting and retry
 * Free API: https://api.coingecko.com/api/v3/simple/price
 *
 * Rate limit handling:
 * - Adds delay before each request to respect CoinGecko free tier limits
 * - Retries with exponential backoff on 429 errors
 */
const fetchFromCoinGecko = (
  coinIds: readonly string[],
): Effect.Effect<CoinGeckoSimplePriceResponse, EnvironmentError> => {
  // Single fetch attempt
  const fetchAttempt = pipe(
    Effect.tryPromise({
      try: async () => {
        const ids = coinIds.join(",");
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur`;

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });

        // Handle rate limiting specifically
        if (response.status === 429) {
          throw new RateLimitError("Rate limit exceeded (429)");
        }

        if (!response.ok) {
          throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
        }

        return response.json() as Promise<CoinGeckoSimplePriceResponse>;
      },
      catch: (error) => {
        if (error instanceof RateLimitError) {
          return error;
        }
        return new EnvironmentError({
          variable: `CoinGecko API: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      },
    }),
    Effect.flatMap((result) => {
      if (result instanceof RateLimitError) {
        return Effect.fail(result);
      }
      return Effect.succeed(result);
    }),
  );

  // Retry schedule: exponential backoff starting at 5 seconds
  const retrySchedule = pipe(
    Schedule.exponential(INITIAL_RETRY_DELAY),
    Schedule.intersect(Schedule.recurs(MAX_RETRIES)),
  );

  return pipe(
    // Add delay before request to respect rate limits
    Effect.sleep(API_REQUEST_DELAY),
    Effect.tap(() => Effect.log(`Fetching prices for: ${coinIds.join(", ")}`)),
    Effect.flatMap(() => fetchAttempt),
    // Retry only on rate limit errors
    Effect.retry({
      schedule: retrySchedule,
      while: (error) => error instanceof RateLimitError,
    }),
    // Convert RateLimitError to EnvironmentError after retries exhausted
    Effect.catchAll((error) => {
      if (error instanceof RateLimitError) {
        return Effect.fail(
          new EnvironmentError({
            variable: `CoinGecko API: Rate limit exceeded after ${MAX_RETRIES} retries`,
          }),
        );
      }
      return Effect.fail(error);
    }),
    Effect.tap((response) =>
      Effect.log(`Fetched prices from CoinGecko: ${JSON.stringify(response)}`),
    ),
  );
};

const isExternalPriceSymbolImpl = (value: string): value is ExternalPriceSymbol => {
  return ["BTC", "ETH", "XLM", "Sats", "USD"].includes(value);
};

/**
 * Create service implementation with Effect Ref for cache state
 * This avoids global mutable state and makes the service testable
 */
const makeExternalPriceService = Effect.gen(function* () {
  // Create cache ref with empty initial state
  const cacheRef = yield* Ref.make<PriceCache>(new Map());

  const getPriceInEUR = (
    symbol: ExternalPriceSymbol,
  ): Effect.Effect<number, EnvironmentError> =>
    pipe(
      Ref.get(cacheRef),
      Effect.flatMap((cache) => {
        const cached = cache.get(symbol);
        if (cached && isCacheValid(cached.timestamp)) {
          return pipe(
            Effect.log(`Using cached price for ${symbol}: ${cached.priceInEUR} EUR`),
            Effect.map(() => cached.priceInEUR),
          );
        }

        // Fetch fresh price
        const coinId = COINGECKO_IDS[symbol];
        return pipe(
          fetchFromCoinGecko([coinId]),
          Effect.flatMap((response) => {
            let priceInEUR = response[coinId]?.eur ?? 0;

            // Special handling for Sats (1 Sat = 1/100_000_000 BTC)
            if (symbol === "Sats") {
              priceInEUR = priceInEUR / 100_000_000;
            }

            // Update cache using Ref
            return pipe(
              Ref.update(cacheRef, (currentCache) => {
                const newCache = new Map(currentCache);
                newCache.set(symbol, {
                  priceInEUR,
                  timestamp: Date.now(),
                });
                return newCache;
              }),
              Effect.map(() => priceInEUR),
            );
          }),
        );
      }),
    );

  const getAllPricesInEUR = (): Effect.Effect<
    ReadonlyMap<ExternalPriceSymbol, number>,
    EnvironmentError
  > =>
    pipe(
      Ref.get(cacheRef),
      Effect.flatMap((cache) => {
        // Check which prices need refreshing
        const needsFetch: ExternalPriceSymbol[] = [];
        const cachedPrices = new Map<ExternalPriceSymbol, number>();

        for (const symbol of ["BTC", "ETH", "XLM", "Sats", "USD"] as ExternalPriceSymbol[]) {
          const cached = cache.get(symbol);
          if (cached && isCacheValid(cached.timestamp)) {
            cachedPrices.set(symbol, cached.priceInEUR);
          } else {
            needsFetch.push(symbol);
          }
        }

        if (needsFetch.length === 0) {
          return Effect.succeed(cachedPrices as ReadonlyMap<ExternalPriceSymbol, number>);
        }

        // Get unique coin IDs to fetch
        const coinIdsToFetch = [...new Set(needsFetch.map((s) => COINGECKO_IDS[s]))];

        return pipe(
          fetchFromCoinGecko(coinIdsToFetch),
          Effect.flatMap((response) => {
            const now = Date.now();
            const result = new Map(cachedPrices);
            const cacheUpdates = new Map<ExternalPriceSymbol, CacheEntry>();

            for (const symbol of needsFetch) {
              const coinId = COINGECKO_IDS[symbol];
              let priceInEUR = response[coinId]?.eur ?? 0;

              // Special handling for Sats
              if (symbol === "Sats") {
                priceInEUR = priceInEUR / 100_000_000;
              }

              cacheUpdates.set(symbol, { priceInEUR, timestamp: now });
              result.set(symbol, priceInEUR);
            }

            // Update cache using Ref
            return pipe(
              Ref.update(cacheRef, (currentCache) => {
                const newCache = new Map(currentCache);
                for (const [symbol, entry] of cacheUpdates) {
                  newCache.set(symbol, entry);
                }
                return newCache;
              }),
              Effect.map(() => result as ReadonlyMap<ExternalPriceSymbol, number>),
            );
          }),
        );
      }),
    );

  const clearCache = (): Effect.Effect<void, never> =>
    Ref.set(cacheRef, new Map());

  return {
    getPriceInEUR,
    getAllPricesInEUR,
    isExternalPriceSymbol: isExternalPriceSymbolImpl,
    clearCache,
  } satisfies ExternalPriceService;
});

export const ExternalPriceServiceLive = Layer.effect(
  ExternalPriceServiceTag,
  makeExternalPriceService,
);
