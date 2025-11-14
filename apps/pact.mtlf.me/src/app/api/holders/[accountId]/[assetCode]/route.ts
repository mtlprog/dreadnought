import { HorizonServiceLive, HorizonServiceTag } from "@/lib/services/horizon-service";
import { Effect, pipe } from "effect";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string; assetCode: string }> }
) {
  const { accountId, assetCode } = await params;

  const program = pipe(
    HorizonServiceTag,
    Effect.flatMap((service) => service.getAssetHolders(assetCode, accountId)),
    Effect.provide(HorizonServiceLive),
  );

  try {
    const holders = await Effect.runPromise(program);
    return NextResponse.json({ holders });
  } catch (error) {
    console.error("Failed to fetch holders:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load holders" },
      { status: 500 }
    );
  }
}
