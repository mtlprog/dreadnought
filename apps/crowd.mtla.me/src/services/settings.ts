import * as S from "@effect/schema/Schema";
import { Effect, pipe } from "effect";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export type Theme = "system" | "light" | "dark";

export class ServerActionError extends S.TaggedError<ServerActionError>()(
  "ServerActionError",
  {
    message: S.String,
    cause: S.optional(S.Unknown),
  },
) {}

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

export const getThemeEffect = () =>
  pipe(
    Effect.tryPromise({
      try: async (): Promise<Theme> => {
        const cookieStore = await cookies();
        const theme = cookieStore.get("theme")?.value;
        return theme === "system" || theme === "light" || theme === "dark"
          ? theme
          : "dark";
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to get theme from cookies",
          cause: error,
        }),
    }),
    Effect.tap((theme) => Effect.log(`Theme retrieved: ${theme}`)),
  );
