"use client"

import { useState } from "react"
import { ProjectCard } from "@/components/project/project-card"
import { SupportModal } from "@/components/project/support-modal"
import { mockProjects } from "@/data/mock-projects"
import { Project } from "@/types/project"

export function ProjectsSection() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleSupport = (project: Project) => {
    setSelectedProject(project)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedProject(null)
  }

  const activeProjects = mockProjects.filter(p => p.status === "active")
  const completedProjects = mockProjects.filter(p => p.status === "completed")

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-foreground uppercase tracking-tighter mb-6">
              ACTIVE
              <br />
              <span className="text-primary">PROJECTS</span>
            </h2>
            <p className="text-xl text-muted-foreground font-mono max-w-3xl mx-auto">
              SUPPORT PRIVACY FOCUSED INITIATIVES WITH YOUR MTL CROWD TOKENS
            </p>
          </div>

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
                    key={project.id}
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
                    FUNDING COMPLETE ({completedProjects.length})
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {completedProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onSupport={handleSupport}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stats Section */}
          <div className="border-4 border-primary bg-card p-12 mt-16">
            <h3 className="text-3xl font-black text-primary uppercase text-center mb-8">
              PLATFORM STATISTICS
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-black text-primary mb-2">
                  {mockProjects.length}
                </div>
                <div className="text-lg font-mono text-muted-foreground uppercase">
                  TOTAL PROJECTS
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-black text-secondary mb-2">
                  {mockProjects.reduce((sum, p) => sum + parseInt(p.current_amount), 0).toLocaleString()}
                </div>
                <div className="text-lg font-mono text-muted-foreground uppercase">
                  TOKENS ALLOCATED
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-black text-accent mb-2">
                  {mockProjects.reduce((sum, p) => sum + p.supporters_count, 0)}
                </div>
                <div className="text-lg font-mono text-muted-foreground uppercase">
                  TOTAL SUPPORTERS
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-black text-foreground mb-2">
                  {activeProjects.length}
                </div>
                <div className="text-lg font-mono text-muted-foreground uppercase">
                  ACTIVE FUNDING
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SupportModal
        project={selectedProject}
        open={modalOpen}
        onClose={handleCloseModal}
      />
    </section>
  )
}
