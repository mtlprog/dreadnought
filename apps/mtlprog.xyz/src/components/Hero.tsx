"use client";

import { use } from "react";

interface HeroProps {
  contentPromise: Promise<{
    hero: {
      title: { line1: string; line2: string; line3: string };
      subtitle: string;
      cta: { primary: string; secondary: string };
      scroll: string;
    };
  }>;
  linksPromise: Promise<{
    social: { discord: string; email: string };
  }>;
}

export function Hero({ contentPromise, linksPromise }: HeroProps) {
  const content = use(contentPromise);
  const links = use(linksPromise);

  return (
    <section className="relative min-h-screen flex items-center justify-center border-b-2 border-border snap-start snap-always overflow-hidden">
      {/* Subtle radial gradient background - only in Hero */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, rgba(0, 217, 255, 0.08) 0%, rgba(0, 217, 255, 0.04) 40%, transparent 70%)",
        }}
      />

      <div className="container mx-auto px-4 py-12 md:px-6 md:py-24 relative z-10">
        <div className="max-w-6xl mx-auto text-center space-y-8 md:space-y-12">
          {/* Title - Mobile-first scaling without gradient */}
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-none animate-fade-in text-foreground">
            {content.hero.title.line1}
            <br />
            {content.hero.title.line2}
            <br />
            <span className="text-primary">{content.hero.title.line3}</span>
          </h1>

          {/* Subtitle - Responsive text size */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground font-mono max-w-2xl mx-auto leading-relaxed">
            {content.hero.subtitle}
          </p>

          {/* CTA Buttons - Stack on mobile, row on desktop */}
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center animate-slide-up">
            <a
              href={links.social.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center h-12 sm:h-14 md:h-16 px-8 md:px-12 py-3 md:py-4 bg-primary text-primary-foreground text-base md:text-lg font-bold uppercase tracking-wide border-2 border-primary transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,217,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-hidden"
            >
              <span className="relative z-10">{content.hero.cta.primary}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-electric-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            <a
              href={links.social.email}
              className="group inline-flex items-center justify-center h-12 sm:h-14 md:h-16 px-8 md:px-12 py-3 md:py-4 border-2 border-border bg-card/50 backdrop-blur-sm text-foreground text-base md:text-lg font-bold uppercase tracking-wide transition-all duration-300 hover:border-primary hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {content.hero.cta.secondary}
            </a>
          </div>

          {/* Decorative element - Responsive spacing */}
          <div className="mt-12 md:mt-20 flex items-center gap-3 md:gap-4 opacity-60">
            <div className="h-px w-12 md:w-20 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <span className="text-muted-foreground text-xs md:text-sm uppercase tracking-widest font-mono">
              {content.hero.scroll}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
