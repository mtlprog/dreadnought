import { BalanceServiceLive, BalanceServiceTag } from "@/lib/stellar";
import * as S from "@effect/schema/Schema";
import { Effect, Layer, pipe } from "effect";
import { type NextRequest, NextResponse } from "next/server";

// Request schema
const BalanceRequestSchema = S.Struct({
  accountId: S.String,
});

// Response schemas
type BalanceSuccess = {
  success: true;
  balance: string;
  mtlCrowd: string;
  eurMtl: string;
};

type BalanceError = {
  success: false;
  error: string;
};

type BalanceResponse = BalanceSuccess | BalanceError;

const AppLayer = Layer.mergeAll(BalanceServiceLive);

export async function POST(request: NextRequest): Promise<NextResponse<BalanceResponse>> {
  const program = pipe(
    Effect.gen(function*() {
      // Parse request body
      const body = yield* Effect.tryPromise({
        try: () => request.json(),
        catch: () => new Error("Invalid JSON body"),
      });

      // Validate request schema
      const validatedRequest = yield* Effect.try({
        try: () => S.decodeUnknownSync(BalanceRequestSchema)(body),
        catch: () => new Error("Invalid request format"),
      });

      // Get both MTLCrowd and EURMTL balances
      const balances = yield* pipe(
        BalanceServiceTag,
        Effect.flatMap((service) => service.getBalances(validatedRequest.accountId)),
      );

      return NextResponse.json({
        success: true,
        balance: balances.mtlCrowd, // For backward compatibility
        mtlCrowd: balances.mtlCrowd,
        eurMtl: balances.eurMtl,
      } as BalanceResponse);
    }),
    Effect.catchAll((error) =>
      Effect.succeed(
        NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
          } as BalanceResponse,
          { status: 400 },
        ),
      )
    ),
    Effect.provide(AppLayer),
  );

  return await Effect.runPromise(program);
}
