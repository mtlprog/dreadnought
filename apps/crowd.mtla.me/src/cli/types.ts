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

// Re-export from lib/stellar for convenience
export { EnvironmentError, StellarError } from "@/lib/stellar";
import type { EnvironmentError, StellarError } from "@/lib/stellar";

export type CliError = ValidationError | PinataError | StellarError | EnvironmentError;
