import { Github, MessageCircle } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t-4 border-primary bg-muted mt-24">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-2xl font-black text-primary uppercase mb-6">
              MTL CROWD
            </h3>
            <p className="text-base font-mono text-muted-foreground leading-relaxed">
              DECENTRALIZED FUNDING PLATFORM FOR FREEDOM FOCUSED PROJECTS.
              POWERED BY STELLAR BLOCKCHAIN.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-bold text-foreground uppercase mb-6">
              RESOURCES
            </h4>
            <div className="space-y-4">
              <Link
                href="https://github.com/mtlprog/dreadnought/blob/master/apps/crowd.mtla.me/README.md"
                target="_blank"
                className="block text-lg font-mono text-muted-foreground hover:text-destructive transition-colors"
              >
                → DOCUMENTATION
              </Link>
              <Link
                href="https://github.com/mtlprog/dreadnought/blob/master/apps/crowd.mtla.me/src/cli/README.md"
                target="_blank"
                className="block text-lg font-mono text-muted-foreground hover:text-destructive transition-colors"
              >
                → CLI REFERENCE
              </Link>
              <Link
                href="https://mtl_helper_bot.t.me"
                target="_blank"
                className="block text-lg font-mono text-muted-foreground hover:text-destructive transition-colors"
              >
                → TECHNICAL SUPPORT
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-xl font-bold text-foreground uppercase mb-6">
              ASSOCIATION
            </h4>
            <div className="space-y-4">
              <Link
                href="https://github.com/mtlprog"
                className="flex items-center gap-3 text-lg font-mono text-muted-foreground hover:text-destructive transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-6 h-6" />
                GITHUB ORG
              </Link>
              <Link
                href="https://t.me/Montelibero_ru"
                className="flex items-center gap-3 text-lg font-mono text-muted-foreground hover:text-destructive transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-6 h-6" />
                MONTELIBERO RU
              </Link>
              <Link
                href="https://t.me/montelibero_agora/43852"
                className="flex items-center gap-3 text-lg font-mono text-muted-foreground hover:text-destructive transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-6 h-6" />
                PROGRAMMERS GUILD CHAT
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-border pt-8 mt-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-base font-mono text-muted-foreground">
              🄯2025 BUILDING ON TOP OF IT IS PERMITTED AND EXTRIMELLY SUPPORTED.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
