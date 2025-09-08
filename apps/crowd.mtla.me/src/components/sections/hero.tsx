"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-client-provider";

export function HeroSection() {
  const { t } = useLocale();

  return (
    <section className="min-h-screen flex items-center justify-center bg-background border-b-4 border-primary">
      <div className="container mx-auto px-6 py-24">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          <div className="space-y-6">
            <h1 className="text-6xl md:text-8xl font-black text-foreground uppercase tracking-tighter leading-none">
              {t("hero.title")}
              <br />
              <span className="text-primary">{t("hero.titleHighlight")}</span>
            </h1>
            <div className="max-w-4xl mx-auto space-y-4">
              <p className="text-2xl text-muted-foreground font-mono leading-relaxed">
                {t("hero.subtitle")}
              </p>
              <p className="text-xl text-muted-foreground font-mono leading-relaxed">
                {t("hero.description")}
              </p>
            </div>
          </div>

          <div className="border-4 border-secondary bg-card p-12 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="space-y-4">
                <div className="text-4xl font-black text-secondary">{t("hero.step1.number")}</div>
                <h3 className="text-xl font-bold text-foreground uppercase">
                  {t("hero.step1.title")}
                </h3>
                <p className="text-base font-mono text-muted-foreground">
                  {t("hero.step1.description")}
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-4xl font-black text-secondary">{t("hero.step2.number")}</div>
                <h3 className="text-xl font-bold text-foreground uppercase">
                  {t("hero.step2.title")}
                </h3>
                <p className="text-base font-mono text-muted-foreground">
                  {t("hero.step2.description")}
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-4xl font-black text-secondary">{t("hero.step3.number")}</div>
                <h3 className="text-xl font-bold text-foreground uppercase">
                  {t("hero.step3.title")}
                </h3>
                <p className="text-base font-mono text-muted-foreground">
                  {t("hero.step3.description")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button
                size="lg"
                className="text-xl px-12 py-6"
                onClick={() => window.open("https://eurmtl.me/asset/MTLCrowd", "_blank")}
              >
                {t("hero.mtlCrowdButton")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-2xl px-12 py-6"
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
