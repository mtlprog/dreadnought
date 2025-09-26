import { NextRequest, NextResponse } from "next/server";
import { Effect, Layer, pipe } from "effect";
import { PriceService, PriceServiceLive, AssetInfo } from "@/lib/stellar";

const AppLayer = Layer.merge(PriceServiceLive, Layer.empty);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const tokenACode = searchParams.get("tokenA");
  const tokenAIssuer = searchParams.get("tokenAIssuer");
  const tokenBCode = searchParams.get("tokenB");
  const tokenBIssuer = searchParams.get("tokenBIssuer");

  if (!tokenACode || !tokenBCode) {
    return NextResponse.json({ error: "Token codes are required" }, { status: 400 });
  }

  const tokenA: AssetInfo = {
    code: tokenACode,
    issuer: tokenAIssuer || "",
    type: tokenACode === "XLM" ? "native" : "credit_alphanum4",
  };

  const tokenB: AssetInfo = {
    code: tokenBCode,
    issuer: tokenBIssuer || "",
    type: tokenBCode === "XLM" ? "native" : "credit_alphanum4",
  };

  const program = pipe(
    PriceService,
    Effect.flatMap((service) => service.getTokenPrice(tokenA, tokenB)),
    Effect.provide(AppLayer),
    Effect.tap((result) => Effect.log(`Price fetched: ${tokenA.code}/${tokenB.code} = ${result.price}`)),
    Effect.catchAll((error) =>
      pipe(
        Effect.log(`Price API error: ${error}`),
        Effect.flatMap(() => Effect.fail({
          error: "Failed to fetch token price",
          message: error instanceof Error ? error.message : "Unknown error occurred"
        }))
      )
    )
  );

  return Effect.runPromise(program)
    .then(result => NextResponse.json(result))
    .catch(error => NextResponse.json(error, { status: 500 }));
}