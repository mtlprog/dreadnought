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
      60 * 1000, // 1 minutes cache
    ),
    Effect.catchAll(() => Effect.succeed([])), // Return empty array on error
  );

/**
 * Cached single project fetching service
 */
export const getProjectWithCache = (code: string): Effect.Effect<ProjectInfo | null, never> =>
  pipe(
    withCache(
      `project-${code.toUpperCase()}`,
      pipe(
        Effect.gen(function*() {
          const stellarService = yield* StellarServiceTag;
          return yield* stellarService.getProject(code);
        }),
        Effect.provide(StellarServiceLive),
      ),
      60 * 1000, // 1 minutes cache
    ),
    Effect.catchAll(() => Effect.succeed(null)), // Return null on error
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

/**
 * Server-side function to get single project data
 * This should be called from server components or API routes
 */
export const getProject = async (code: string): Promise<ProjectInfo | null> => {
  const program = getProjectWithCache(code);

  try {
    // Run the Effect program directly
    return await Effect.runPromise(program);
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return null;
  }
};
