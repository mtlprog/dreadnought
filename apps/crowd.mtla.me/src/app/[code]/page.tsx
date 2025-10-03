import { ProjectPage } from "@/components/project/project-page";
import { getProject } from "@/lib/projects";
import { notFound } from "next/navigation";

interface ProjectPageProps {
  params: Promise<{
    code: string;
  }>;
}

export async function generateMetadata({ params }: ProjectPageProps) {
  const { code } = await params;
  const project = await getProject(code);

  if (project === null) {
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
    description: `Support ${project.name} with MTLCrowd tokens. ${
      Math.round(progressPercentage)
    }% funded. ${project.current_amount}/${project.target_amount} MTLCrowd raised.`,
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

  if (project === null) {
    notFound();
  }

  return <ProjectPage project={project} />;
}
