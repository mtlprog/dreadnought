import { Effect, pipe } from "effect";

// Re-export theme services from @dreadnought/theme
export { getThemeEffect, ServerActionError, setThemeEffect, type Theme } from "@dreadnought/theme";

// Import ServerActionError for locale actions
import { ServerActionError } from "@dreadnought/theme";

export type Locale = "en" | "ru";

// Locale-specific server actions (not in shared package yet)
export const setLocaleEffect = (locale: Locale) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const { setLocale } = await import("@/app/actions");
        await setLocale(locale);
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to set locale",
          cause: error,
        }),
    }),
    Effect.tap(() => Effect.log(`Locale set to: ${locale}`)),
  );

export const getLocaleEffect = () =>
  pipe(
    Effect.tryPromise({
      try: async (): Promise<Locale> => {
        const { getLocale } = await import("@/app/actions");
        return getLocale();
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to get locale",
          cause: error,
        }),
    }),
    Effect.tap((locale) => Effect.log(`Locale retrieved: ${locale}`)),
  );
