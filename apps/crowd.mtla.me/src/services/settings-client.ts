import * as S from "@effect/schema/Schema";
import { Effect, pipe } from "effect";

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
        const { setTheme } = await import("@/app/actions");
        await setTheme(theme);
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to set theme",
          cause: error,
        }),
    }),
    Effect.tap(() => Effect.log(`Theme set to: ${theme}`)),
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
    Effect.tap((theme) => Effect.log(`Theme retrieved: ${theme}`)),
  );
