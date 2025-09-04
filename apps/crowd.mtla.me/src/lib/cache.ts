import { Effect, pipe } from "effect";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMs: number = 1 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (entry === undefined) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const cache = new MemoryCache();

/**
 * Cache wrapper for Effect operations
 */
export const withCache = <A, E>(
  key: Readonly<string>,
  effect: Readonly<Effect.Effect<A, E>>,
  ttlMs: Readonly<number> = 1 * 60 * 1000, // 1 minutes default
): Effect.Effect<A, E> =>
  pipe(
    Effect.sync(() => cache.get<A>(key)),
    Effect.flatMap(cached =>
      cached !== null
        ? Effect.succeed(cached)
        : pipe(
          effect,
          Effect.tap(data => Effect.sync(() => cache.set(key, data, ttlMs))),
        )
    ),
  );

export { cache };
