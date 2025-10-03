"use client";

import { useLocale } from "@/components/locale-client-provider";
import { PlatformStatsSection } from "@/components/sections/platform-stats";
import { ChevronDown } from "lucide-react";

export function HeroSection() {
  const { t } = useLocale();

  const scrollToProjects = () => {
    const projectsSection = document.getElementById("projects-section");
    projectsSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="h-[calc(100vh-5rem)] flex flex-col items-center justify-center bg-background border-b-4 border-primary relative">
      <div className="container mx-auto px-4 py-12 md:px-6 md:py-24 flex-1 flex flex-col items-center justify-center">
        <div className="max-w-6xl mx-auto text-center space-y-8 md:space-y-12">
          {/* Main Heading */}
          <div className="space-y-4 md:space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-foreground uppercase tracking-tighter leading-[0.9]">
              {t("hero.title")}
              <br />
              <span className="text-primary">{t("hero.titleHighlight")}</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground font-mono leading-relaxed max-w-4xl mx-auto">
              {t("hero.subtitle")}
            </p>
          </div>

          {/* Platform Statistics */}
          <div className="py-4 md:py-8">
            <PlatformStatsSection />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce cursor-pointer group"
        onClick={scrollToProjects}
      >
        <span className="text-sm font-mono text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
          {t("hero.scrollDown")}
        </span>
        <ChevronDown className="w-8 h-8 text-primary" />
      </div>
    </section>
  );
}
