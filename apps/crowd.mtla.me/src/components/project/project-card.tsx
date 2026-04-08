"use client";

import { useLocale } from "@/components/locale-client-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/format";
import type { Project } from "@/types/project";
import { Loader2 } from "lucide-react";
import Link, { useLinkStatus } from "next/link";

interface ProjectCardProps {
  project: Project;
  onSupport?: (project: Project) => void; // Made optional for backward compatibility
}

/**
 * Navigation button rendered inside a `<Link>`. Uses Next.js `useLinkStatus`
 * to show a spinner and disable itself while the target route is loading.
 *
 * The project page is a dynamic server component that hits Stellar Horizon
 * and IPFS on each request (see `projects.ts` and `service.ts`) — navigation
 * can take several seconds, so without this feedback the click feels
 * broken. Must be a descendant of `<Link>` for the hook to fire.
 */
function ProjectCardNavButton({
  label,
  className,
  variant,
}: Readonly<{
  label: string;
  className: string;
  variant: "default" | "outline";
}>) {
  const { pending } = useLinkStatus();
  return (
    <Button
      className={className}
      variant={variant}
      disabled={pending}
      aria-busy={pending}
    >
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
      {label}
    </Button>
  );
}

export function ProjectCard({
  project,
}: Readonly<ProjectCardProps>) {
  const { t, locale } = useLocale();

  const isCompleted = project.status === "completed";
  const isCanceled = project.status === "canceled";
  const isEnded = isCompleted || isCanceled;

  // If project is completed (successful) and current_amount is 0, it means it was fully funded
  // (funds were distributed and tokens were clawed back)
  // For canceled projects, show the actual progress (they didn't reach the goal)
  const currentAmount = parseFloat(project.current_amount);
  const targetAmount = parseFloat(project.target_amount);
  const progressPercentage = isCompleted && currentAmount === 0 && targetAmount > 0
    ? 100
    : Math.min((currentAmount / targetAmount) * 100, 100);

  const statusColor = isCanceled
    ? "text-destructive"
    : isCompleted
    ? "text-secondary"
    : "text-primary";

  const statusText = isCanceled
    ? t("projects.fundingFailed")
    : isCompleted
    ? t("projects.fundingEnded")
    : t("projects.active");

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
              className={`h-3 md:h-4 ${
                isCanceled ? "[&>div]:bg-destructive" : isCompleted ? "[&>div]:bg-foreground" : ""
              }`}
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
        <Link href={`/${project.code.toLowerCase()}`} className="w-full" prefetch={false}>
          <ProjectCardNavButton
            label={isEnded ? t("projects.viewProject") : t("projects.fundProject")}
            className={`w-full text-sm md:text-base ${
              isCanceled ? "border-destructive text-destructive hover:bg-destructive/10" : ""
            }`}
            variant={isEnded ? "outline" : "default"}
          />
        </Link>
      </CardFooter>
    </Card>
  );
}
