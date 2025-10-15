import { NextResponse } from "next/server";
import postgres from "postgres";
import type { FundStructureData } from "@/lib/stellar/fund-structure-service";

// Direct database access without Effect layers to avoid Next.js webpack issues
const sql = postgres(process.env.DATABASE_URL as string, {
  max: 1, // Single connection for API route
});

// Cache for 1 hour since data is in DB and updated daily
export const revalidate = 3600;
// Mark as dynamic since we use request.url for query params
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Get optional date parameter from query string
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    // Get entity ID
    const entities = await sql<Array<{ id: number }>>`
      SELECT id FROM fund_entities WHERE slug = 'mtlf'
    `;

    if (entities.length === 0) {
      return NextResponse.json(
        { error: "Fund entity not found" },
        { status: 404 }
      );
    }

    const entity = entities[0];
    if (!entity) {
      return NextResponse.json(
        { error: "Fund entity not found" },
        { status: 404 }
      );
    }

    const entityId = entity.id;

    // Get snapshot - either by date or latest
    const snapshots = date
      ? await sql<Array<{ data: FundStructureData }>>`
          SELECT data
          FROM fund_snapshots
          WHERE entity_id = ${entityId}
            AND snapshot_date = ${date}
        `
      : await sql<Array<{ data: FundStructureData }>>`
          SELECT data
          FROM fund_snapshots
          WHERE entity_id = ${entityId}
          ORDER BY snapshot_date DESC
          LIMIT 1
        `;

    if (snapshots.length === 0) {
      return NextResponse.json(
        { error: "No snapshot data available" },
        { status: 404 }
      );
    }

    const snapshot = snapshots[0];
    if (!snapshot) {
      return NextResponse.json(
        { error: "No snapshot data available" },
        { status: 404 }
      );
    }

    // Parse JSONB data if it's a string
    const data = typeof snapshot.data === 'string'
      ? JSON.parse(snapshot.data)
      : snapshot.data;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Fund structure API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch fund structure data",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
