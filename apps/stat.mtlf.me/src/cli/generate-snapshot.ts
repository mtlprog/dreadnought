#!/usr/bin/env bun

import { Effect, Layer, pipe } from "effect";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { PgLive } from "@/lib/db/pg-client";
import {
  FundSnapshotRepositoryLive,
  FundSnapshotRepositoryTag,
} from "@/lib/db/fund-snapshot-repository";
import {
  SnapshotGeneratorServiceLive,
  SnapshotGeneratorServiceTag,
} from "@/lib/services/snapshot-generator-service";
import {
  FundStructureServiceLive,
  AssetValuationServiceLive,
  ExternalPriceServiceLive,
  PortfolioServiceLive,
  PriceServiceLive,
} from "@/lib/stellar";

// CLI arguments
const args = process.argv.slice(2);
const entitySlug = args[0] ?? "mtlf";
const snapshotDate = args[1]; // Optional: YYYY-MM-DD format

const program = pipe(
  Effect.gen(function* () {
    yield* Effect.log(`=== Snapshot Generator ===`);
    yield* Effect.log(`Entity: ${entitySlug}`);
    yield* Effect.log(`Date: ${snapshotDate ?? "today (default)"}`);
    yield* Effect.log("");

    const generator = yield* SnapshotGeneratorServiceTag;

    const result = yield* generator.generateSnapshot(entitySlug, snapshotDate);

    yield* Effect.log("");
    yield* Effect.log("=== Snapshot Generated Successfully ===");
    yield* Effect.log(`Accounts: ${result.aggregatedTotals.accountCount}`);
    yield* Effect.log(`Tokens: ${result.aggregatedTotals.tokenCount}`);
    yield* Effect.log(`Total EURMTL: ${result.aggregatedTotals.totalEURMTL.toFixed(2)}`);
    yield* Effect.log(`Total XLM: ${result.aggregatedTotals.totalXLM.toFixed(7)}`);

    return result;
  }),
  Effect.provide(SnapshotGeneratorServiceLive),
  Effect.provide(FundSnapshotRepositoryLive),
  Effect.provide(PgLive),
  Effect.provide(FundStructureServiceLive),
  Effect.provide(Layer.mergeAll(
    PortfolioServiceLive,
    PriceServiceLive,
    AssetValuationServiceLive,
    ExternalPriceServiceLive,
  )),
  Effect.provide(NodeContext.layer),
  Effect.catchAll((error) =>
    pipe(
      Effect.logError(`Snapshot generation failed: ${error}`),
      Effect.flatMap(() => Effect.fail(error)),
    )
  ),
);

NodeRuntime.runMain(program);
