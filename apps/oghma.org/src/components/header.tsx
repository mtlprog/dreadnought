"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@dreadnought/ui";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, publicKey, isLoading, login, logout } = useAuth();

  const formatPublicKey = (key: string) => {
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

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

            {/* Wallet connection */}
            {isAuthenticated && publicKey ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">
                  {formatPublicKey(publicKey)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={logout}
                  disabled={isLoading}
                  className="border-2"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Disconnect wallet</span>
                </Button>
              </div>
            ) : (
              <Button
                className="hidden md:inline-flex uppercase tracking-wide"
                onClick={login}
                disabled={isLoading}
              >
                {isLoading ? "CONNECTING..." : "CONNECT WALLET"}
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
