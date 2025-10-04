"use client";

import { useLocale } from "@/components/locale-client-provider";
import { ProjectCard } from "@/components/project/project-card";
import type { Project } from "@/types/project";
import { useEffect, useState } from "react";

export function ProjectsSection() {
  const { t } = useLocale();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await fetch("/api/projects");
      const result = await response.json();

      if (result.success === true) {
        setProjects(result.data);
        console.warn("Projects updated:", result.data.length);
      } else {
        console.error("Failed to fetch projects:", result.error);
        setProjects([]);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchProjects();
  }, []);

  const activeProjects = projects.filter(p => p.status === "active");
  const completedProjects = projects.filter(p => p.status === "completed");

  return (
    <section id="projects-section" className="min-h-screen py-12 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground uppercase tracking-tighter mb-4 md:mb-6">
              {t("projects.title")}
              <br />
              <span className="text-primary">PROJECTS</span>
            </h2>
            <p className="text-base md:text-xl text-muted-foreground font-mono max-w-3xl mx-auto px-4">
              {t("projects.subtitle")}
            </p>
          </div>

          {loading
            ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-xl font-mono text-muted-foreground uppercase">
                  {t("projects.loading")}
                </p>
              </div>
            )
            : (
              <div className="space-y-12 md:space-y-16">
                {/* Active Projects */}
                <div>
                  <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                    <div className="w-4 h-4 md:w-6 md:h-6 bg-primary animate-pulse flex-shrink-0" />
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-primary uppercase">
                      {t("projects.fundingActive")} ({activeProjects.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {activeProjects.map((project) => (
                      <ProjectCard
                        key={project.code}
                        project={project}
                      />
                    ))}
                  </div>
                </div>

                {/* Completed Projects */}
                {completedProjects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                      <div className="w-4 h-4 md:w-6 md:h-6 bg-secondary flex-shrink-0" />
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-secondary uppercase">
                        {t("projects.fundingEnded")} ({completedProjects.length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                      {completedProjects.map((project) => (
                        <ProjectCard
                          key={project.code}
                          project={project}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </section>
  );
}
