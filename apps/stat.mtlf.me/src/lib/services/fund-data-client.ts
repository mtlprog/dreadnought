import { FundDataFetchError, FundDataNetworkError, FundDataParseError } from "@/lib/errors/fund-data-errors";
import type { FundStructureData } from "@/lib/stellar/fund-structure-service";
import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer, pipe } from "effect";

export interface FundDataClient {
  readonly fetchFundStructure: () => Effect.Effect<
    FundStructureData,
    FundDataFetchError | FundDataParseError | FundDataNetworkError
  >;
}

export const FundDataClientTag = Context.GenericTag<FundDataClient>("@stat.mtlf.me/FundDataClient");

// Schema for validating API responses
const FundStructureDataSchema = S.Struct({
  accounts: S.Array(S.Unknown), // Simplified for now, could be more specific
  aggregatedTotals: S.Struct({
    totalEURMTL: S.Number,
    totalXLM: S.Number,
    accountCount: S.Number,
    tokenCount: S.Number,
  }),
});

export const FundDataClientLive = Layer.succeed(
  FundDataClientTag,
  {
    fetchFundStructure: () =>
      pipe(
        Effect.tryPromise({
          try: () => fetch("/api/fund-structure"),
          catch: (error) =>
            new FundDataNetworkError({
              message: "Failed to connect to fund structure API",
              cause: error,
            }),
        }),
        Effect.flatMap((response) => {
          if (!response.ok) {
            return Effect.fail(
              new FundDataFetchError({
                status: response.status,
                message: `HTTP error! status: ${response.status}`,
              }),
            );
          }
          return Effect.succeed(response);
        }),
        Effect.flatMap((response) =>
          pipe(
            Effect.tryPromise({
              try: () => response.json(),
              catch: (error) =>
                new FundDataParseError({
                  message: "Failed to parse JSON response",
                  cause: error,
                }),
            }),
            Effect.flatMap((data) =>
              Effect.try({
                try: () => S.decodeUnknownSync(FundStructureDataSchema)(data) as FundStructureData,
                catch: (error) =>
                  new FundDataParseError({
                    message: "Invalid fund structure data format",
                    cause: error,
                  }),
              })
            ),
          )
        ),
        Effect.tap(() => Effect.log("Fund structure data fetched successfully")),
      ),
  },
);
