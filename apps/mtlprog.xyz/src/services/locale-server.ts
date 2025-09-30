import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer } from "effect";
import { cookies } from "next/headers";

// Import translation files
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

// Define supported locales
export const LocaleSchema = S.Literal("en", "ru");
export type Locale = S.Schema.Type<typeof LocaleSchema>;

// Error types
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
    locale: S.String,
    message: S.String,
  },
) {}

// Service interface
export interface LocaleServiceServer {
  readonly getLocale: () => Effect.Effect<Locale, LocaleError>;
  readonly t: (key: string) => Effect.Effect<string, TranslationError | LocaleError>;
}

export const LocaleServiceServerTag = Context.GenericTag<LocaleServiceServer>(
  "@mtlprog.xyz/LocaleServiceServer",
);

// Nested translation key access
const getNestedValue = (
  obj: Readonly<Record<string, unknown>>,
  path: string,
): string => {
  const result = path.split(".").reduce((current: unknown, key: string) => {
    if (
      current !== null &&
      typeof current === "object" &&
      key in (current as Record<string, unknown>)
    ) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof result === "string" ? result : path;
};

const messages = { en, ru } as const;

// Server-side service implementation
export const LocaleServiceServerLive = Layer.succeed(LocaleServiceServerTag, {
  getLocale: () =>
    Effect.tryPromise({
      try: async (): Promise<Locale> => {
        const cookieStore = await cookies();
        const locale = cookieStore.get("locale")?.value;
        if (locale === "en" || locale === "ru") {
          return locale;
        }
        return "en";
      },
      catch: (error) =>
        new LocaleError({
          message: "Failed to get locale from cookies",
          cause: error,
        }),
    }),

  t: (key: string) =>
    Effect.gen(function* () {
      const cookieStore = yield* Effect.promise(() => cookies());
      const locale = cookieStore.get("locale")?.value;
      const currentLocale = (locale === "en" || locale === "ru") ? locale : "en";

      const translation = getNestedValue(messages[currentLocale], key);
      if (translation === key) {
        return yield* Effect.fail(
          new TranslationError({
            key,
            locale: currentLocale,
            message: `Translation not found for key: ${key}`,
          })
        );
      }

      return translation;
    }),
});
