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

export class TokenPriceError extends S.TaggedError<TokenPriceError>()(
  "TokenPriceError",
  {
    message: S.String,
    tokenA: S.optional(S.String),
    tokenB: S.optional(S.String),
    cause: S.optional(S.Unknown),
  },
) {}

export type StellarServiceError = StellarError | EnvironmentError | TokenPriceError;
