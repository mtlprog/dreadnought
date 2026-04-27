import { Footer } from "@/components/layout/footer";
import { PortfolioDemo } from "@/components/portfolio/portfolio-demo";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function FundPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-background p-6">
        <div className="container mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-electric-cyan hover:text-cyber-green transition-colors mb-3"
              >
                <ArrowLeft className="h-3 w-3" />
                DASHBOARD
              </Link>
              <h1 className="text-5xl font-mono uppercase tracking-wider text-cyber-green mb-2">
                MTLF.FUND
              </h1>
              <p className="text-lg font-mono text-steel-gray uppercase tracking-wider">
                FUND STRUCTURE // ACCOUNTS // TOKENS
              </p>
            </div>
            <div className="mt-2">
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 py-8">
        <PortfolioDemo />
      </main>

      <Footer />
    </div>
  );
}
