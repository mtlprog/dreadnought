import { NextResponse } from "next/server";
import { getSession } from "@/lib/stellar/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      publicKey: session.publicKey,
      userId: session.userId,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({ authenticated: false });
  }
}
