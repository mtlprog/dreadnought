import { NextRequest, NextResponse } from "next/server";
import { Effect, Layer, pipe } from "effect";
import { PortfolioService, PortfolioServiceLive } from "@/lib/stellar";

const AppLayer = Layer.merge(PortfolioServiceLive, Layer.empty);

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = await params;

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    const program = pipe(
      PortfolioService,
      Effect.flatMap((service) => service.getAccountPortfolio(accountId)),
      Effect.provide(AppLayer)
    );

    const result = await Effect.runPromise(program);

    return NextResponse.json({
      accountId: result.accountId,
      xlmBalance: result.xlmBalance,
      tokenCount: result.tokens.length,
      tokens: result.tokens.map(token => ({
        code: token.asset.code,
        issuer: token.asset.issuer,
        balance: token.balance,
      }))
    });
  } catch (error) {
    console.error("Test Portfolio API error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorDetails = error instanceof Error && error.stack ? error.stack : String(error);

    return NextResponse.json(
      {
        error: "Failed to fetch portfolio data",
        message: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}