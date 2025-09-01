"use client";

import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer, pipe } from "effect";

// Error definitions
export class StellarUriError extends S.TaggedError<StellarUriError>()(
  "StellarUriError",
  {
    cause: S.Unknown,
    operation: S.String,
  },
) {}

export class ValidationError extends S.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: S.String,
    message: S.String,
  },
) {}

// Service interface
export interface StellarUriService {
  readonly addStellarUri: (stellarUri: string) => Effect.Effect<string, StellarUriError | ValidationError>;
}

export const StellarUriServiceTag = Context.GenericTag<StellarUriService>(
  "@crowd.mtla.me/StellarUriService",
);

// Response schema (kept for future use)
// const ApiResponseSchema = S.Struct({
//   error: S.optional(S.String),
//   telegramUrl: S.optional(S.String),
// });

const addStellarUriImpl = (stellarUri: string): Effect.Effect<string, StellarUriError | ValidationError> =>
  pipe(
    Effect.logInfo("Starting Stellar URI request"),
    Effect.flatMap(() => Effect.logInfo(`Original URI: ${stellarUri}`)),
    Effect.flatMap(() =>
      // Validate URI format
      stellarUri.startsWith("web+stellar:")
        ? Effect.succeed(stellarUri)
        : Effect.fail(new ValidationError({ field: "stellarUri", message: "Invalid Stellar URI format" }))
    ),
    Effect.tap(() => Effect.logInfo(`Decoded URI: ${decodeURIComponent(stellarUri)}`)),
    Effect.map((uri) => {
      // Add return_url if not present
      if (!uri.includes("return_url=")) {
        const separator = uri.includes("?") ? "&" : "?";
        const currentUrl = typeof window !== "undefined" ? window.location.href : "";
        const modifiedUri = `${uri}${separator}return_url=${encodeURIComponent(currentUrl)}`;
        return modifiedUri;
      }
      return uri;
    }),
    Effect.tap((modifiedUri) => Effect.logInfo(`Modified URI: ${modifiedUri}`)),
    Effect.flatMap((modifiedUri) =>
      pipe(
        Effect.logInfo("Sending request to API"),
        Effect.flatMap(() =>
          Effect.tryPromise({
            try: () =>
              fetch("/api/stellar-uri", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ stellarUri: modifiedUri }),
              }),
            catch: (error) => new StellarUriError({ cause: error, operation: "fetch_api" }),
          })
        ),
        Effect.tap((response) => Effect.logInfo(`API response status: ${response.status}`)),
        Effect.flatMap((response) =>
          pipe(
            Effect.tryPromise({
              try: () => response.json() as Promise<{ error?: string; telegramUrl?: string }>,
              catch: (error) => new StellarUriError({ cause: error, operation: "parse_json" }),
            }),
            Effect.tap((data) => Effect.logInfo(`Parsed response: ${JSON.stringify(data)}`)),
            Effect.flatMap((data) => {
              if (!response.ok) {
                const errorMessage = data.error ?? `Request failed: ${response.status}`;
                return Effect.fail(new StellarUriError({ cause: errorMessage, operation: "api_error" }));
              }

              if (data.telegramUrl === undefined || data.telegramUrl === null || data.telegramUrl === "") {
                return Effect.fail(
                  new StellarUriError({
                    cause: "No Telegram URL returned from the server",
                    operation: "validate_response",
                  }),
                );
              }

              return pipe(
                Effect.logInfo(`Successfully obtained URL: ${data.telegramUrl}`),
                Effect.map(() => data.telegramUrl as string),
              );
            }),
          )
        ),
      )
    ),
  );

export const StellarUriServiceLive = Layer.succeed(
  StellarUriServiceTag,
  StellarUriServiceTag.of({
    addStellarUri: addStellarUriImpl,
  }),
);

/**
 * Legacy function for backward compatibility
 * @deprecated Use StellarUriService instead
 */
export const addStellarUri = (stellarUri: string): Promise<string> =>
  pipe(
    addStellarUriImpl(stellarUri),
    Effect.provide(StellarUriServiceLive),
    Effect.runPromise,
  );
