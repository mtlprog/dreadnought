import { ProjectPage } from "@/components/project/project-page";
import type { Project } from "@/types/project";
import { notFound } from "next/navigation";

interface ProjectPageProps {
  params: Promise<{
    code: string;
  }>;
}

async function getProject(code: string): Promise<Project | null> {
  try {
    const baseUrl = process.env['NEXT_PUBLIC_BASE_URL'] || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/projects/${encodeURIComponent(code)}`, {
      next: { revalidate: 300 }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

export async function generateMetadata({ params }: ProjectPageProps) {
  const { code } = await params;
  const project = await getProject(code);
  
  if (!project) {
    return {
      title: "Project Not Found",
      description: "The requested project could not be found.",
    };
  }

  const progressPercentage = Math.min(
    (parseFloat(project.current_amount) / parseFloat(project.target_amount)) * 100,
    100,
  );

  return {
    title: `${project.name} - MTL Crowd`,
    description: `Support ${project.name} with MTLCrowd tokens. ${Math.round(progressPercentage)}% funded. ${project.current_amount}/${project.target_amount} MTLCrowd raised.`,
    openGraph: {
      title: `${project.name} - MTL Crowd`,
      description: `Support ${project.name} with MTLCrowd tokens. ${Math.round(progressPercentage)}% funded.`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.name} - MTL Crowd`,
      description: `Support ${project.name} with MTLCrowd tokens. ${Math.round(progressPercentage)}% funded.`,
    },
  };
}

export default async function ProjectPageRoute({ params }: ProjectPageProps) {
  const { code } = await params;
  const project = await getProject(code);
  
  if (!project) {
    notFound();
  }

  return <ProjectPage project={project} />;
}