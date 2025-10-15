# PostgreSQL Integration with Effect-TS

Complete guide for integrating PostgreSQL with Effect-TS using `@effect/sql` and `@effect/sql-pg`.

**Based on**: Real implementation experience with stat.mtlf.me (2025)

## Overview

**What you'll learn**:
- Setting up PostgreSQL with Effect layers
- Writing migrations with Effect
- Repository pattern with Effect services
- CLI tools for database operations
- Next.js API route integration (and pitfalls)
- All common errors and their solutions

**Core packages**:
- `@effect/sql` - Generic SQL interface
- `@effect/sql-pg` - PostgreSQL adapter with postgres.js
- `postgres` - Direct PostgreSQL client (for Next.js API routes)

## Table of Contents

1. [Dependency Management](#dependency-management)
2. [Database Client Setup](#database-client-setup)
3. [Migration Pattern](#migration-pattern)
4. [Repository Pattern](#repository-pattern)
5. [CLI Scripts](#cli-scripts)
6. [Next.js Integration](#nextjs-integration)
7. [Common Pitfalls](#common-pitfalls)

---

## Dependency Management

### CRITICAL: Use Catalog for Version Consistency

**Problem**: Version mismatches between Effect packages cause cryptic errors like `"undefined is not an object (evaluating 'newValue.locals')"`.

**Solution**: Add all Effect packages to `catalog` in root `package.json`:

```json
{
  "catalogs": {
    "default": {
      "effect": "latest",
      "@effect/platform": "latest",
      "@effect/platform-node": "latest",
      "@effect/schema": "latest",
      "@effect/sql": "latest",
      "@effect/sql-pg": "latest"
    }
  }
}
```

In app `package.json`, use `catalog:default`:

```json
{
  "dependencies": {
    "effect": "catalog:default",
    "@effect/platform": "catalog:default",
    "@effect/platform-node": "catalog:default",
    "@effect/schema": "catalog:default",
    "@effect/sql": "catalog:default",
    "@effect/sql-pg": "catalog:default",
    "postgres": "^3.4.5"
  }
}
```

**Why**: Ensures all packages share the same Effect version, preventing type incompatibilities.

---

## Database Client Setup

### PgClient Layer Configuration

**Location**: `src/lib/db/pg-client.ts`

```typescript
import { Redacted } from "effect";
import { PgClient } from "@effect/sql-pg";

export const PgLive = PgClient.layer({
  url: Redacted.make(process.env.DATABASE_URL!),
});

export { PgClient };
```

**Key points**:
- Use `Redacted.make()` for sensitive data (database URLs, passwords)
- Simple layer creation for direct environment variable usage
- Export `PgClient` for use in other modules

### Alternative: Config-based Setup

For more complex configuration with separate parameters:

```typescript
import { Config, Layer } from "effect";
import { PgClient } from "@effect/sql-pg";

export const PgLive = PgClient.layerConfig({
  password: Config.redacted("DATABASE_PASSWORD"),
  username: Config.succeed("postgres"),
  database: Config.succeed("mydb"),
  host: Config.succeed("localhost"),
  port: Config.succeed(5432),
});
```

### Environment Variables

`.env` file:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

**Note**: Effect has built-in dotenv support via `PlatformConfigProvider.fromDotEnv()`.

---

## Migration Pattern

### Migration File Structure

**Location**: `src/lib/db/migrations/0001_initial_schema.ts`

**CRITICAL**: Use `Effect.flatMap(SqlClient.SqlClient, ...)` pattern, NOT `PgClient.PgClient`:

```typescript
import { Effect } from "effect";
import { SqlClient } from "@effect/sql";

export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) => Effect.gen(function* () {
    // Create tables
    yield* sql`
      CREATE TABLE IF NOT EXISTS fund_entities (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    yield* sql`
      CREATE TABLE IF NOT EXISTS fund_snapshots (
        id SERIAL PRIMARY KEY,
        entity_id INTEGER NOT NULL REFERENCES fund_entities(id) ON DELETE CASCADE,
        snapshot_date DATE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (entity_id, snapshot_date)
      )
    `;

    // Create indexes
    yield* sql`
      CREATE INDEX IF NOT EXISTS idx_fund_snapshots_entity_date
      ON fund_snapshots(entity_id, snapshot_date DESC)
    `;

    // GIN index for JSONB queries
    yield* sql`
      CREATE INDEX IF NOT EXISTS idx_fund_snapshots_data
      ON fund_snapshots USING GIN (data)
    `;

    // Insert default data
    yield* sql`
      INSERT INTO fund_entities (slug, name, description)
      VALUES ('mtlf', 'Montelibero Fund', 'Fund description')
      ON CONFLICT (slug) DO NOTHING
    `;
  })
);
```

**Key points**:
- Export `Effect.flatMap(SqlClient.SqlClient, ...)` as default
- Use `Effect.gen` for sequential operations
- Use `yield*` for each SQL query
- Use `IF NOT EXISTS` for idempotency
- Use `ON CONFLICT` for upserts

### Migration Runner Script

**Location**: `src/cli/migrate.ts`

```typescript
#!/usr/bin/env bun

import { Effect, Layer, pipe } from "effect";
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

    const pg = yield* PgClient.PgClient;
    yield* Effect.log("PgClient obtained successfully");

    // Run migrations
    yield* migration0001;
    yield* Effect.log("Migration executed successfully");

    // Verify results
    const tables = yield* pg<{ tablename: string }>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    yield* Effect.log(`Tables: ${tables.map(t => t.tablename).join(", ")}`);
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
```

**Run migrations**:

```bash
bun run db:migrate
```

---

## Repository Pattern

### Repository Service Definition

**Location**: `src/lib/db/fund-snapshot-repository.ts`

```typescript
import { Context, Effect, Layer, pipe } from "effect";
import { PgClient } from "@effect/sql-pg";
import * as S from "@effect/schema/Schema";

// Error types with Schema
export class FundSnapshotNotFoundError extends S.TaggedError<FundSnapshotNotFoundError>()(
  "FundSnapshotNotFoundError",
  {
    entitySlug: S.String,
    date: S.String,
  }
) {}

export class FundSnapshotSaveError extends S.TaggedError<FundSnapshotSaveError>()(
  "FundSnapshotSaveError",
  {
    message: S.String,
    cause: S.Unknown,
  }
) {}

// Service interface
export interface FundSnapshotRepository {
  readonly saveSnapshot: (
    entitySlug: string,
    date: string,
    data: FundStructureData
  ) => Effect.Effect<void, FundSnapshotSaveError | FundEntityNotFoundError>;

  readonly getLatestSnapshot: (
    entitySlug: string
  ) => Effect.Effect<FundStructureData, FundSnapshotNotFoundError>;
}

// Service tag
export const FundSnapshotRepositoryTag = Context.GenericTag<FundSnapshotRepository>(
  "@app/FundSnapshotRepository"
);

// Implementation
export const FundSnapshotRepositoryLive = Layer.effect(
  FundSnapshotRepositoryTag,
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;

    return {
      saveSnapshot: (entitySlug: string, date: string, data: FundStructureData) =>
        pipe(
          Effect.gen(function* () {
            // Get entity ID
            const entityResult = yield* sql<{ id: number }>`
              SELECT id FROM fund_entities WHERE slug = ${entitySlug}
            `;

            if (entityResult.length === 0) {
              return yield* Effect.fail(
                new FundEntityNotFoundError({ entitySlug })
              );
            }

            const entityId = entityResult[0].id;

            // Insert or update snapshot
            yield* sql`
              INSERT INTO fund_snapshots (entity_id, snapshot_date, data)
              VALUES (${entityId}, ${date}, ${JSON.stringify(data)}::jsonb)
              ON CONFLICT (entity_id, snapshot_date)
              DO UPDATE SET data = ${JSON.stringify(data)}::jsonb
            `;

            yield* Effect.log(`Snapshot saved for ${entitySlug} on ${date}`);
          }),
          Effect.catchAll((error) => {
            if (error instanceof FundEntityNotFoundError) {
              return Effect.fail(error);
            }
            return Effect.fail(
              new FundSnapshotSaveError({
                message: "Failed to save snapshot",
                cause: error,
              })
            );
          })
        ),

      getLatestSnapshot: (entitySlug: string) =>
        pipe(
          Effect.gen(function* () {
            const result = yield* sql<{ data: FundStructureData }>`
              SELECT fs.data
              FROM fund_snapshots fs
              JOIN fund_entities fe ON fs.entity_id = fe.id
              WHERE fe.slug = ${entitySlug}
              ORDER BY fs.snapshot_date DESC
              LIMIT 1
            `;

            if (result.length === 0) {
              return yield* Effect.fail(
                new FundSnapshotNotFoundError({
                  entitySlug,
                  date: "latest",
                })
              );
            }

            return result[0].data;
          })
        ),
    };
  })
);
```

**Key points**:
- Use `S.TaggedError` for typed errors
- Create service interface with Effect.Effect return types
- Use `Context.GenericTag` for dependency injection
- Implement with `Layer.effect` + `Effect.gen`
- Access `PgClient.PgClient` via `yield*`
- Use template literal syntax for SQL queries
- Interpolate values with `${value}` - they're automatically parameterized
- Cast JSONB with `::jsonb` when inserting stringified JSON

---

## CLI Scripts

### Service Composition in CLI

**Location**: `src/cli/generate-snapshot.ts`

```typescript
#!/usr/bin/env bun

import { Effect, Layer, pipe } from "effect";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { PgLive } from "@/lib/db/pg-client";
import { FundSnapshotRepositoryLive, FundSnapshotRepositoryTag } from "@/lib/db/fund-snapshot-repository";
import { SnapshotGeneratorServiceLive, SnapshotGeneratorServiceTag } from "@/lib/services/snapshot-generator-service";

const program = pipe(
  Effect.gen(function* () {
    yield* Effect.log("=== Snapshot Generator ===");

    const generator = yield* SnapshotGeneratorServiceTag;
    const result = yield* generator.generateSnapshot("mtlf");

    yield* Effect.log(`Snapshot generated successfully`);
    yield* Effect.log(`Accounts: ${result.aggregatedTotals.accountCount}`);
    yield* Effect.log(`Tokens: ${result.aggregatedTotals.tokenCount}`);

    return result;
  }),
  // Provide layers in dependency order
  Effect.provide(SnapshotGeneratorServiceLive),
  Effect.provide(FundSnapshotRepositoryLive),
  Effect.provide(PgLive),
  Effect.provide(NodeContext.layer),
  Effect.catchAll((error) =>
    pipe(
      Effect.logError(`Snapshot generation failed: ${error}`),
      Effect.flatMap(() => Effect.fail(error)),
    )
  ),
);

NodeRuntime.runMain(program);
```

**Package.json script**:

```json
{
  "scripts": {
    "db:snapshot": "bun run src/cli/generate-snapshot.ts"
  }
}
```

**Run**:

```bash
bun run db:snapshot
```

**Key points**:
- Use `#!/usr/bin/env bun` shebang for direct execution
- Provide layers in dependency order (bottom to top)
- Use `NodeRuntime.runMain` for CLI entry point
- Use `NodeContext.layer` for Node.js runtime
- Handle errors with `Effect.catchAll`

---

## Next.js Integration

### THE PROBLEM: Effect Layers Don't Work in Next.js API Routes

**Error**: `"Service not found: @effect/sql-pg/PgClient"`

**Root cause**: Next.js webpack module isolation prevents proper Effect layer resolution in API routes.

**Attempted solutions that FAILED**:
- ❌ Importing `PgLive` from separate file
- ❌ Creating inline `PgClient.layer()`
- ❌ Using `Layer.mergeAll()`
- ❌ Using `ConfigProvider.fromEnv()`

### THE SOLUTION: Use postgres.js Directly

**Location**: `app/api/fund-structure/route.ts`

```typescript
import postgres from "postgres";
import { NextResponse } from "next/server";
import type { FundStructureData } from "@/lib/stellar/fund-structure-service";

// Direct database access without Effect layers
const sql = postgres(process.env.DATABASE_URL!, {
  max: 1, // Single connection for API route
});

// Cache for 1 hour since data is in DB and updated daily
export const revalidate = 3600;

export async function GET() {
  try {
    console.log("Fetching fund structure from database...");

    // Get entity ID
    const entities = await sql<Array<{ id: number }>>`
      SELECT id FROM fund_entities WHERE slug = 'mtlf'
    `;

    if (entities.length === 0) {
      return NextResponse.json(
        { error: "Fund entity not found" },
        { status: 404 }
      );
    }

    const entityId = entities[0].id;

    // Get latest snapshot
    const snapshots = await sql<Array<{ data: FundStructureData }>>`
      SELECT data
      FROM fund_snapshots
      WHERE entity_id = ${entityId}
      ORDER BY snapshot_date DESC
      LIMIT 1
    `;

    if (snapshots.length === 0) {
      return NextResponse.json(
        { error: "No snapshot data available" },
        { status: 404 }
      );
    }

    console.log("Fund structure data fetched from database successfully");

    // CRITICAL: Parse JSONB if it's a string
    const data = typeof snapshots[0].data === 'string'
      ? JSON.parse(snapshots[0].data)
      : snapshots[0].data;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Fund structure API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch fund structure data",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
```

**Key points**:
- Use `postgres` directly, not `@effect/sql-pg`
- Create single connection pool per API route
- Use `revalidate` for Next.js caching
- **CRITICAL**: postgres.js returns JSONB as strings - parse before returning
- Use same template literal syntax as Effect SQL

### Why This Matters

**Performance comparison**:
- Direct Stellar API calls: 90-150 seconds
- PostgreSQL cached data: ~1 second
- **Improvement**: ~100x faster

**Architecture**:
- CLI scripts: Use full Effect-TS with layers
- API routes: Use direct postgres.js
- Repositories: Effect-TS for business logic
- Snapshots: Generated via CLI, served via API

---

## Common Pitfalls

### 1. Version Mismatch Errors

**Error**: `"undefined is not an object (evaluating 'newValue.locals')"`

**Cause**: Different versions of Effect packages across workspace

**Fix**: Use catalog in root package.json, `catalog:default` in all apps

### 2. Wrong Client in Migrations

**Error**: `"Service not found: @effect/sql/SqlClient"`

**Cause**: Using `PgClient.PgClient` instead of `SqlClient.SqlClient` in migration

**Fix**: Always use `Effect.flatMap(SqlClient.SqlClient, ...)` in migrations

### 3. Effect Layers in Next.js

**Error**: `"Service not found: @effect/sql-pg/PgClient"`

**Cause**: Next.js webpack doesn't support Effect layers in API routes

**Fix**: Use `postgres` directly in API routes, not `@effect/sql-pg`

### 4. JSONB String vs Object

**Error**: Schema validation fails with "Invalid fund structure data format"

**Cause**: postgres.js returns JSONB columns as strings, not parsed objects

**Fix**: Parse JSONB before returning: `JSON.parse(data)` if `typeof data === 'string'`

### 5. Redacted Configuration

**Error**: `"Unable to get redacted value"`

**Cause**: Using `Config.redacted()` with `Layer.unwrapEffect`

**Fix**: Use `Redacted.make(process.env.DATABASE_URL!)` directly

### 6. Missing NodeContext

**Error**: Program hangs or fails silently in CLI

**Cause**: Missing `NodeContext.layer` in layer composition

**Fix**: Always include `Effect.provide(NodeContext.layer)` for CLI scripts

### 7. Layer Order

**Error**: `"Service not found"` even though layer is provided

**Cause**: Layers provided in wrong order (dependencies must be provided last)

**Fix**: Provide layers bottom-to-top: app services → repositories → database → platform

```typescript
pipe(
  program,
  Effect.provide(AppServiceLive),      // Top: depends on repository
  Effect.provide(RepositoryLive),      // Middle: depends on database
  Effect.provide(PgLive),              // Bottom: no dependencies
  Effect.provide(NodeContext.layer)    // Platform: always last
)
```

---

## Best Practices

### 1. Typed Errors

Always use `S.TaggedError` for domain errors:

```typescript
export class NotFoundError extends S.TaggedError<NotFoundError>()(
  "NotFoundError",
  {
    id: S.String,
    resource: S.String,
  }
) {}
```

### 2. JSONB Storage

Store complex objects as JSONB for flexibility:

```typescript
yield* sql`
  INSERT INTO table (data)
  VALUES (${JSON.stringify(obj)}::jsonb)
`;
```

Create GIN indexes for JSONB queries:

```sql
CREATE INDEX idx_data ON table USING GIN (data);
```

### 3. Upserts

Use `ON CONFLICT` for idempotent operations:

```typescript
yield* sql`
  INSERT INTO table (key, value)
  VALUES (${key}, ${value})
  ON CONFLICT (key) DO UPDATE SET value = ${value}
`;
```

### 4. Transactions

Wrap related operations in transactions:

```typescript
const result = yield* sql.withTransaction((tx) =>
  Effect.gen(function* () {
    yield* tx`INSERT INTO table1 ...`;
    yield* tx`INSERT INTO table2 ...`;
    return { success: true };
  })
);
```

### 5. Connection Pooling

**CLI scripts**: Use default pooling from PgClient

**API routes**: Use minimal connections (`max: 1`) since serverless

### 6. Environment Variables

Use `.env` files for development:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/db
```

Use platform environment for production (Railway, Vercel, etc.)

### 7. Schema Validation

Validate JSONB data on retrieval:

```typescript
const schema = S.Struct({
  accounts: S.Array(S.Unknown),
  totals: S.Struct({
    total: S.Number,
    count: S.Number,
  }),
});

const validated = S.decodeUnknownSync(schema)(data);
```

---

## Testing

### Repository Testing Pattern

```typescript
import { ManagedRuntime } from "effect";
import { describe, test, expect } from "bun:test";

describe("FundSnapshotRepository", () => {
  test("should save and retrieve snapshot", async () => {
    const testRuntime = ManagedRuntime.make(
      Layer.mergeAll(
        FundSnapshotRepositoryLive,
        PgLive,
        NodeContext.layer
      )
    );

    try {
      const program = Effect.gen(function* () {
        const repo = yield* FundSnapshotRepositoryTag;

        yield* repo.saveSnapshot("test", "2025-01-01", mockData);
        const result = yield* repo.getLatestSnapshot("test");

        return result;
      });

      const result = await testRuntime.runPromise(program);
      expect(result).toBeDefined();
    } finally {
      await testRuntime.dispose(); // CRITICAL!
    }
  });
});
```

**Key points**:
- Use `ManagedRuntime.make()` for tests
- Always `dispose()` in finally block
- Create new runtime per test (no reuse)

---

## Summary

**Effect-TS + PostgreSQL Architecture**:
- ✅ **CLI Scripts**: Full Effect with layers (migrations, snapshots)
- ✅ **Repositories**: Effect services with PgClient
- ✅ **Business Logic**: Effect services composing repositories
- ✅ **API Routes**: Direct postgres.js (Next.js limitation)
- ✅ **Testing**: ManagedRuntime with proper disposal

**Performance**:
- CLI snapshots: Generate data from Stellar (90-150s)
- API routes: Serve cached data from PostgreSQL (<1s)
- 100x performance improvement for end users

**Key Learnings**:
1. Catalog prevents version hell
2. SqlClient for migrations, PgClient for services
3. Next.js needs direct postgres.js, not Effect layers
4. JSONB needs parsing when retrieved
5. Layer order matters: dependencies last
6. Always dispose ManagedRuntime in tests

**Next Steps**:
- Set up daily cron job for `bun run db:snapshot`
- Monitor database size and add cleanup scripts
- Consider read replicas for scaling
- Add historical data queries and analytics
