import { Effect, pipe } from "effect";

/**
 * Stale-while-revalidate cache for Effect programs.
 *
 * Behavior:
 * - Fresh hit (age < freshMs)  → return cached value, skip fetch
 * - Stale or miss              → run the fetch effect
 *     - on success             → update cache, return fresh value
 *     - on failure:
 *         - if cache has any entry (even ancient) → serve stale + log
 *         - otherwise                             → propagate the error
 *
 * The cache store has no hard expiry: once a key is populated successfully,
 * it survives indefinitely until replaced by a newer successful fetch.
 * `freshMs` only controls when we bother re-fetching.
 *
 * State lives in a module-level Map, shared across the Next.js server
 * process for the lifetime of that process (resets on cold start).
 */

interface StaleEntry<A> {
  readonly value: A;
  readonly timestamp: number;
}

const store = new Map<string, StaleEntry<unknown>>();

/**
 * Wrap an Effect so that its result is cached with stale-fallback semantics.
 *
 * @param key     cache key (should be stable across requests for the same data)
 * @param effect  the fetch Effect; its error channel is preserved on the "no stale" path
 * @param freshMs duration in ms during which a cached value is returned without re-running `effect`
 */
export const withStaleFallback = <A, E, R>(
  key: string,
  effect: Effect.Effect<A, E, R>,
  freshMs: number,
): Effect.Effect<A, E, R> =>
  pipe(
    Effect.sync(() => store.get(key) as StaleEntry<A> | undefined),
    Effect.flatMap((entry) => {
      const now = Date.now();

      if (entry !== undefined && now - entry.timestamp < freshMs) {
        return Effect.succeed(entry.value);
      }

      return pipe(
        effect,
        Effect.tap((value) => Effect.sync(() => store.set(key, { value, timestamp: Date.now() }))),
        Effect.catchAll((error) => {
          if (entry !== undefined) {
            const ageSeconds = Math.round((now - entry.timestamp) / 1000);
            return pipe(
              Effect.log(
                `[cache] stale fallback for "${key}" (age=${ageSeconds}s): ${String(error)}`,
              ),
              Effect.map(() => entry.value),
            );
          }
          return Effect.fail(error);
        }),
      );
    }),
  );

/**
 * Clear the entire cache. Intended for tests and manual invalidation.
 */
export const clearCache = (): void => {
  store.clear();
};
