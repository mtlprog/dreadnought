import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { stellarUri?: string };
    const { stellarUri } = body;
    
    if (!stellarUri) {
      return NextResponse.json(
        { error: "Stellar URI is required" },
        { status: 400 }
      );
    }

    console.log("Sending URI to MMWB API:", stellarUri);

    // Отправляем запрос к реальному MMWB API
    const formData = new FormData();
    formData.append('uri', stellarUri);

    const response = await fetch('https://eurmtl.me/remote/sep07/add', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'MTL-Crowd/1.0',
      },
      // Добавляем timeout
      signal: AbortSignal.timeout(10000), // 10 секунд
    });

    if (!response.ok) {
      console.error("MMWB API error:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("MMWB API error details:", errorText);
      throw new Error(`MMWB API unavailable (${response.status}). Please try signing the transaction manually using SEP-0007 button.`);
    }

    const data = await response.json() as { url?: string };
    console.log("MMWB API response:", data);

    if (!data.url) {
      throw new Error('No URL returned from MMWB API');
    }
    
    return NextResponse.json({
      telegramUrl: data.url,
    });
  } catch (error) {
    console.error("Error in stellar-uri API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
