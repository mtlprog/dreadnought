import { FundingServiceLive, FundingServiceTag } from "@/lib/stellar";
import * as S from "@effect/schema/Schema";
import { Effect, Layer, pipe } from "effect";
import { NextRequest, NextResponse } from "next/server";

// Request schema
const FundingRequestSchema = S.Struct({
  userAccountId: S.String,
  projectCode: S.String,
  amount: S.String,
});
type FundingRequest = S.Schema.Type<typeof FundingRequestSchema>;

// Response schemas
const FundingSuccessSchema = S.Struct({
  success: S.Literal(true),
  transactionXDR: S.String,
});

const FundingErrorSchema = S.Struct({
  success: S.Literal(false),
  error: S.String,
});

const FundingResponseSchema = S.Union(FundingSuccessSchema, FundingErrorSchema);
type FundingResponse = S.Schema.Type<typeof FundingResponseSchema>;

const AppLayer = Layer.mergeAll(FundingServiceLive);

export async function POST(request: NextRequest): Promise<NextResponse<FundingResponse>> {
  const program = pipe(
    Effect.gen(function* () {
      // Parse request body
      const body = yield* Effect.tryPromise({
        try: () => request.json(),
        catch: () => new Error("Invalid JSON body"),
      });

      // Validate request schema
      const validatedRequest = yield* pipe(
        S.decodeUnknown(FundingRequestSchema)(body),
        Effect.mapError(() => new Error("Invalid request format")),
      );

      // Create funding transaction
      const transactionXDR = yield* pipe(
        FundingServiceTag,
        Effect.flatMap((service) =>
          service.createFundingTransaction(
            validatedRequest.userAccountId,
            validatedRequest.projectCode,
            validatedRequest.amount,
          )
        ),
      );

      return NextResponse.json({
        success: true,
        transactionXDR,
      } as FundingResponse);
    }),
    Effect.catchAll((error) =>
      Effect.succeed(
        NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
          } as FundingResponse,
          { status: 400 }
        )
      )
    ),
    Effect.provide(AppLayer),
  );

  return await Effect.runPromise(program);
}
