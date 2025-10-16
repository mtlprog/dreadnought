import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stellarUri } = body;

    if (!stellarUri || typeof stellarUri !== "string") {
      return NextResponse.json(
        { error: "Stellar URI is required" },
        { status: 400 }
      );
    }

    // Send request to MMWB API
    const response = await fetch("https://eurmtl.me/remote/sep07/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uri: stellarUri }),
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("MMWB API error:", errorText);
      throw new Error(
        `MMWB API unavailable (${response.status}). Please try signing the transaction manually using SEP-0007 button.`
      );
    }

    const data = await response.json();

    if (!data.url) {
      throw new Error("No URL returned from MMWB API");
    }

    return NextResponse.json({
      telegramUrl: data.url,
    });
  } catch (error) {
    console.error("Stellar URI error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
