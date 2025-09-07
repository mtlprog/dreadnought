"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="border-b-4 border-primary bg-background">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary bg-primary flex items-center justify-center">
              <div className="w-6 h-6 bg-background" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-primary uppercase tracking-wider">
                MTL CROWD
              </h1>
              <p className="text-sm font-mono text-muted-foreground uppercase">
                MONTELIBERO FUNDING
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-8">
            <Link
              href="/#projects-section"
              className="text-lg font-bold text-foreground hover:text-destructive transition-colors uppercase tracking-wide"
            >
              PROJECTS
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
