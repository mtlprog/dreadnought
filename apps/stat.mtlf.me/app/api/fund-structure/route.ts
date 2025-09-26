import {
  FundStructureServiceLive,
  FundStructureServiceTag,
  PortfolioServiceLive,
  PriceServiceLive,
} from "@/lib/stellar";
import { Effect, Layer, pipe } from "effect";
import { NextResponse } from "next/server";

const fetchFundStructure = () =>
  pipe(
    FundStructureServiceTag,
    Effect.flatMap((service) => service.getFundStructure()),
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

const AppLayer = Layer.merge(
  FundStructureServiceLive,
  Layer.merge(PortfolioServiceLive, PriceServiceLive),
);

export async function GET() {
  const program = pipe(
    fetchFundStructure(),
    Effect.provide(AppLayer),
    Effect.map(result => NextResponse.json(result)),
    Effect.catchAll(error => Effect.succeed(NextResponse.json(error, { status: 500 }))),
  );

  return Effect.runPromise(program as Effect.Effect<NextResponse, never, never>);
}
