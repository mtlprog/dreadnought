import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { stellarUri?: string };
    const { stellarUri } = body;

    if (stellarUri === undefined || stellarUri === null || stellarUri === "") {
      return NextResponse.json(
        { error: "Stellar URI is required" },
        { status: 400 },
      );
    }

    // Effect.logInfo would be better here, but keeping console for now

    // Отправляем запрос к реальному MMWB API
    const response = await fetch("https://eurmtl.me/remote/sep07/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uri: stellarUri }),
      // Добавляем timeout
      signal: globalThis.AbortSignal.timeout(10000), // 10 секунд
    });

    if (!response.ok) {
      // Effect.logError would be better here
      const errorText = await response.text();
      console.error("MMWB API error details:", errorText);
      throw new Error(
        `MMWB API unavailable (${response.status}). Please try signing the transaction manually using SEP-0007 button.`,
      );
    }

    const data = await response.json() as { url?: string };
    // Effect.logInfo would be better here

    if (data.url === undefined || data.url === null || data.url === "") {
      throw new Error("No URL returned from MMWB API");
    }

    return NextResponse.json({
      telegramUrl: data.url,
    });
  } catch (error) {
    // Effect.logError would be better here
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
