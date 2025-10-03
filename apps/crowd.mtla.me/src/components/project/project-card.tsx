"use client";

import { useLocale } from "@/components/locale-client-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Project } from "@/types/project";
import Link from "next/link";

interface ProjectCardProps {
  project: Project;
  onSupport?: (project: Project) => void; // Made optional for backward compatibility
}

export function ProjectCard({
  project,
}: Readonly<ProjectCardProps>) {
  const { t } = useLocale();

  const isCompleted = project.status === "completed";

  // If project is completed and current_amount is 0, it means it was fully funded
  // (funds were distributed and tokens were clawed back)
  const currentAmount = parseFloat(project.current_amount);
  const targetAmount = parseFloat(project.target_amount);
  const progressPercentage = isCompleted && currentAmount === 0 && targetAmount > 0
    ? 100
    : Math.min((currentAmount / targetAmount) * 100, 100);

  const statusColor = isCompleted ? "text-secondary" : "text-primary";

  const statusText = isCompleted ? t("projects.fundingEnded") : t("projects.active");

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="px-3 py-1 border-2 border-border bg-muted">
            <span className="text-sm font-mono text-primary">
              {project.code}
            </span>
          </div>
          <div
            className={`px-3 py-1 border-2 border-border bg-background ${statusColor}`}
          >
            <span className="text-sm font-mono font-bold">{statusText}</span>
          </div>
        </div>
        <CardTitle className="h-16 flex items-start leading-tight overflow-hidden">
          <span className="line-clamp-2">
            {project.name}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1">
          <p className="text-base text-muted-foreground font-mono leading-relaxed mb-6">
            {project.description.length > 150
              ? `${project.description.substring(0, 150)}...`
              : project.description}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-bold text-foreground">
                {t("projects.fundingProgress")}
              </span>
              <span className="text-lg font-mono text-primary">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className={`h-4 ${isCompleted ? "[&>div]:bg-foreground" : ""}`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-border bg-muted p-4">
              <div className="text-sm font-mono text-muted-foreground mb-1">
                {t("projects.raised")}
              </div>
              <div className="text-xl font-black text-primary">
                {parseInt(project.current_amount).toLocaleString()}
              </div>
            </div>
            <div className="border-2 border-border bg-muted p-4">
              <div className="text-sm font-mono text-muted-foreground mb-1">
                {t("projects.target")}
              </div>
              <div className="text-xl font-black text-foreground">
                {parseInt(project.target_amount).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm font-mono">
            <span className="text-muted-foreground">
              {t("projects.supporters")}: {project.supporters_count}
            </span>
            <span className="text-muted-foreground">
              {t("projects.deadline")}: {new Date(project.deadline).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Link href={`/${project.code.toLowerCase()}`} className="w-full">
          <Button
            className="w-full"
            variant={isCompleted ? "outline" : "default"}
          >
            {isCompleted ? t("projects.viewProject") : t("projects.fundProject")}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
