"use client";

import { useLocale } from "@/components/locale-client-provider";
import { LocaleSwitcher } from "@/components/locale-switcher";
import Link from "next/link";

export function Header() {
  const { t } = useLocale();

  return (
    <header className="border-b-4 border-primary bg-background">
      <div className="container mx-auto px-4 py-4 md:px-6 md:py-6">
        <div className="flex items-center justify-between">
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

          <nav className="flex items-center gap-2 md:gap-8">
            <Link
              href="/#projects-section"
              className="text-sm md:text-lg font-bold text-foreground hover:text-destructive transition-colors uppercase tracking-wide whitespace-nowrap"
            >
              {t("header.projects")}
            </Link>
            <LocaleSwitcher />
          </nav>
        </div>
      </div>
    </header>
  );
}
