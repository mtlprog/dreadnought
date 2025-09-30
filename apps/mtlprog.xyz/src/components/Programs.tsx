"use client";

import { use } from "react";

interface ProgramsProps {
  contentPromise: Promise<{
    programs: {
      sectionLabel: string;
      title: string;
      items: ReadonlyArray<{
        readonly id: string;
        readonly title: string;
        readonly tagline?: string | undefined;
        readonly description: string;
        readonly features?: readonly string[] | undefined;
        readonly status: string;
      }>;
      cta: {
        apply: string;
        comingSoon: string;
      };
      footer: {
        label: string;
        title: string;
        button: string;
      };
    };
  }>;
  linksPromise: Promise<{
    social: { discord: string };
  }>;
}

export function Programs({ contentPromise, linksPromise }: ProgramsProps) {
  const content = use(contentPromise);
  const links = use(linksPromise);

  return (
    <section className="relative min-h-screen py-8 md:py-12 lg:py-20 snap-start snap-always">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card/30 pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Section Header - Mobile-first */}
          <div className="mb-12 md:mb-20">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-secondary" />
              <span className="text-xs md:text-sm text-secondary font-mono uppercase tracking-wider">
                {content.programs.sectionLabel}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-foreground">
              {content.programs.title}
            </h2>
          </div>

          {/* Programs Grid - Stack on mobile, 2 cols on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {content.programs.items.map((program, index) => (
              <article
                key={program.id}
                className="group relative border-2 border-border bg-card/50 backdrop-blur-sm p-6 md:p-8 transition-all duration-500 hover:border-secondary hover:shadow-[0_0_40px_rgba(0,255,136,0.15)] animate-slide-up overflow-hidden"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="relative z-10">
                  {/* Status Badge */}
                  <div
                    className={`inline-flex items-center gap-2 mb-4 md:mb-6 px-4 md:px-6 py-2 border text-xs md:text-sm font-mono uppercase tracking-wider ${
                      program.status === "OPEN"
                        ? "border-secondary/30 bg-secondary/10 text-secondary"
                        : "border-warning-amber/30 bg-warning-amber/10 text-warning-amber"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 animate-pulse ${
                        program.status === "OPEN"
                          ? "bg-secondary"
                          : "bg-warning-amber"
                      }`}
                    />
                    {program.status}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black mb-2 md:mb-3 uppercase tracking-tight text-foreground">
                    {program.title}
                  </h3>

                  {/* Tagline */}
                  {program.tagline && (
                    <p className="text-xs sm:text-sm md:text-base text-secondary mb-4 md:mb-6 uppercase tracking-widest font-bold">
                      {program.tagline}
                    </p>
                  )}

                  {/* Description */}
                  <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 md:mb-8 leading-relaxed">
                    {program.description}
                  </p>

                  {/* Features */}
                  {program.features && (
                    <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                      {program.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 md:gap-3 text-foreground font-mono text-xs sm:text-sm"
                        >
                          <span className="text-secondary text-base md:text-xl mt-[-2px]">
                            ▸
                          </span>
                          <span className="flex-1">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Action */}
                  {program.status === "OPEN"
                    ? (
                      <button className="w-full h-12 md:h-14 px-6 md:px-8 py-3 md:py-4 bg-secondary text-secondary-foreground text-sm md:text-base font-bold uppercase tracking-wide border-2 border-secondary transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        {content.programs.cta.apply}
                      </button>
                    )
                    : (
                      <div className="w-full h-12 md:h-14 px-6 md:px-8 py-3 md:py-4 border border-dashed border-border/50 bg-muted/30 text-muted-foreground flex items-center justify-center text-sm md:text-base font-mono uppercase tracking-wide">
                        {content.programs.cta.comingSoon}
                      </div>
                    )}
                </div>
              </article>
            ))}
          </div>

          {/* Footer CTA - Responsive spacing */}
          <div className="mt-12 md:mt-20 text-center space-y-6 md:space-y-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-px w-20 bg-gradient-to-r from-transparent via-primary to-transparent" />
              <span className="text-xs md:text-sm text-primary font-mono uppercase tracking-wider">
                {content.programs.footer.label}
              </span>
              <div className="h-px w-20 bg-gradient-to-l from-transparent via-primary to-transparent" />
            </div>

            <p className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground">
              {content.programs.footer.title}
            </p>

            <a
              href={links.social.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center h-14 md:h-16 px-12 md:px-16 py-4 md:py-6 bg-primary text-primary-foreground text-sm sm:text-base md:text-lg font-bold uppercase tracking-wide border-2 border-primary transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,217,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-hidden"
            >
              <span className="relative z-10">
                {content.programs.footer.button}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
