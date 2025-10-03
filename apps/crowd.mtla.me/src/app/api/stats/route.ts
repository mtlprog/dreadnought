import { getProjects } from "@/lib/projects";
import { NextResponse } from "next/server";

export const revalidate = 60; // Revalidate every 60 seconds

export interface PlatformStats {
  totalFunded: number;
  totalSupporters: number;
  totalProjects: number;
  activeProjects: number;
}

export async function GET() {
  try {
    const projects = await getProjects();

    // Calculate total funded amount across all projects
    const totalFunded = projects.reduce((sum, project) => {
      const amount = parseFloat(project.current_amount) || 0;
      return sum + amount;
    }, 0);

    // Calculate unique supporters count across all projects
    const uniqueSupporters = new Set<string>();
    projects.forEach((project) => {
      if (project.supporters) {
        project.supporters.forEach((supporter) => {
          uniqueSupporters.add(supporter.account_id);
        });
      }
    });

    // Count active vs total projects
    const activeProjects = projects.filter(
      (p) => p.status === "active",
    ).length;

    const stats: PlatformStats = {
      totalFunded: Math.round(totalFunded),
      totalSupporters: uniqueSupporters.size,
      totalProjects: projects.length,
      activeProjects,
    };

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("Failed to fetch platform stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 },
    );
  }
}
