"use client";

import { ProjectCard } from "@/components/project/project-card";
import { SupportModal } from "@/components/project/support-modal";
import type { Project } from "@/types/project";
import { useEffect, useState } from "react";

export function ProjectsSection() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const handleSupport = (project: Project) => {
    setSelectedProject(project);
    setModalOpen(true);
  };

  const fetchProjects = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await fetch("/api/projects");
      const result = await response.json();

      if (result.success === true) {
        setProjects(result.data);
        console.log("Projects updated:", result.data.length);
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

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProject(null);
    
    // Обновляем проекты в фоне после закрытия модалки
    console.log("Modal closed, refreshing projects in background...");
    void fetchProjects(false); // false = без показа лоадера
  };

  useEffect(() => {
    void fetchProjects();
  }, []);

  const activeProjects = projects.filter(p => p.status === "active");
  const completedProjects = projects.filter(p => p.status === "completed");

  return (
    <section id="projects-section" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-foreground uppercase tracking-tighter mb-6">
              ACTIVE
              <br />
              <span className="text-primary">PROJECTS</span>
            </h2>
            <p className="text-xl text-muted-foreground font-mono max-w-3xl mx-auto">
              SUPPORT FREEDOM FOCUSED INITIATIVES WITH YOUR MTL CROWD TOKENS
            </p>
          </div>

          {loading
            ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-xl font-mono text-muted-foreground uppercase">
                  LOADING PROJECTS...
                </p>
              </div>
            )
            : (
              <div className="space-y-16">
                {/* Active Projects */}
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-6 h-6 bg-primary animate-pulse" />
                    <h3 className="text-3xl font-black text-primary uppercase">
                      FUNDING ACTIVE ({activeProjects.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {activeProjects.map((project) => (
                      <ProjectCard
                        key={project.code}
                        project={project}
                        onSupport={handleSupport}
                      />
                    ))}
                  </div>
                </div>

                {/* Completed Projects */}
                {completedProjects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-6 h-6 bg-secondary" />
                      <h3 className="text-3xl font-black text-secondary uppercase">
                        FUNDING ENDED ({completedProjects.length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {completedProjects.map((project) => (
                        <ProjectCard
                          key={project.code}
                          project={project}
                          onSupport={handleSupport}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      <SupportModal
        project={selectedProject}
        open={modalOpen}
        onClose={handleCloseModal}
        onProjectUpdate={() => void fetchProjects(false)}
      />
    </section>
  );
}
