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
    projects: {
      lore: string;
      loreSource: string;
      mtlCrowd: string;
      mtlCrowdSource: string;
      stat: string;
      statSource: string;
      pact: string;
      pactSource: string;
    };
  }>;
}

type ProjectLinks = {
  lore: string;
  loreSource: string;
  mtlCrowd: string;
  mtlCrowdSource: string;
  stat: string;
  statSource: string;
  pact: string;
  pactSource: string;
};

const PROJECT_LINKS: Record<string, keyof ProjectLinks> = {
  lore: "lore",
  "mtl-crowd": "mtlCrowd",
  stat: "stat",
  pact: "pact",
};

const PROJECT_SOURCE_LINKS: Record<string, keyof ProjectLinks> = {
  lore: "loreSource",
  "mtl-crowd": "mtlCrowdSource",
  stat: "statSource",
  pact: "pactSource",
};

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

                  {/* Links */}
                  <div className="flex flex-wrap items-center gap-4 md:gap-6">
                    <a
                      href={links.projects[PROJECT_SOURCE_LINKS[project.id] ?? "mtlCrowdSource"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono uppercase tracking-wider"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Source
                    </a>
                    <a
                      href={links.projects[PROJECT_LINKS[project.id] ?? "mtlCrowd"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 h-12 md:h-14 px-6 md:px-8 py-3 md:py-4 bg-primary text-sm md:text-base font-bold uppercase tracking-wide border-2 border-primary transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,217,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      style={{ color: "hsl(var(--primary-foreground))" }}
                    >
                      {content.projects.cta}
                      <span className="text-lg">→</span>
                    </a>
                  </div>
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
