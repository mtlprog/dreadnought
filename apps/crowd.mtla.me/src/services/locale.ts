import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer, pipe } from "effect";

export const Locale = S.Literal("en", "ru");
export type Locale = S.Schema.Type<typeof Locale>;

export class CookieError extends S.TaggedError<CookieError>()(
  "CookieError",
  {
    operation: S.String,
    message: S.String,
    cause: S.optional(S.Unknown),
  },
) {}

export class LocaleError extends S.TaggedError<LocaleError>()(
  "LocaleError",
  {
    message: S.String,
    cause: S.optional(S.Unknown),
  },
) {}

export class TranslationError extends S.TaggedError<TranslationError>()(
  "TranslationError",
  {
    key: S.String,
    locale: Locale,
    message: S.String,
  },
) {}

export interface LocaleService {
  readonly getLocale: Effect.Effect<Locale, LocaleError>;
  readonly setLocale: (locale: Locale) => Effect.Effect<void, CookieError>;
  readonly t: (key: string) => Effect.Effect<string, TranslationError | LocaleError>;
  readonly detectBrowserLocale: Effect.Effect<Locale, LocaleError>;
}

export const LocaleService = Context.GenericTag<LocaleService>("@dreadnought/LocaleService");

const getCookieEffect = (name: string): Effect.Effect<string | null, CookieError> =>
  pipe(
    Effect.try({
      try: () => {
        if (typeof document === "undefined") return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
        return null;
      },
      catch: (error) =>
        new CookieError({
          operation: "read",
          message: `Failed to read cookie: ${name}`,
          cause: error,
        }),
    }),
  );

const setCookieEffect = (name: string, value: string, days: number = 365): Effect.Effect<void, CookieError> =>
  pipe(
    Effect.try({
      try: () => {
        if (typeof document === "undefined") return;
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
      },
      catch: (error) =>
        new CookieError({
          operation: "write",
          message: `Failed to set cookie: ${name}`,
          cause: error,
        }),
    }),
  );

const getLocalStorageEffect = (key: string): Effect.Effect<string | null, LocaleError> =>
  pipe(
    Effect.try({
      try: () => {
        if (typeof globalThis === "undefined" || typeof globalThis.localStorage === "undefined") {
          return null;
        }
        return globalThis.localStorage.getItem(key);
      },
      catch: (error) =>
        new LocaleError({
          message: `Failed to read localStorage: ${key}`,
          cause: error,
        }),
    }),
  );

const removeLocalStorageEffect = (key: string): Effect.Effect<void, LocaleError> =>
  pipe(
    Effect.try({
      try: () => {
        if (typeof globalThis !== "undefined" && typeof globalThis.localStorage !== "undefined") {
          globalThis.localStorage.removeItem(key);
        }
      },
      catch: (error) =>
        new LocaleError({
          message: `Failed to remove localStorage: ${key}`,
          cause: error,
        }),
    }),
  );

const getBrowserLanguageEffect = (): Effect.Effect<Locale, LocaleError> =>
  pipe(
    Effect.try({
      try: () => {
        if (typeof globalThis === "undefined" || typeof globalThis.navigator === "undefined") {
          return "en" as Locale;
        }
        const lang = globalThis.navigator.language.slice(0, 2);
        return (lang === "ru" ? "ru" : "en");
      },
      catch: (error) =>
        new LocaleError({
          message: "Failed to get browser language",
          cause: error,
        }),
    }),
  );

// Load translation messages
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

const messages = { en, ru } as const;

const getNestedValue = (obj: Record<string, unknown>, path: string): string => {
  const result = path.split(".").reduce((current: unknown, key: string) => {
    if (current !== null && typeof current === "object" && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof result === "string" ? result : path;
};

export const LocaleServiceLive = Layer.succeed(LocaleService, {
  getLocale: pipe(
    getCookieEffect("locale"),
    Effect.map(cookieValue => {
      if (cookieValue === "en" || cookieValue === "ru") {
        return cookieValue;
      }
      return "en" as Locale;
    }),
    Effect.catchAll(() => Effect.succeed("en" as Locale)),
  ),

  setLocale: (locale: Locale) => setCookieEffect("locale", locale),

  t: (key: string) =>
    pipe(
      getCookieEffect("locale"),
      Effect.map(cookieValue => {
        const locale = (cookieValue === "en" || cookieValue === "ru") ? cookieValue : "en";
        return getNestedValue(messages[locale], key);
      }),
      Effect.mapError(() =>
        new TranslationError({
          key,
          locale: "en",
          message: `Failed to translate key: ${key}`,
        })
      ),
    ),

  detectBrowserLocale: pipe(
    getCookieEffect("locale"),
    Effect.flatMap(cookieValue => {
      // Return cookie locale if valid
      if (cookieValue === "en" || cookieValue === "ru") {
        return Effect.succeed(cookieValue as Locale);
      }

      // Check localStorage for migration
      return pipe(
        getLocalStorageEffect("locale"),
        Effect.flatMap(localStorageValue => {
          if (localStorageValue === "en" || localStorageValue === "ru") {
            return pipe(
              setCookieEffect("locale", localStorageValue),
              Effect.zipRight(removeLocalStorageEffect("locale")),
              Effect.map(() => localStorageValue as Locale),
              Effect.catchAll(() => Effect.succeed(localStorageValue as Locale)),
            );
          }

          // Use browser language detection
          return pipe(
            getBrowserLanguageEffect(),
            Effect.flatMap(browserLang =>
              pipe(
                setCookieEffect("locale", browserLang),
                Effect.map(() => browserLang),
                Effect.catchAll(() => Effect.succeed(browserLang)),
              )
            ),
          );
        }),
      );
    }),
    Effect.catchAll(() => Effect.succeed("en" as Locale)),
  ),
});
