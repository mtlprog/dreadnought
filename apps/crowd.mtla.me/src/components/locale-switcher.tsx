"use client";

import { useLocale } from "@/components/locale-client-provider";
import { Globe } from "lucide-react";
import { useState } from "react";

const locales = [
  { code: "en", name: "EN" },
  { code: "ru", name: "RU" },
] as const;

export function LocaleSwitcher() {
  const { locale: currentLocale, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (localeCode: "en" | "ru") => {
    setIsOpen(false);
    setLocale(localeCode);
  };

  const currentLabel = locales.find((l) => l.code === currentLocale)?.name || "EN";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 px-3 border-2 border-border bg-background/90 backdrop-blur-sm text-foreground hover:border-primary hover:bg-primary/10 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer"
        aria-label="Select language"
      >
        <Globe className="w-5 h-5" />
        <span className="text-xs font-bold tracking-wider">{currentLabel}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-24 border-2 border-border bg-background shadow-[0_0_20px_rgba(105,240,174,0.2)] z-50">
            {locales.map((locale) => (
              <button
                key={locale.code}
                onClick={() => handleSelect(locale.code)}
                className={`w-full h-10 px-4 text-sm font-bold uppercase tracking-wider transition-all duration-200 border-b border-border last:border-b-0 ${
                  currentLocale === locale.code
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-primary hover:text-primary-foreground"
                }`}
              >
                {locale.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
