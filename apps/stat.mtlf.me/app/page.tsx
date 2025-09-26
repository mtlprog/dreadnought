import { Footer } from "@/components/layout/footer";
import { PortfolioDemo } from "@/components/portfolio/portfolio-demo";

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="border-b border-steel-gray bg-black p-6">
        <div className="container mx-auto">
          <h1 className="text-6xl font-mono uppercase tracking-wider text-cyber-green mb-2">
            MTLF.STAT
          </h1>
          <p className="text-xl font-mono text-steel-gray uppercase tracking-wider">
            MONTELIBERO FOUNDATION // PORTFOLIO STATISTICS
          </p>
        </div>
      </div>

      <main className="flex-1 py-8">
        <PortfolioDemo />
      </main>

      <Footer />
    </div>
  );
}
