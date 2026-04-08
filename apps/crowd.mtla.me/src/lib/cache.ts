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
 *         - otherwise                             → log and propagate the error
 *
 * The cache store has no hard expiry: once a key is populated successfully,
 * it survives indefinitely until replaced by a newer successful fetch.
 * `freshMs` only controls when we bother re-fetching.
 *
 * Scope:
 * - Server-only; this module must never be imported from client bundles.
 * - State lives in a module-level Map shared across the Next.js server
 *   process for the lifetime of that process (resets on cold start).
 * - In a multi-instance deployment each instance has its own copy, so
 *   stale values may diverge across replicas — acceptable for the
 *   best-effort use case this cache serves.
 *
 * Key discipline:
 * - Callers must use stable, namespaced keys (`project-<CODE>`,
 *   `account-name-<ID>`, …). The store is `Map<string, StaleEntry<unknown>>`
 *   and the value shape is narrowed by an unchecked `as` cast on read;
 *   reusing the same key with different value types will silently corrupt
 *   subsequent reads.
 */

interface StaleEntry<A> {
  readonly value: A;
  readonly timestamp: number;
}

const store = new Map<string, StaleEntry<unknown>>();

/**
 * Wrap an Effect so that its result is cached with stale-fallback semantics.
 *
 * Curried shape — the effect is the final argument so `withStaleFallback(key, freshMs)`
 * drops cleanly into the end of a `pipe(…)` chain alongside combinators like
 * `Effect.retry` and `Effect.provide`.
 *
 * @param key     cache key (must be stable across requests for the same value shape)
 * @param freshMs duration in ms during which a cached value is returned without re-running the effect
 */
export const withStaleFallback =
  (key: string, freshMs: number) => <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    pipe(
      // Key→A binding is conventional; see module docstring on "Key discipline".
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
            return pipe(
              Effect.log(`[cache] no stale entry for "${key}", propagating: ${String(error)}`),
              Effect.flatMap(() => Effect.fail(error)),
            );
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
