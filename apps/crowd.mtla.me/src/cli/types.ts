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
import { EnvironmentError as StellarEnvError, StellarError as StellarErr } from "@/lib/stellar";

export { StellarEnvError as EnvironmentError, StellarErr as StellarError };
export type { StellarServiceError } from "@/lib/stellar";

export type CliError = ValidationError | PinataError | StellarErr | StellarEnvError;
