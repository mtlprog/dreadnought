import * as S from "@effect/schema/Schema";
import { Effect, pipe } from "effect";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export type Locale = "en" | "ru";
export type Theme = "system" | "light" | "dark";

export class ServerActionError extends S.TaggedError<ServerActionError>()(
  "ServerActionError",
  {
    message: S.String,
    cause: S.optional(S.Unknown),
  },
) {}

// Effect-TS implementations
export const setLocaleEffect = (locale: Locale) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const cookieStore = await cookies();
        cookieStore.set("locale", locale, {
          path: "/",
          maxAge: 365 * 24 * 60 * 60, // 1 year
          sameSite: "lax",
        });
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to set locale cookie",
          cause: error,
        }),
    }),
    Effect.flatMap(() =>
      Effect.tryPromise({
        try: async () => {
          revalidatePath("/");
        },
        catch: (error) =>
          new ServerActionError({
            message: "Failed to revalidate path",
            cause: error,
          }),
      })
    ),
    Effect.tap(() => Effect.log(`Locale set to: ${locale}`)),
  );

export const setThemeEffect = (theme: Theme) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const cookieStore = await cookies();
        cookieStore.set("theme", theme, {
          path: "/",
          maxAge: 365 * 24 * 60 * 60, // 1 year
          sameSite: "lax",
        });
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to set theme cookie",
          cause: error,
        }),
    }),
    Effect.flatMap(() =>
      Effect.tryPromise({
        try: async () => {
          revalidatePath("/");
        },
        catch: (error) =>
          new ServerActionError({
            message: "Failed to revalidate path",
            cause: error,
          }),
      })
    ),
    Effect.tap(() => Effect.log(`Theme set to: ${theme}`)),
  );

export const getLocaleEffect = () =>
  pipe(
    Effect.tryPromise({
      try: async (): Promise<Locale> => {
        const cookieStore = await cookies();
        const locale = cookieStore.get("locale")?.value;
        return locale === "en" || locale === "ru" ? locale : "en";
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to get locale from cookies",
          cause: error,
        }),
    }),
    Effect.tap((locale) => Effect.log(`Locale retrieved: ${locale}`)),
  );

export const getThemeEffect = () =>
  pipe(
    Effect.tryPromise({
      try: async (): Promise<Theme> => {
        const cookieStore = await cookies();
        const theme = cookieStore.get("theme")?.value;
        return theme === "system" || theme === "light" || theme === "dark"
          ? theme
          : "system";
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to get theme from cookies",
          cause: error,
        }),
    }),
    Effect.tap((theme) => Effect.log(`Theme retrieved: ${theme}`)),
  );
