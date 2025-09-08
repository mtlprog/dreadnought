"use client";

import { useLocale } from "@/components/locale-client-provider";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const { t } = useLocale();

  return (
    <section className="min-h-[80vh] md:min-h-screen flex items-center justify-center bg-background border-b-4 border-primary">
      <div className="container mx-auto px-4 py-12 md:px-6 md:py-24">
        <div className="max-w-6xl mx-auto text-center space-y-8 md:space-y-12">
          <div className="space-y-4 md:space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black text-foreground uppercase tracking-tighter leading-none">
              {t("hero.title")}
              <br />
              <span className="text-primary">{t("hero.titleHighlight")}</span>
            </h1>
            <div className="max-w-4xl mx-auto space-y-3 md:space-y-4">
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-mono leading-relaxed">
                {t("hero.subtitle")}
              </p>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground font-mono leading-relaxed">
                {t("hero.description")}
              </p>
            </div>
          </div>

          <div className="border-4 border-secondary bg-card p-6 md:p-12 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-center">
              <div className="space-y-3 md:space-y-4">
                <div className="text-2xl md:text-4xl font-black text-secondary">{t("hero.step1.number")}</div>
                <h3 className="text-lg md:text-xl font-bold text-foreground uppercase">
                  {t("hero.step1.title")}
                </h3>
                <p className="text-sm md:text-base font-mono text-muted-foreground leading-tight">
                  {t("hero.step1.description")}
                </p>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="text-2xl md:text-4xl font-black text-secondary">{t("hero.step2.number")}</div>
                <h3 className="text-lg md:text-xl font-bold text-foreground uppercase">
                  {t("hero.step2.title")}
                </h3>
                <p className="text-sm md:text-base font-mono text-muted-foreground leading-tight">
                  {t("hero.step2.description")}
                </p>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="text-2xl md:text-4xl font-black text-secondary">{t("hero.step3.number")}</div>
                <h3 className="text-lg md:text-xl font-bold text-foreground uppercase">
                  {t("hero.step3.title")}
                </h3>
                <p className="text-sm md:text-base font-mono text-muted-foreground leading-tight">
                  {t("hero.step3.description")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 md:space-y-8">
            <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-stretch sm:items-center">
              <Button
                size="lg"
                className="text-lg md:text-xl px-8 py-4 md:px-12 md:py-6 min-h-[56px] md:min-h-[72px] font-bold uppercase tracking-wide"
                onClick={() => window.open("https://eurmtl.me/asset/MTLCrowd", "_blank")}
              >
                {t("hero.mtlCrowdButton")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg md:text-xl px-8 py-4 md:px-12 md:py-6 min-h-[56px] md:min-h-[72px] font-bold uppercase tracking-wide"
                onClick={() => {
                  const projectsSection = document.getElementById("projects-section");
                  projectsSection?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {t("hero.viewProjectsButton")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
