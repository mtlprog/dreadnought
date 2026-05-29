import { BackToDashboard } from "@/components/layout/back-to-dashboard";
import { Footer } from "@/components/layout/footer";
import { SnapshotNav } from "@/components/layout/snapshot-nav";
import { PortfolioDemo } from "@/components/portfolio/portfolio-demo";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Suspense } from "react";

export default function FundPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-background p-6">
        <div className="container mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-5xl font-mono uppercase tracking-wider text-cyber-green mb-2">
                MTLF.FUND
              </h1>
              <p className="text-lg font-mono text-steel-gray uppercase tracking-wider">
                FUND STRUCTURE // ACCOUNTS // TOKENS
              </p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <SnapshotNav />
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-background">
        <div className="container mx-auto px-6 py-3">
          <BackToDashboard />
        </div>
      </div>

      <main className="flex-1 py-8">
        <Suspense>
          <PortfolioDemo />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
