#!/usr/bin/env bun

import { Effect, Layer, pipe, Redacted } from "effect";
import { SqlClient } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import migration0001 from "@/lib/db/migrations/0001_initial_schema";

const PgLive = PgClient.layer({
  url: Redacted.make(process.env.DATABASE_URL!),
});

const MainLayer = Layer.mergeAll(PgLive, NodeContext.layer);

const program = pipe(
  Effect.gen(function* () {
    yield* Effect.log("Starting database migrations...");

    // Get PgClient
    const pg = yield* PgClient.PgClient;
    yield* Effect.log("PgClient obtained successfully");

    // Run migration
    yield* migration0001;
    yield* Effect.log("Migration executed successfully");

    // Check tables
    const tables = yield* pg<{ tablename: string }>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    yield* Effect.log(`Tables created: ${tables.map(t => t.tablename).join(", ")}`);

    // Check entities
    const entities = yield* pg<{ slug: string; name: string }>`
      SELECT slug, name FROM fund_entities
    `;
    yield* Effect.log(`Entities: ${entities.map(e => `${e.slug} (${e.name})`).join(", ")}`);

    // Check snapshots
    const snapshots = yield* pg<{ snapshot_date: string; created_at: Date }>`
      SELECT snapshot_date::text, created_at
      FROM fund_snapshots
      ORDER BY snapshot_date DESC
      LIMIT 5
    `;
    yield* Effect.log(`Latest snapshots: ${snapshots.length}`);
    if (snapshots.length > 0) {
      yield* Effect.log(`Latest snapshot date: ${snapshots[0].snapshot_date}`);
    }
  }),
  Effect.provide(MainLayer),
  Effect.catchAll((error) =>
    pipe(
      Effect.logError(`Migration failed: ${error}`),
      Effect.flatMap(() => Effect.fail(error)),
    )
  ),
);

NodeRuntime.runMain(program);
