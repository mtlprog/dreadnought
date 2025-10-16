import { Context, Effect, Layer, pipe } from "effect";
import { FileSystem } from "@effect/platform";
import * as S from "@effect/schema/Schema";
import { join } from "node:path";
import { CourseRepositoryTag } from "@/lib/db/repositories/course-repository";
import { LessonRepositoryTag } from "@/lib/db/repositories/lesson-repository";
import { CourseMetadata } from "@/lib/types";

// Errors
export class CourseParseError extends S.TaggedError<CourseParseError>()(
  "CourseParseError",
  {
    message: S.String,
    cause: S.Unknown,
  }
) {}

export interface ParseResult {
  coursesProcessed: number;
  lessonsProcessed: number;
  coursesDeleted: number;
}

// Service interface
export interface CourseParserService {
  readonly parseAllCourses: () => Effect.Effect<
    ParseResult,
    CourseParseError
  >;

  readonly parseCourse: (
    courseSlug: string
  ) => Effect.Effect<number, CourseParseError>; // Returns lesson count
}

// Service tag
export const CourseParserServiceTag =
  Context.GenericTag<CourseParserService>("@app/CourseParserService");

// Implementation
export const CourseParserServiceLive = Layer.effect(
  CourseParserServiceTag,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const courseRepo = yield* CourseRepositoryTag;
    const lessonRepo = yield* LessonRepositoryTag;

    // Helper: Read metadata.json
    const readMetadata = (coursePath: string) =>
      pipe(
        fs.readFileString(join(coursePath, "metadata.json")),
        Effect.flatMap((content) =>
          Effect.try({
            try: () => JSON.parse(content),
            catch: (error) =>
              new CourseParseError({
                message: "Failed to parse metadata.json",
                cause: error,
              }),
          })
        ),
        Effect.flatMap((data) =>
          S.decodeUnknown(CourseMetadata)(data, { errors: "all" })
        ),
        Effect.mapError(
          (error) =>
            new CourseParseError({
              message: "Invalid metadata.json schema",
              cause: error,
            })
        )
      );

    // Helper: Read lesson markdown
    const readLessonMarkdown = (coursePath: string, filename: string) =>
      pipe(
        fs.readFileString(join(coursePath, filename)),
        Effect.mapError(
          (error) =>
            new CourseParseError({
              message: `Failed to read ${filename}`,
              cause: error,
            })
        )
      );

    // Helper: Extract lesson slug from filename
    const getLessonSlugFromFilename = (filename: string): string => {
      // "01-welcome.md" → "welcome"
      return filename.replace(/^\d+-/, "").replace(/\.md$/, "");
    };

    // Parse single course
    const parseCourse = (courseSlug: string) =>
      pipe(
        Effect.gen(function* () {
          const coursesDir = join(process.cwd(), "courses");
          const coursePath = join(coursesDir, courseSlug);

          // Read metadata
          const metadata = yield* readMetadata(coursePath);

          // Upsert course
          const course = yield* courseRepo.upsert(
            metadata.slug,
            metadata.title,
            metadata.description,
            metadata.author ?? null,
            metadata.tags ? [...metadata.tags] : null
          );

          yield* Effect.log(
            `Course upserted: ${metadata.slug} (ID: ${course.id})`
          );

          // Read and upsert lessons
          let lessonsProcessed = 0;

          for (let i = 0; i < metadata.lessons.length; i++) {
            const lessonMeta = metadata.lessons[i];
            if (!lessonMeta) continue;

            // Find matching .md file (e.g., "01-welcome.md")
            const files = yield* fs.readDirectory(coursePath);

            const mdFile = files.find((file) => {
              const slug = getLessonSlugFromFilename(file);
              return slug === lessonMeta.slug && file.endsWith(".md");
            });

            if (!mdFile) {
              yield* Effect.logWarning(
                `Lesson file not found for ${lessonMeta.slug}, skipping`
              );
              continue;
            }

            // Read markdown
            const markdown = yield* readLessonMarkdown(coursePath, mdFile);

            // Upsert lesson
            yield* lessonRepo.upsert(
              course.id,
              lessonMeta.slug,
              lessonMeta.title,
              i + 1, // order_index (1-indexed)
              markdown
            );

            lessonsProcessed++;

            yield* Effect.log(
              `Lesson upserted: ${lessonMeta.slug} (order: ${i + 1})`
            );
          }

          return lessonsProcessed;
        }),
        Effect.catchAll((error) => {
          if (error instanceof CourseParseError) {
            return Effect.fail(error);
          }
          return Effect.fail(
            new CourseParseError({
              message: `Failed to parse course ${courseSlug}`,
              cause: error,
            })
          );
        })
      );

    // Parse all courses
    const parseAllCourses = () =>
      pipe(
        Effect.gen(function* () {
          const coursesDir = join(process.cwd(), "courses");

          // Get all course directories
          const entries = yield* fs.readDirectory(coursesDir);

          // Filter directories only
          const courseDirs = yield* Effect.all(
            entries.map((entry) =>
              pipe(
                fs.stat(join(coursesDir, entry)),
                Effect.map((stat) => (stat.type === "Directory" ? entry : null))
              )
            ),
            { concurrency: 5 }
          );

          const validCourseDirs = courseDirs.filter(
            (dir): dir is string => dir !== null
          );

          yield* Effect.log(
            `Found ${validCourseDirs.length} course directories`
          );

          // Parse each course
          let totalLessons = 0;

          for (const courseSlug of validCourseDirs) {
            const lessonCount = yield* parseCourse(courseSlug);
            totalLessons += lessonCount;
          }

          // Delete courses that no longer exist in filesystem
          const dbSlugs = yield* courseRepo.getAllSlugs();
          const fsSlugs = new Set(validCourseDirs);

          const toDelete = dbSlugs.filter((slug) => !fsSlugs.has(slug));

          for (const slug of toDelete) {
            yield* courseRepo.deleteBySlug(slug);
            yield* Effect.log(`Deleted course: ${slug}`);
          }

          return {
            coursesProcessed: validCourseDirs.length,
            lessonsProcessed: totalLessons,
            coursesDeleted: toDelete.length,
          };
        }),
        Effect.catchAll((error) => {
          if (error instanceof CourseParseError) {
            return Effect.fail(error);
          }
          return Effect.fail(
            new CourseParseError({
              message: "Failed to parse all courses",
              cause: error,
            })
          );
        })
      );

    return {
      parseAllCourses,
      parseCourse,
    };
  })
);
