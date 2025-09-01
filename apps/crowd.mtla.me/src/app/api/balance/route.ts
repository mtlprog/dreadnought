import { BalanceServiceLive, BalanceServiceTag } from "@/lib/stellar";
import * as S from "@effect/schema/Schema";
import { Effect, Layer, pipe } from "effect";
import { NextRequest, NextResponse } from "next/server";

// Request schema
const BalanceRequestSchema = S.Struct({
  accountId: S.String,
});
type BalanceRequest = S.Schema.Type<typeof BalanceRequestSchema>;

// Response schemas
const BalanceSuccessSchema = S.Struct({
  success: S.Literal(true),
  balance: S.String,
});

const BalanceErrorSchema = S.Struct({
  success: S.Literal(false),
  error: S.String,
});

const BalanceResponseSchema = S.Union(BalanceSuccessSchema, BalanceErrorSchema);
type BalanceResponse = S.Schema.Type<typeof BalanceResponseSchema>;

const AppLayer = Layer.mergeAll(BalanceServiceLive);

export async function POST(request: NextRequest): Promise<NextResponse<BalanceResponse>> {
  const program = pipe(
    Effect.gen(function* () {
      // Parse request body
      const body = yield* Effect.tryPromise({
        try: () => request.json(),
        catch: () => new Error("Invalid JSON body"),
      });

      // Validate request schema
      const validatedRequest = yield* pipe(
        S.decodeUnknown(BalanceRequestSchema)(body),
        Effect.mapError(() => new Error("Invalid request format")),
      );

      // Get MTLCrowd balance
      const balance = yield* pipe(
        BalanceServiceTag,
        Effect.flatMap((service) =>
          service.getMTLCrowdBalance(validatedRequest.accountId)
        ),
      );

      return NextResponse.json({
        success: true,
        balance,
      } as BalanceResponse);
    }),
    Effect.catchAll((error) =>
      Effect.succeed(
        NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
          } as BalanceResponse,
          { status: 400 }
        )
      )
    ),
    Effect.provide(AppLayer),
  );

  return await Effect.runPromise(program);
}
