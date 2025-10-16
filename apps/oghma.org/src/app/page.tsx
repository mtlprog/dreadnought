import Link from "next/link";
import { Button } from "@dreadnought/ui";
import { Header } from "@/components/header";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-24 text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-none">
            LEARN
            <br />
            <span className="text-primary">EVERYTHING</span>
          </h2>

          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-mono max-w-2xl mx-auto">
            Free educational courses with Stellar authentication and progress
            tracking
          </p>

          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center pt-8">
            <Link href="/courses">
              <Button size="lg" className="w-full sm:w-auto">
                BROWSE COURSES
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              CONNECT WALLET
            </Button>
          </div>

          {/* Info Box */}
          <div className="border-4 border-secondary bg-card p-6 md:p-12 mt-12 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-center">
              <div className="space-y-3 md:space-y-4">
                <div className="text-2xl md:text-4xl font-black text-secondary">
                  01
                </div>
                <h3 className="text-lg md:text-xl font-bold uppercase">
                  BROWSE COURSES
                </h3>
                <p className="text-sm md:text-base font-mono text-muted-foreground">
                  All courses are free and accessible
                </p>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="text-2xl md:text-4xl font-black text-secondary">
                  02
                </div>
                <h3 className="text-lg md:text-xl font-bold uppercase">
                  CONNECT WALLET
                </h3>
                <p className="text-sm md:text-base font-mono text-muted-foreground">
                  Optional Stellar authentication
                </p>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="text-2xl md:text-4xl font-black text-secondary">
                  03
                </div>
                <h3 className="text-lg md:text-xl font-bold uppercase">
                  EARN BADGES
                </h3>
                <p className="text-sm md:text-base font-mono text-muted-foreground">
                  Track progress and achievements
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-border bg-background p-6">
        <div className="container mx-auto text-center">
          <p className="text-sm font-mono text-muted-foreground">
            POWERED BY STELLAR BLOCKCHAIN
          </p>
        </div>
      </footer>
    </div>
  );
}
