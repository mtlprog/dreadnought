import { getProjects } from "@/lib/projects";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const projects = await getProjects();

    return NextResponse.json({
      success: true,
      data: projects,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API Error fetching projects:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch projects",
        data: [],
      },
      { status: 500 },
    );
  }
}

export const revalidate = 300; // Revalidate every 5 minutes
