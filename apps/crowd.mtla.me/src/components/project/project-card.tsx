"use client";

import { useLocale } from "@/components/locale-client-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/format";
import type { Project } from "@/types/project";
import Link from "next/link";

interface ProjectCardProps {
  project: Project;
  onSupport?: (project: Project) => void; // Made optional for backward compatibility
}

export function ProjectCard({
  project,
}: Readonly<ProjectCardProps>) {
  const { t, locale } = useLocale();

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
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="px-2 md:px-3 py-1 border-2 border-border bg-muted flex-shrink-0">
            <span className="text-xs md:text-sm font-mono text-primary">
              {project.code}
            </span>
          </div>
          <div
            className={`px-2 md:px-3 py-1 border-2 border-border bg-background ${statusColor} flex-shrink-0`}
          >
            <span className="text-xs md:text-sm font-mono font-bold">{statusText}</span>
          </div>
        </div>
        <CardTitle className="h-14 md:h-16 flex items-start text-base md:text-lg leading-tight overflow-hidden">
          <span className="line-clamp-2">
            {project.name}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 md:p-6">
        <div className="flex-1">
          <p className="text-sm md:text-base text-muted-foreground font-mono leading-relaxed mb-4 md:mb-6">
            {project.description.length > 120
              ? `${project.description.substring(0, 120)}...`
              : project.description}
          </p>
        </div>

        <div className="space-y-4 md:space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm md:text-base font-bold text-foreground">
                {t("projects.fundingProgress")}
              </span>
              <span className="text-sm md:text-base font-mono text-primary">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress
              value={progressPercentage}
              className={`h-3 md:h-4 ${isCompleted ? "[&>div]:bg-foreground" : ""}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="border-2 border-border bg-muted p-3 md:p-4">
              <div className="text-xs md:text-sm font-mono text-muted-foreground mb-1">
                {t("projects.raised")}
              </div>
              <div className="text-base md:text-xl font-black text-primary break-words">
                {formatNumber(parseInt(project.current_amount), locale)}
              </div>
            </div>
            <div className="border-2 border-border bg-muted p-3 md:p-4">
              <div className="text-xs md:text-sm font-mono text-muted-foreground mb-1">
                {t("projects.target")}
              </div>
              <div className="text-base md:text-xl font-black text-foreground break-words">
                {formatNumber(parseInt(project.target_amount), locale)}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:items-center text-xs md:text-sm font-mono">
            <span className="text-muted-foreground">
              {t("projects.supporters")}: {project.supporters_count}
            </span>
            <span className="text-muted-foreground">
              {t("projects.deadline")}: {new Date(project.deadline).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 md:p-6">
        <Link href={`/${project.code.toLowerCase()}`} className="w-full">
          <Button
            className="w-full text-sm md:text-base"
            variant={isCompleted ? "outline" : "default"}
          >
            {isCompleted ? t("projects.viewProject") : t("projects.fundProject")}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
