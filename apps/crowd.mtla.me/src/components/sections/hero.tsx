"use client";

import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-background border-b-4 border-primary">
      <div className="container mx-auto px-6 py-24">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          <div className="space-y-6">
            <h1 className="text-6xl md:text-8xl font-black text-foreground uppercase tracking-tighter leading-none">
              FUND THE
              <br />
              <span className="text-primary">NETWORK STATE</span>
            </h1>
            <div className="max-w-4xl mx-auto space-y-4">
              <p className="text-2xl text-muted-foreground font-mono leading-relaxed">
                MTL CROWD TOKENS ARE DONATION CREDITS TO MONTELIBERO ASSOCIATION
              </p>
              <p className="text-xl text-muted-foreground font-mono leading-relaxed">
                GOVERN HOW YOUR DONATIONS ARE USED THROUGH DECENTRALIZED PROJECT FUNDING
              </p>
            </div>
          </div>

          <div className="border-4 border-secondary bg-card p-12 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="space-y-4">
                <div className="text-4xl font-black text-secondary">01</div>
                <h3 className="text-xl font-bold text-foreground uppercase">
                  BUY TOKENS
                </h3>
                <p className="text-base font-mono text-muted-foreground">
                  PURCHASE MTL CROWD TOKENS AS DONATION CREDITS
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-4xl font-black text-secondary">02</div>
                <h3 className="text-xl font-bold text-foreground uppercase">
                  CHOOSE PROJECTS
                </h3>
                <p className="text-base font-mono text-muted-foreground">
                  ALLOCATE YOUR TOKENS TO PRIVACY FOCUSED INITIATIVES
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-4xl font-black text-secondary">03</div>
                <h3 className="text-xl font-bold text-foreground uppercase">
                  TRACK IMPACT
                </h3>
                <p className="text-base font-mono text-muted-foreground">
                  MONITOR PROJECT PROGRESS AND FUND ALLOCATION
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button size="lg" className="text-2xl px-12 py-6">
                BUY MTL CROWD TOKENS
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
                VIEW PROJECTS
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
