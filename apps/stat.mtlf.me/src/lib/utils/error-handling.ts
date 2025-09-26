import { Effect, pipe } from "effect";

export interface ErrorLike {
  readonly message?: string;
  readonly cause?: unknown;
}

export const formatError = (error: unknown): string => {
  if (error !== null && typeof error === "object") {
    const errorObj = error as ErrorLike;
    return errorObj.message ?? JSON.stringify(error);
  }
  return String(error);
};

export const logErrorWithCause = (prefix: string) => (error: unknown) =>
  pipe(
    Effect.logError(`${prefix}: ${formatError(error)}`),
    Effect.tap(() => {
      if (error !== null && typeof error === "object") {
        const errorObj = error as ErrorLike;
        return errorObj.cause !== null && errorObj.cause !== undefined
          ? Effect.logError(`Cause: ${String(errorObj.cause)}`)
          : Effect.void;
      }
      return Effect.void;
    })
  );

export const handleStateError = <T>(
  setError: (message: string) => void,
  setLoading?: (loading: boolean) => void
) => (error: unknown) =>
  pipe(
    Effect.logError(`Operation failed: ${formatError(error)}`),
    Effect.tap(() => Effect.sync(() => {
      setError(formatError(error));
      if (setLoading) setLoading(false);
    }))
  );