"use client";

import { useLocale } from "@/components/locale-client-provider";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { ExternalLink, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function Header() {
  const { t } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="h-20 border-b-4 border-primary bg-background relative">
      <div className="container h-full mx-auto px-4 md:px-6">
        <div className="h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 md:gap-4">
            <div className="w-8 h-8 md:w-12 md:h-12 border-2 md:border-4 border-primary bg-primary flex items-center justify-center">
              <div className="w-4 h-4 md:w-6 md:h-6 bg-background" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl font-black text-primary uppercase tracking-wider leading-none">
                {t("header.title")}
              </h1>
              <p className="text-xs md:text-sm font-mono text-muted-foreground uppercase leading-none">
                {t("header.subtitle")}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <Link
              href="/#projects-section"
              className="text-lg font-bold text-foreground hover:text-destructive transition-colors uppercase tracking-wide whitespace-nowrap"
            >
              {t("header.projects")}
            </Link>
            <a
              href="https://wiki.mtlprog.xyz/ru/crowd/home"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-lg font-bold text-foreground hover:text-destructive transition-colors uppercase tracking-wide whitespace-nowrap"
            >
              {t("header.wiki")}
              <ExternalLink className="w-4 h-4" />
            </a>
            <ModeToggle />
            <LocaleSwitcher />
          </nav>

          {/* Mobile Burger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden h-12 w-12 border-2 border-border bg-background text-foreground hover:border-primary hover:bg-primary/10 transition-all duration-300 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 top-20 bg-background/80 backdrop-blur-sm z-40"
            onClick={closeMobileMenu}
          />
          <nav className="md:hidden absolute top-full left-0 right-0 bg-background border-b-4 border-primary z-50">
            <div className="container mx-auto px-4">
              <div className="py-4 flex flex-col gap-2">
                <Link
                  href="/#projects-section"
                  onClick={closeMobileMenu}
                  className="h-12 flex items-center px-4 text-lg font-bold text-foreground hover:text-primary hover:bg-primary/10 transition-colors uppercase tracking-wide border-2 border-border"
                >
                  {t("header.projects")}
                </Link>
                <a
                  href="https://wiki.mtlprog.xyz/ru/crowd/home"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMobileMenu}
                  className="h-12 flex items-center justify-between px-4 text-lg font-bold text-foreground hover:text-primary hover:bg-primary/10 transition-colors uppercase tracking-wide border-2 border-border"
                >
                  {t("header.wiki")}
                  <ExternalLink className="w-4 h-4" />
                </a>
                <div className="h-px bg-border my-2" />
                <div className="flex items-center justify-end gap-2">
                  <ModeToggle />
                  <LocaleSwitcher />
                </div>
              </div>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
