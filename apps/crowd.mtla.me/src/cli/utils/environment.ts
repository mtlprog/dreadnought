import chalk from "chalk";
import { Context, Effect, pipe } from "effect";
import type { EnvironmentError } from "../types";

export interface EnvironmentService {
  readonly getRequired: (key: Readonly<string>) => Effect.Effect<string, EnvironmentError>;
}

export const EnvironmentServiceCli = Context.GenericTag<EnvironmentService>(
  "@crowd.mtla.me/cli/EnvironmentService",
);

// Shared environment validation
export const checkEnvironmentVariables = (
  requiredVars: readonly string[],
): Effect.Effect<void, EnvironmentError, EnvironmentService> =>
  pipe(
    Effect.logInfo(chalk.blue("🔍 Checking environment variables...")),
    Effect.flatMap(() => EnvironmentServiceCli),
    Effect.flatMap(env =>
      Effect.all(
        requiredVars.map((varName: Readonly<string>) => env.getRequired(varName)),
        { concurrency: "unbounded" },
      )
    ),
    Effect.flatMap(() => Effect.logInfo(chalk.green("✅ Environment variables OK\n"))),
  );
