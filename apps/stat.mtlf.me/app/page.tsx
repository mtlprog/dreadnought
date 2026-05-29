import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { Footer } from "@/components/layout/footer";
import { SnapshotNav } from "@/components/layout/snapshot-nav";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-background p-6">
        <div className="container mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-6xl font-mono uppercase tracking-wider text-cyber-green mb-2">
                MTLF.STAT
              </h1>
              <p className="text-xl font-mono text-steel-gray uppercase tracking-wider">
                MONTELIBERO FOUNDATION // PORTFOLIO STATISTICS
              </p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <SnapshotNav />
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 py-8">
        <Suspense>
          <DashboardPage />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
