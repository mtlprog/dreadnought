import { Context, Effect, Layer, pipe } from "effect";
import { PgClient } from "@effect/sql-pg";
import * as S from "@effect/schema/Schema";
import type { Lesson } from "@/lib/types";

// Errors
export class LessonSaveError extends S.TaggedError<LessonSaveError>()(
  "LessonSaveError",
  {
    message: S.String,
    cause: S.Unknown,
  }
) {}

// Service interface
export interface LessonRepository {
  readonly upsert: (
    courseId: number,
    slug: string,
    title: string,
    orderIndex: number,
    markdown: string
  ) => Effect.Effect<Lesson, LessonSaveError>;

  readonly deleteByCourseId: (
    courseId: number
  ) => Effect.Effect<void, LessonSaveError>;

  readonly deleteBySlug: (
    courseId: number,
    slug: string
  ) => Effect.Effect<void, LessonSaveError>;

  readonly getByCourseId: (
    courseId: number
  ) => Effect.Effect<Lesson[], LessonSaveError>;
}

// Service tag
export const LessonRepositoryTag =
  Context.GenericTag<LessonRepository>("@app/LessonRepository");

// Implementation
export const LessonRepositoryLive = Layer.effect(
  LessonRepositoryTag,
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;

    return {
      upsert: (
        courseId: number,
        slug: string,
        title: string,
        orderIndex: number,
        markdown: string
      ): Effect.Effect<Lesson, LessonSaveError> =>
        pipe(
          Effect.gen(function* () {
            const result = yield* sql<Lesson>`
              INSERT INTO lessons (course_id, slug, title, order_index, markdown)
              VALUES (
                ${courseId},
                ${slug},
                ${title},
                ${orderIndex},
                ${markdown}
              )
              ON CONFLICT (course_id, slug)
              DO UPDATE SET
                title = EXCLUDED.title,
                order_index = EXCLUDED.order_index,
                markdown = EXCLUDED.markdown,
                updated_at = CURRENT_TIMESTAMP
              RETURNING *
            `;

            if (result.length === 0) {
              return yield* Effect.fail(
                new LessonSaveError({
                  message: "Failed to upsert lesson",
                  cause: "No rows returned",
                })
              );
            }

            return result[0]!;
          }),
          Effect.catchAll((error) => {
            if (error instanceof LessonSaveError) {
              return Effect.fail(error);
            }
            return Effect.fail(
              new LessonSaveError({
                message: "Failed to upsert lesson",
                cause: error,
              })
            );
          })
        ),

      deleteByCourseId: (courseId: number): Effect.Effect<void, LessonSaveError> =>
        pipe(
          Effect.gen(function* () {
            yield* sql`DELETE FROM lessons WHERE course_id = ${courseId}`;
          }),
          Effect.catchAll((error) =>
            Effect.fail(
              new LessonSaveError({
                message: "Failed to delete lessons",
                cause: error,
              })
            )
          )
        ),

      deleteBySlug: (courseId: number, slug: string): Effect.Effect<void, LessonSaveError> =>
        pipe(
          Effect.gen(function* () {
            yield* sql`
              DELETE FROM lessons
              WHERE course_id = ${courseId} AND slug = ${slug}
            `;
          }),
          Effect.catchAll((error) =>
            Effect.fail(
              new LessonSaveError({
                message: "Failed to delete lesson",
                cause: error,
              })
            )
          )
        ),

      getByCourseId: (courseId: number): Effect.Effect<Lesson[], LessonSaveError> =>
        pipe(
          Effect.gen(function* () {
            const result = yield* sql<Lesson>`
              SELECT * FROM lessons
              WHERE course_id = ${courseId}
              ORDER BY order_index ASC
            `;
            return [...result];
          }),
          Effect.catchAll((error) =>
            Effect.fail(
              new LessonSaveError({
                message: "Failed to get lessons",
                cause: error,
              })
            )
          )
        ),
    };
  })
);
