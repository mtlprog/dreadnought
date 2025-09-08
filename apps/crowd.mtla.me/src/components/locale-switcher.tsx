"use client";

import { useLocale } from "@/components/locale-client-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const locales = [
  { code: "en", name: "EN" },
  { code: "ru", name: "RU" },
] as const;

export function LocaleSwitcher() {
  const { locale: currentLocale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 border-2 border-primary hover:bg-primary hover:text-background transition-colors">
          <Globe className="h-4 w-4 md:h-5 md:w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => setLocale(locale.code)}
            className={`
              font-bold uppercase tracking-wide cursor-pointer
              ${currentLocale === locale.code ? "bg-primary text-background" : ""}
            `}
          >
            {locale.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
