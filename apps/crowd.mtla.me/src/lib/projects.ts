import { Effect, pipe } from "effect";
import { withCache } from "./cache";
import { type ProjectInfo, StellarServiceLive, StellarServiceTag } from "./stellar";

/**
 * Cached project fetching service
 */
export const getProjectsWithCache = (): Effect.Effect<ProjectInfo[], never> =>
  pipe(
    withCache(
      "projects",
      pipe(
        Effect.gen(function*() {
          const stellarService = yield* StellarServiceTag;
          return yield* stellarService.getProjects();
        }),
        Effect.provide(StellarServiceLive),
      ),
      5 * 60 * 1000, // 5 minutes cache
    ),
    Effect.catchAll(() => Effect.succeed([])), // Return empty array on error
  );

/**
 * Server-side function to get projects data
 * This should be called from server components or API routes
 */
export const getProjects = async (): Promise<ProjectInfo[]> => {
  const program = getProjectsWithCache();

  try {
    // Run the Effect program directly
    return await Effect.runPromise(program);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return [];
  }
};
