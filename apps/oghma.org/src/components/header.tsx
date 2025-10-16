"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@dreadnought/ui";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="border-b-4 border-primary bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 md:px-6 md:py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 md:gap-4 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 md:w-12 md:h-12 border-2 md:border-4 border-primary bg-primary/10 flex items-center justify-center">
              <span className="text-lg md:text-2xl font-black text-primary">
                Ω
              </span>
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black uppercase tracking-wide text-foreground">
                OGHMA.ORG
              </h1>
              <p className="text-xs md:text-sm font-mono uppercase text-muted-foreground">
                FREE COURSES
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-2 md:gap-6">
            <Link
              href="/courses"
              className="text-sm md:text-lg font-bold uppercase text-foreground hover:text-primary transition-colors"
            >
              COURSES
            </Link>

            <Link
              href="/profile"
              className="text-sm md:text-lg font-bold uppercase text-foreground hover:text-primary transition-colors"
            >
              PROFILE
            </Link>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="border-2 border-border"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Wallet connection (placeholder for now) */}
            <Button className="hidden md:inline-flex uppercase tracking-wide">
              CONNECT WALLET
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
