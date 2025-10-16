#!/usr/bin/env bun

import { Effect, Layer, pipe, Redacted } from "effect";
import { PgClient } from "@effect/sql-pg";
import { NodeContext, NodeFileSystem, NodeRuntime } from "@effect/platform-node";
import {
  CourseParserServiceTag,
  CourseParserServiceLive,
} from "@/lib/services/course-parser";
import {
  CourseRepositoryLive,
} from "@/lib/db/repositories/course-repository";
import {
  LessonRepositoryLive,
} from "@/lib/db/repositories/lesson-repository";

const PgLive = PgClient.layer({
  url: Redacted.make(process.env["DATABASE_URL"]!),
});

const MainLayer = Layer.mergeAll(
  CourseParserServiceLive,
  LessonRepositoryLive,
  CourseRepositoryLive,
  PgLive,
  NodeFileSystem.layer,
  NodeContext.layer
);

const program = pipe(
  Effect.gen(function* () {
    yield* Effect.log("=== Course Parser ===");
    yield* Effect.log("Starting course parsing...");

    const parser = yield* CourseParserServiceTag;

    // Parse all courses
    const result = yield* parser.parseAllCourses();

    yield* Effect.log(`✓ Parsing complete`);
    yield* Effect.log(`  Courses processed: ${result.coursesProcessed}`);
    yield* Effect.log(`  Lessons processed: ${result.lessonsProcessed}`);
    yield* Effect.log(`  Courses deleted: ${result.coursesDeleted}`);
  }),
  Effect.catchAll((error) =>
    pipe(
      Effect.logError(`Course parsing failed: ${error}`),
      Effect.flatMap(() => Effect.fail(error))
    )
  ),
  Effect.provide(MainLayer)
);

NodeRuntime.runMain(program);
