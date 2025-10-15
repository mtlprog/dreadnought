import { NextResponse } from "next/server";
import postgres from "postgres";

// Direct database access
const sql = postgres(process.env.DATABASE_URL as string, {
  max: 1,
});

// Cache for 5 minutes
export const revalidate = 300;

export async function GET() {
  try {
    // Get entity ID for mtlf
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

    // Get all snapshots for this entity, ordered by date DESC
    const snapshots = await sql<Array<{
      snapshot_date: string;
      created_at: Date;
    }>>`
      SELECT snapshot_date, created_at
      FROM fund_snapshots
      WHERE entity_id = ${entityId}
      ORDER BY snapshot_date DESC
    `;

    // Format response
    const result = snapshots.map((snapshot) => ({
      date: snapshot.snapshot_date,
      createdAt: snapshot.created_at.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Snapshots API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch snapshots list",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
