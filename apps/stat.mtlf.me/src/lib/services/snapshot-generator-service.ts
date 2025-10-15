import { Context, Effect, Layer, pipe } from "effect";
import {
  FundStructureServiceTag,
  type FundStructureData,
} from "@/lib/stellar/fund-structure-service";
import {
  FundSnapshotRepositoryTag,
} from "@/lib/db/fund-snapshot-repository";
import * as S from "@effect/schema/Schema";

// Error types
export class SnapshotGenerationError extends S.TaggedError<SnapshotGenerationError>()(
  "SnapshotGenerationError",
  {
    message: S.String,
    cause: S.Unknown,
  }
) {}

// Service interface - return Effect without Requirements since they're provided by Layer
export interface SnapshotGeneratorService {
  readonly generateSnapshot: (
    entitySlug: string,
    date?: string
  ) => Effect.Effect<FundStructureData, SnapshotGenerationError, never>;
}

export const SnapshotGeneratorServiceTag = Context.GenericTag<SnapshotGeneratorService>(
  "@stat.mtlf.me/SnapshotGeneratorService"
);

// Implementation
export const SnapshotGeneratorServiceLive = Layer.effect(
  SnapshotGeneratorServiceTag,
  Effect.gen(function* () {
    const fundStructureService = yield* FundStructureServiceTag;
    const snapshotRepository = yield* FundSnapshotRepositoryTag;

    return {
      generateSnapshot: (entitySlug: string, date?: string): Effect.Effect<FundStructureData, SnapshotGenerationError, never> =>
        pipe(
          Effect.gen(function* () {
            // Default to today's date if not provided
            const snapshotDate: string = date ?? new Date().toISOString().split("T")[0] ?? "";

            yield* Effect.log(`Generating snapshot for ${entitySlug} on ${snapshotDate}...`);

            // Fetch current fund structure from Stellar
            const fundData = yield* fundStructureService.getFundStructure();

            yield* Effect.log("Fund structure data fetched successfully");

            // Save to database
            yield* snapshotRepository.saveSnapshot(entitySlug, snapshotDate, fundData);

            yield* Effect.log(`Snapshot saved for ${entitySlug} on ${snapshotDate}`);

            return fundData;
          }),
          Effect.catchAll((error) =>
            Effect.fail(
              new SnapshotGenerationError({
                message: `Failed to generate snapshot for ${entitySlug}`,
                cause: error,
              })
            )
          )
        ) as Effect.Effect<FundStructureData, SnapshotGenerationError, never>,
    };
  })
);
