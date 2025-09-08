"use client";

import { type Locale } from "@/services/locale";
import { createContext, useContext, type ReactNode } from "react";
import { useLocaleEffect } from "@/hooks/use-locale-effect";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isLoading: boolean;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

interface LocaleClientProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function LocaleClientProvider({ children, initialLocale }: LocaleClientProviderProps) {
  const localeData = useLocaleEffect(initialLocale);

  return (
    <LocaleContext.Provider value={localeData}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === null) {
    throw new Error("useLocale must be used within LocaleClientProvider");
  }
  return context;
}