"use client";

import { runClientEffect } from "@/lib/runtime";
import { getLocaleEffect, type Locale, setLocaleEffect } from "@/services/settings-client";
import { Effect, pipe } from "effect";
import { Globe } from "lucide-react";
import { useEffect, useState } from "react";

const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ru", label: "RU" },
];

export function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<Locale>("en");

  useEffect(() => {
    const program = pipe(
      getLocaleEffect(),
      Effect.tap((locale) => Effect.sync(() => setCurrentLocale(locale))),
    );

    void runClientEffect(program);
  }, []);

  const handleSelect = (locale: Locale) => {
    setIsOpen(false);
    setCurrentLocale(locale);

    const program = pipe(
      setLocaleEffect(locale),
      Effect.tap(() => Effect.log(`Language changed to: ${locale}`)),
    );

    void runClientEffect(program);
  };

  const currentLabel = LOCALES.find((l) => l.value === currentLocale)?.label || "EN";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 min-w-12 px-3 border-2 border-border bg-background/90 backdrop-blur-sm text-foreground hover:border-primary hover:bg-primary/10 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center gap-2"
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
          <div className="absolute right-0 mt-2 w-24 border-2 border-border bg-background shadow-[0_0_20px_rgba(0,217,255,0.2)] z-50">
            {LOCALES.map((locale) => (
              <button
                key={locale.value}
                onClick={() => handleSelect(locale.value)}
                className={`w-full h-10 px-4 text-sm font-bold uppercase tracking-wider transition-all duration-200 border-b border-border last:border-b-0 ${
                  currentLocale === locale.value
                    ? "bg-primary"
                    : "text-foreground hover:bg-primary"
                }`}
                style={
                  currentLocale === locale.value || undefined
                    ? { color: "hsl(var(--primary-foreground))" }
                    : undefined
                }
                onMouseEnter={(e) => {
                  if (currentLocale !== locale.value) {
                    e.currentTarget.style.color = "hsl(var(--primary-foreground))";
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentLocale !== locale.value) {
                    e.currentTarget.style.color = "";
                  }
                }}
              >
                {locale.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
