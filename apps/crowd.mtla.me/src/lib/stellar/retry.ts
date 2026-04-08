import { Effect, pipe, Schedule } from "effect";

/**
 * Retry policy for transient external-service failures (Stellar Horizon,
 * IPFS gateway, account name lookups).
 *
 * Exponential backoff with a hard recurrence cap: `MAX_ATTEMPTS` total
 * (the initial call + `MAX_ATTEMPTS - 1` retries) with delays of roughly
 * 250ms, 500ms, 1000ms. Worst-case added latency on a fully-failing call
 * is ~1.75s.
 *
 * Applied per external call so that a slow IPFS request does not drag
 * Horizon calls into additional retries.
 */
const MAX_ATTEMPTS = 4;

const transientRetrySchedule = Schedule.intersect(
  Schedule.exponential("250 millis", 2.0),
  Schedule.recurs(MAX_ATTEMPTS - 1),
);

/**
 * Extract a short descriptor from an unknown error for log lines.
 * Surfaces `StellarError.operation` when present so the retry log
 * points at the failing call without having to dig into the cause JSON.
 */
const describeError = (err: unknown): string => {
  if (typeof err === "object" && err !== null && "_tag" in err && "operation" in err) {
    return `${String(err._tag)}(${String(err.operation)})`;
  }
  return String(err);
};

/**
 * Wrap an Effect with the transient retry schedule. All errors are retried
 * uniformly; we only invoke this for external I/O where any failure is
 * considered potentially transient.
 */
export const retryTransient = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> =>
  pipe(
    effect,
    Effect.retry(transientRetrySchedule),
    Effect.tapError((err) => Effect.log(`[retry] giving up after ${MAX_ATTEMPTS} attempts: ${describeError(err)}`)),
  );
