import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/stellar/session";

export async function POST() {
  try {
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
}
