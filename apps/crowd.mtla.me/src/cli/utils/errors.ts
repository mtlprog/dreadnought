import chalk from "chalk";
import { Effect, pipe } from "effect";
import type { CliError } from "../types";

// Shared error handling
export const handleCliError = (error: Readonly<CliError>): Effect.Effect<void, never> =>
  pipe(
    Effect.logError(chalk.red("❌ Error:"), error),
    Effect.flatMap(() => Effect.sync(() => process.exit(1))),
  );
