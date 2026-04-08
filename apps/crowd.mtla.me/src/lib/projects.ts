import { Effect, pipe } from "effect";
import { withStaleFallback } from "./cache";
import { type ProjectInfo, StellarServiceLive, StellarServiceTag } from "./stellar";

const PROJECT_FRESH_MS = 60 * 1000; // 1 minute

/**
 * Server-side function to get the list of all projects.
 *
 * Cached with stale-fallback: if the live fetch fails but a previous
 * successful result exists, the old list is served and the failure is
 * logged. Only a complete failure with no prior cache propagates as an
 * error (and will trigger the Next.js error boundary → 500 page).
 */
export const getProjects = async (): Promise<ProjectInfo[]> => {
  const program = pipe(
    Effect.gen(function*() {
      const stellarService = yield* StellarServiceTag;
      return yield* stellarService.getProjects();
    }),
    Effect.provide(StellarServiceLive),
    (effect) => withStaleFallback("projects", effect, PROJECT_FRESH_MS),
  );

  return Effect.runPromise(program);
};

/**
 * Server-side function to get a single project by code.
 *
 * Returns `null` only for a real "project not found" result from the
 * Stellar service (no matching manageData entry, or no P-token issued).
 * Transient fetch failures are absorbed by `withStaleFallback` when a
 * previous successful result exists, otherwise they propagate and are
 * rendered as a 500 page.
 */
export const getProject = async (code: string): Promise<ProjectInfo | null> => {
  const key = `project-${code.toUpperCase()}`;
  const program = pipe(
    Effect.gen(function*() {
      const stellarService = yield* StellarServiceTag;
      return yield* stellarService.getProject(code);
    }),
    Effect.provide(StellarServiceLive),
    (effect) => withStaleFallback(key, effect, PROJECT_FRESH_MS),
  );

  return Effect.runPromise(program);
};
