"use client";

import { useLocale } from "@/components/locale-provider";

const locales = [
  { code: "en", name: "EN" },
  { code: "ru", name: "RU" },
] as const;

export function LocaleSwitcher() {
  const { locale: currentLocale, setLocale } = useLocale();

  return (
    <div className="flex gap-2">
      {locales.map((locale) => (
        <button
          key={locale.code}
          onClick={() => setLocale(locale.code)}
          className={`
            px-3 py-1 text-sm font-bold uppercase tracking-wide transition-colors
            ${
            currentLocale === locale.code
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }
          `}
        >
          {locale.name}
        </button>
      ))}
    </div>
  );
}
