import { PortfolioDemo } from "@/components/portfolio/portfolio-demo";

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
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

      <div className="py-8">
        <PortfolioDemo />
      </div>

      <footer className="border-t border-steel-gray bg-black p-6 mt-16">
        <div className="container mx-auto text-center">
          <p className="font-mono text-steel-gray uppercase tracking-wider">
            STELLAR BLOCKCHAIN // REAL-TIME DATA
          </p>
        </div>
      </footer>
    </div>
  );
}
