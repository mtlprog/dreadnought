"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

type Locale = "en" | "ru";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

const messages = {
  en,
  ru,
};

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const result = path.split(".").reduce((current: unknown, key: string) => {
    if (current !== null && typeof current === "object" && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof result === "string" ? result : path;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
  return null;
}

function setCookie(name: string, value: string, days: number = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";

  // Check cookie first
  const savedLocale = getCookie("locale");
  if (savedLocale !== null && (savedLocale === "en" || savedLocale === "ru")) {
    return savedLocale as Locale;
  }

  // Check localStorage for migration
  const localStorageLocale = localStorage.getItem("locale");
  if (localStorageLocale !== null && (localStorageLocale === "en" || localStorageLocale === "ru")) {
    // Migrate to cookie
    setCookie("locale", localStorageLocale);
    localStorage.removeItem("locale");
    return localStorageLocale as Locale;
  }

  // Check browser language
  const browserLang = navigator.language.slice(0, 2);
  if (browserLang === "ru") {
    setCookie("locale", "ru");
    return "ru";
  }

  setCookie("locale", "en");
  return "en";
}

interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? "en");

  useEffect(() => {
    // Only detect locale on client if no initial locale was provided from server
    if (initialLocale === undefined) {
      const detected = detectLocale();
      setLocaleState(detected);
    } else {
      // If initial locale provided from server, ensure cookie is set for future requests
      setCookie("locale", initialLocale);
    }
  }, [initialLocale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setCookie("locale", newLocale);
  };

  const t = (key: string): string => {
    return getNestedValue(messages[locale], key);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === null) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}