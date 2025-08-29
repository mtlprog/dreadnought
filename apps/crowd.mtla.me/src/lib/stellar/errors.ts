import * as S from "@effect/schema/Schema";

// Error types for Stellar operations
export class StellarError extends S.TaggedError<StellarError>()(
  "StellarError",
  {
    cause: S.Unknown,
    operation: S.String,
  },
) {}

export class EnvironmentError extends S.TaggedError<EnvironmentError>()(
  "EnvironmentError",
  {
    variable: S.String,
  },
) {}

export type StellarServiceError = StellarError | EnvironmentError;
