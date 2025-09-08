import { getProject } from "@/lib/projects";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const project = await getProject(code);

    if (project === null) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
          data: null,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API Error fetching project:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch project",
        data: null,
      },
      { status: 500 },
    );
  }
}

export const revalidate = 300; // Revalidate every 5 minutes
