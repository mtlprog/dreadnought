import * as S from "@effect/schema/Schema";

/**
 * Error thrown when Stellar Horizon API operations fail
 * Used for loadAccount, fetchOrderbook, getClaimableBalances, etc.
 */
export class StellarError extends S.TaggedError<StellarError>()(
  "StellarError",
  {
    cause: S.Unknown,
    operation: S.String,
  },
) {}

/**
 * Error thrown when required environment variables are missing or invalid
 * Used for STELLAR_NETWORK, STELLAR_ACCOUNT_ID, etc.
 */
export class EnvironmentError extends S.TaggedError<EnvironmentError>()(
  "EnvironmentError",
  {
    variable: S.String,
  },
) {}

/**
 * Error thrown when token price calculation fails
 * Used in price discovery (orderbook and path finding)
 */
export class TokenPriceError extends S.TaggedError<TokenPriceError>()(
  "TokenPriceError",
  {
    message: S.String,
    tokenA: S.optional(S.String),
    tokenB: S.optional(S.String),
    cause: S.optional(S.Unknown),
  },
) {}

/**
 * Union type of all Stellar service errors
 */
export type StellarServiceError = StellarError | EnvironmentError | TokenPriceError;
