import { Effect, pipe } from "effect";
import * as S from "@effect/schema/Schema";

export type Locale = "en" | "ru";
export type Theme = "system" | "light" | "dark";

export class ServerActionError extends S.TaggedError<ServerActionError>()(
  "ServerActionError",
  {
    message: S.String,
    cause: S.optional(S.Unknown),
  }
) {}

// Client-side Effect wrappers for Server Actions
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
    Effect.tap(() => Effect.log(`Locale set to: ${locale}`))
  );

export const setThemeEffect = (theme: Theme) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const { setTheme } = await import("@/app/actions");
        await setTheme(theme);
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to set theme",
          cause: error,
        }),
    }),
    Effect.tap(() => Effect.log(`Theme set to: ${theme}`))
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
    Effect.tap((locale) => Effect.log(`Locale retrieved: ${locale}`))
  );

export const getThemeEffect = () =>
  pipe(
    Effect.tryPromise({
      try: async (): Promise<Theme> => {
        const { getTheme } = await import("@/app/actions");
        return getTheme();
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to get theme",
          cause: error,
        }),
    }),
    Effect.tap((theme) => Effect.log(`Theme retrieved: ${theme}`))
  );
