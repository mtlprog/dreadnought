"use client";

import { type Locale, LocaleServiceLive, LocaleServiceTag } from "@/services/locale";
import { Effect, pipe } from "effect";
import { useEffect, useState } from "react";
import enMessages from "../../messages/en.json";
import ruMessages from "../../messages/ru.json";

interface UseLocaleResult {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isLoading: boolean;
}

export function useLocaleEffect(initialLocale?: Locale): UseLocaleResult {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? "en");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (initialLocale !== undefined) {
      // If initial locale is provided from server, use it and set cookie
      const program = pipe(
        LocaleServiceTag,
        Effect.flatMap(service => service.setLocale(initialLocale)),
        Effect.tap(() =>
          Effect.sync(() => {
            setLocaleState(initialLocale);
            setIsLoading(false);
          })
        ),
        Effect.catchAll(() =>
          Effect.sync(() => {
            setLocaleState(initialLocale);
            setIsLoading(false);
          })
        ),
        Effect.provide(LocaleServiceLive),
      );
      void Effect.runPromise(program);
    } else {
      // Detect browser locale
      const program = pipe(
        LocaleServiceTag,
        Effect.flatMap(service => service.detectBrowserLocale),
        Effect.tap(detectedLocale =>
          Effect.sync(() => {
            setLocaleState(detectedLocale);
            setIsLoading(false);
          })
        ),
        Effect.catchAll(error =>
          Effect.sync(() => {
            console.error("Failed to detect locale:", error);
            setLocaleState("en");
            setIsLoading(false);
          })
        ),
        Effect.provide(LocaleServiceLive),
      );
      void Effect.runPromise(program);
    }
  }, [initialLocale]);

  const setLocale = (newLocale: Locale) => {
    const program = pipe(
      LocaleServiceTag,
      Effect.flatMap(service => service.setLocale(newLocale)),
      Effect.tap(() => Effect.sync(() => setLocaleState(newLocale))),
      Effect.catchAll(error => Effect.sync(() => console.error("Failed to set locale:", error))),
      Effect.provide(LocaleServiceLive),
    );

    void Effect.runPromise(program);
  };

  const t = (key: string): string => {
    // For synchronous usage in React components, we use the current locale state
    // In a real Effect-based app, this would be handled differently
    const messages = {
      en: enMessages,
      ru: ruMessages,
    };

    const getNestedValue = (obj: Readonly<Record<string, unknown>>, path: string): string => {
      const result = path.split(".").reduce((current: unknown, key: string) => {
        if (current !== null && typeof current === "object" && key in (current as Record<string, unknown>)) {
          return (current as Record<string, unknown>)[key];
        }
        return undefined;
      }, obj);
      return typeof result === "string" ? result : path;
    };

    return getNestedValue(messages[locale], key);
  };

  return {
    locale,
    setLocale,
    t,
    isLoading,
  };
}
