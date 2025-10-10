"use client";

import { use } from "react";

interface ProjectsProps {
  contentPromise: Promise<{
    projects: {
      sectionLabel: string;
      title: string;
      items: ReadonlyArray<{
        readonly id: string;
        readonly title: string;
        readonly description: string;
        readonly status: string;
        readonly tech?: readonly string[] | undefined;
        readonly tagline?: string | undefined;
        readonly features?: readonly string[] | undefined;
      }>;
      cta: string;
      comingSoon: string;
    };
  }>;
  linksPromise: Promise<{
    projects: { mtlCrowd: string };
  }>;
}

export function Projects({ contentPromise, linksPromise }: ProjectsProps) {
  const content = use(contentPromise);
  const links = use(linksPromise);

  return (
    <section className="relative min-h-screen py-8 md:py-12 lg:py-20 border-b-2 border-border snap-start snap-always">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-card/30 via-transparent to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Section Header - Mobile-first */}
          <div className="mb-12 md:mb-20">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-primary" />
              <span className="text-xs md:text-sm text-primary font-mono uppercase tracking-wider">
                {content.projects.sectionLabel}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-foreground">
              {content.projects.title}
            </h2>
          </div>

          {/* Projects Grid */}
          <div className="grid gap-6 md:gap-8">
            {content.projects.items.map((project, index) => (
              <article
                key={project.id}
                className="group relative border-2 border-border bg-card/50 backdrop-blur-sm p-6 md:p-8 lg:p-12 transition-all duration-500 hover:border-primary hover:shadow-[0_0_40px_rgba(0,217,255,0.15)] animate-slide-up overflow-hidden"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="relative z-10">
                  {/* Status Badge */}
                  <div className="inline-flex items-center gap-2 mb-4 md:mb-6 px-4 md:px-6 py-2 border border-primary/30 bg-primary/10 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-primary animate-pulse" />
                    <span className="text-xs md:text-sm text-primary font-mono uppercase tracking-wider">
                      {project.status}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 uppercase tracking-tight text-foreground">
                    {project.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 md:mb-8 leading-relaxed max-w-3xl">
                    {project.description}
                  </p>

                  {/* Tech Stack */}
                  {project.tech && (
                    <div className="flex flex-wrap gap-2 md:gap-3 mb-6 md:mb-8">
                      {project.tech.map((tech) => (
                        <span
                          key={tech}
                          className="px-3 md:px-4 py-1.5 md:py-2 border border-border bg-muted/50 text-muted-foreground text-xs md:text-sm uppercase tracking-wider font-mono group-hover:border-primary/50 group-hover:text-primary transition-colors"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Link */}
                  <a
                    href={links.projects.mtlCrowd}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 h-12 md:h-14 px-6 md:px-8 py-3 md:py-4 bg-primary text-sm md:text-base font-bold uppercase tracking-wide border-2 border-primary transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,217,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    style={{ color: "hsl(var(--primary-foreground))" }}
                  >
                    {content.projects.cta}
                    <span className="text-lg">→</span>
                  </a>
                </div>
              </article>
            ))}
          </div>

          {/* More projects coming soon */}
          <div className="mt-12 md:mt-16 p-6 md:p-8 border border-dashed border-border/50 bg-card/30 backdrop-blur-sm text-center">
            <p className="text-muted-foreground text-sm md:text-base uppercase tracking-widest font-mono">
              {content.projects.comingSoon}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
