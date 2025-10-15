import { Context, Effect, Layer, pipe } from "effect";
import { PgClient } from "@effect/sql-pg";
import type { FundStructureData } from "@/lib/stellar/fund-structure-service";
import * as S from "@effect/schema/Schema";

// Error types
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

export class FundEntityNotFoundError extends S.TaggedError<FundEntityNotFoundError>()(
  "FundEntityNotFoundError",
  {
    entitySlug: S.String,
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

  readonly getSnapshotByDate: (
    entitySlug: string,
    date: string
  ) => Effect.Effect<FundStructureData, FundSnapshotNotFoundError>;

  readonly listSnapshots: (
    entitySlug: string,
    limit?: number
  ) => Effect.Effect<Array<{ date: string; createdAt: Date }>, never>;
}

export const FundSnapshotRepositoryTag = Context.GenericTag<FundSnapshotRepository>(
  "@stat.mtlf.me/FundSnapshotRepository"
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

            const firstEntity = entityResult[0];
            if (!firstEntity) {
              return yield* Effect.fail(
                new FundEntityNotFoundError({ entitySlug })
              );
            }
            const entityId = firstEntity.id;

            // Insert or update snapshot
            yield* sql`
              INSERT INTO fund_snapshots (entity_id, snapshot_date, data)
              VALUES (${entityId}, ${date}, ${JSON.stringify(data)}::jsonb)
              ON CONFLICT (entity_id, snapshot_date)
              DO UPDATE SET data = ${JSON.stringify(data)}::jsonb
            `;

            yield* Effect.log(`Snapshot saved for ${entitySlug} on ${date}`);
          }),
          Effect.catchAll((error): Effect.Effect<void, FundSnapshotSaveError | FundEntityNotFoundError> => {
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

            const firstResult = result[0];
            if (!firstResult) {
              return yield* Effect.fail(
                new FundSnapshotNotFoundError({
                  entitySlug,
                  date: "latest",
                })
              );
            }
            return firstResult.data;
          }),
          Effect.catchAll((error): Effect.Effect<FundStructureData, FundSnapshotNotFoundError> => {
            if (error instanceof FundSnapshotNotFoundError) {
              return Effect.fail(error);
            }
            return Effect.fail(
              new FundSnapshotNotFoundError({
                entitySlug,
                date: "latest",
              })
            );
          })
        ),

      getSnapshotByDate: (entitySlug: string, date: string) =>
        pipe(
          Effect.gen(function* () {
            const result = yield* sql<{ data: FundStructureData }>`
              SELECT fs.data
              FROM fund_snapshots fs
              JOIN fund_entities fe ON fs.entity_id = fe.id
              WHERE fe.slug = ${entitySlug}
                AND fs.snapshot_date = ${date}
            `;

            if (result.length === 0) {
              return yield* Effect.fail(
                new FundSnapshotNotFoundError({
                  entitySlug,
                  date,
                })
              );
            }

            const firstResult = result[0];
            if (!firstResult) {
              return yield* Effect.fail(
                new FundSnapshotNotFoundError({
                  entitySlug,
                  date,
                })
              );
            }
            return firstResult.data;
          }),
          Effect.catchAll((error): Effect.Effect<FundStructureData, FundSnapshotNotFoundError> => {
            if (error instanceof FundSnapshotNotFoundError) {
              return Effect.fail(error);
            }
            return Effect.fail(
              new FundSnapshotNotFoundError({
                entitySlug,
                date,
              })
            );
          })
        ),

      listSnapshots: (entitySlug: string, limit = 30) =>
        pipe(
          Effect.gen(function* () {
            const result = yield* sql<{
              snapshot_date: string;
              created_at: Date;
            }>`
              SELECT fs.snapshot_date, fs.created_at
              FROM fund_snapshots fs
              JOIN fund_entities fe ON fs.entity_id = fe.id
              WHERE fe.slug = ${entitySlug}
              ORDER BY fs.snapshot_date DESC
              LIMIT ${limit}
            `;

            return result.map((row) => ({
              date: row.snapshot_date,
              createdAt: row.created_at,
            }));
          }),
          Effect.catchAll(() => Effect.succeed([]))
        ),
    };
  })
);
