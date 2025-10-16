#!/usr/bin/env bun

import { Effect, Layer, pipe, Redacted } from "effect";
import { PgClient } from "@effect/sql-pg";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import migration0001 from "@/lib/db/migrations/0001_initial_schema";

const PgLive = PgClient.layer({
  url: Redacted.make(process.env["DATABASE_URL"]!),
});

const MainLayer = Layer.mergeAll(PgLive, NodeContext.layer);

const program = pipe(
  Effect.gen(function* () {
    yield* Effect.log("=== Database Migration ===");
    yield* Effect.log("Starting migrations...");

    const pg = yield* PgClient.PgClient;
    yield* Effect.log("PgClient obtained successfully");

    // Run migration 0001
    yield* migration0001;
    yield* Effect.log("Migration 0001 executed successfully");

    // Verify tables
    const tables = yield* pg<{ tablename: string }>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    yield* Effect.log(
      `Tables created: ${tables.map((t) => t.tablename).join(", ")}`
    );

    yield* Effect.log("✓ All migrations completed successfully");
  }),
  Effect.catchAll((error) =>
    pipe(
      Effect.logError(`Migration failed: ${error}`),
      Effect.flatMap(() => Effect.fail(error))
    )
  ),
  Effect.provide(MainLayer)
);

NodeRuntime.runMain(program);
