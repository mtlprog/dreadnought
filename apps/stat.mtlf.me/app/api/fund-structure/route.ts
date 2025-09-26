import {
  FundStructureServiceLive,
  FundStructureServiceTag,
  PortfolioServiceLive,
  PriceServiceLive,
} from "@/lib/stellar";
import { Effect, Layer, pipe } from "effect";
import { NextResponse } from "next/server";

const AppLayer = Layer.merge(
  Layer.merge(PortfolioServiceLive, PriceServiceLive),
  FundStructureServiceLive,
);

const fetchFundStructure = () =>
  pipe(
    FundStructureServiceTag,
    Effect.flatMap((service) => service.getFundStructure()),
    Effect.provide(AppLayer),
    Effect.tap(() => Effect.log("Fund structure data fetched successfully")),
    Effect.catchAll((error) =>
      pipe(
        Effect.log(`Fund structure API error: ${error}`),
        Effect.flatMap(() =>
          Effect.fail({
            error: "Failed to fetch fund structure data",
            message: error instanceof Error ? error.message : "Unknown error occurred",
            details: error instanceof Error && error.stack !== undefined ? error.stack : String(error),
          })
        ),
      )
    ),
  );

export async function GET() {
  const program = pipe(
    fetchFundStructure(),
    Effect.map(result => NextResponse.json(result)),
    Effect.catchAll(error => Effect.succeed(NextResponse.json(error, { status: 500 }))),
  );

  return Effect.runPromise(program);
}
