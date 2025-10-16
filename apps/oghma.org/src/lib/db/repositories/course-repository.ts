import { Context, Effect, Layer, pipe } from "effect";
import { PgClient } from "@effect/sql-pg";
import * as S from "@effect/schema/Schema";
import type { Course } from "@/lib/types";

// Errors
export class CourseNotFoundError extends S.TaggedError<CourseNotFoundError>()(
  "CourseNotFoundError",
  {
    slug: S.String,
  }
) {}

export class CourseSaveError extends S.TaggedError<CourseSaveError>()(
  "CourseSaveError",
  {
    message: S.String,
    cause: S.Unknown,
  }
) {}

// Service interface
export interface CourseRepository {
  readonly findBySlug: (
    slug: string
  ) => Effect.Effect<Course, CourseNotFoundError>;

  readonly upsert: (
    slug: string,
    title: string,
    description: string,
    author: string | null,
    tags: string[] | null
  ) => Effect.Effect<Course, CourseSaveError>;

  readonly deleteBySlug: (slug: string) => Effect.Effect<void, CourseSaveError>;

  readonly getAllSlugs: () => Effect.Effect<string[], CourseSaveError>;
}

// Service tag
export const CourseRepositoryTag =
  Context.GenericTag<CourseRepository>("@app/CourseRepository");

// Implementation
export const CourseRepositoryLive = Layer.effect(
  CourseRepositoryTag,
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;

    return {
      findBySlug: (slug: string): Effect.Effect<Course, CourseNotFoundError> =>
        pipe(
          Effect.gen(function* () {
            const result = yield* sql<Course>`
              SELECT * FROM courses WHERE slug = ${slug}
            `;

            if (result.length === 0) {
              return yield* Effect.fail(new CourseNotFoundError({ slug }));
            }

            return result[0]!;
          }),
          Effect.catchAll((error) => {
            if (error instanceof CourseNotFoundError) {
              return Effect.fail(error);
            }
            // Convert SqlError to CourseNotFoundError
            return Effect.fail(new CourseNotFoundError({ slug }));
          })
        ),

      upsert: (
        slug: string,
        title: string,
        description: string,
        author: string | null,
        tags: string[] | null
      ): Effect.Effect<Course, CourseSaveError> =>
        pipe(
          Effect.gen(function* () {
            const result = yield* sql<Course>`
              INSERT INTO courses (slug, title, description, author, tags)
              VALUES (
                ${slug},
                ${title},
                ${description},
                ${author},
                ${JSON.stringify(tags)}::jsonb
              )
              ON CONFLICT (slug)
              DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                author = EXCLUDED.author,
                tags = EXCLUDED.tags,
                updated_at = CURRENT_TIMESTAMP
              RETURNING *
            `;

            if (result.length === 0) {
              return yield* Effect.fail(
                new CourseSaveError({
                  message: "Failed to upsert course",
                  cause: "No rows returned",
                })
              );
            }

            return result[0]!;
          }),
          Effect.catchAll((error) => {
            if (error instanceof CourseSaveError) {
              return Effect.fail(error);
            }
            return Effect.fail(
              new CourseSaveError({
                message: "Failed to upsert course",
                cause: error,
              })
            );
          })
        ),

      deleteBySlug: (slug: string): Effect.Effect<void, CourseSaveError> =>
        pipe(
          Effect.gen(function* () {
            yield* sql`DELETE FROM courses WHERE slug = ${slug}`;
          }),
          Effect.catchAll((error) =>
            Effect.fail(
              new CourseSaveError({
                message: "Failed to delete course",
                cause: error,
              })
            )
          )
        ),

      getAllSlugs: (): Effect.Effect<string[], CourseSaveError> =>
        pipe(
          Effect.gen(function* () {
            const result = yield* sql<{ slug: string }>`
              SELECT slug FROM courses
            `;
            return result.map((r) => r.slug);
          }),
          Effect.catchAll((error) =>
            Effect.fail(
              new CourseSaveError({
                message: "Failed to get course slugs",
                cause: error,
              })
            )
          )
        ),
    };
  })
);
