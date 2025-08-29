import Link from "next/link"
import { Github, MessageCircle } from "lucide-react"

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
              DECENTRALIZED FUNDING PLATFORM FOR PRIVACY FOCUSED PROJECTS. 
              POWERED BY STELLAR BLOCKCHAIN.
            </p>
          </div>
          
          <div>
            <h4 className="text-xl font-bold text-foreground uppercase mb-6">
              RESOURCES
            </h4>
            <div className="space-y-4">
              <Link 
                href="/docs" 
                className="block text-lg font-mono text-muted-foreground hover:text-destructive transition-colors"
              >
                → DOCUMENTATION
              </Link>
              <Link 
                href="/api" 
                className="block text-lg font-mono text-muted-foreground hover:text-destructive transition-colors"
              >
                → API REFERENCE
              </Link>
              <Link 
                href="/support" 
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
                href="https://github.com/montelibero-org" 
                className="flex items-center gap-3 text-lg font-mono text-muted-foreground hover:text-destructive transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-6 h-6" />
                GITHUB ORG
              </Link>
              <Link 
                href="https://t.me/montelibero" 
                className="flex items-center gap-3 text-lg font-mono text-muted-foreground hover:text-destructive transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-6 h-6" />
                TELEGRAM MAIN
              </Link>
              <Link 
                href="https://t.me/mtlcrowd" 
                className="flex items-center gap-3 text-lg font-mono text-muted-foreground hover:text-destructive transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-6 h-6" />
                TELEGRAM CROWD
              </Link>
            </div>
          </div>
        </div>
        
        <div className="border-t-2 border-border pt-8 mt-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-base font-mono text-muted-foreground">
              © 2025 MONTELIBERO ASSOCIATION. DECENTRALIZED BY DESIGN.
            </p>
            <div className="flex items-center gap-2 font-mono text-primary">
              <span className="text-sm">NETWORK STATUS:</span>
              <div className="w-3 h-3 bg-primary" />
              <span className="text-sm">OPERATIONAL</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
