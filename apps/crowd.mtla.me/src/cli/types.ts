import * as S from "@effect/schema/Schema";

// CLI-specific error types
export class ValidationError extends S.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: S.String,
    message: S.String,
  },
) {}

export class PinataError extends S.TaggedError<PinataError>()(
  "PinataError",
  {
    cause: S.Unknown,
    operation: S.String,
  },
) {}

// Re-export from @dreadnought/stellar-core for convenience
import {
  EnvironmentError as StellarEnvError,
  StellarError as StellarErr,
  type StellarServiceError,
  TokenPriceError,
} from "@dreadnought/stellar-core";

export { StellarEnvError as EnvironmentError, StellarErr as StellarError, TokenPriceError };
export type { StellarServiceError };

export type CliError = ValidationError | PinataError | StellarErr | StellarEnvError | TokenPriceError;
