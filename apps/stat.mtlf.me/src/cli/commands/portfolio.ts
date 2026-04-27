import chalk from "chalk";
import { Effect, pipe } from "effect";
import { type PortfolioService, PortfolioServiceTag } from "../../lib/stellar";
import { logErrorWithCause } from "../../lib/utils/error-handling";

export const getPortfolioCommand = (
  accountId: string,
): Effect.Effect<void, never, PortfolioService> =>
  pipe(
    Effect.gen(function*() {
      const portfolioService = yield* PortfolioServiceTag;

      yield* Effect.log(chalk.cyan("\n🔍 Loading portfolio...\n"));
      yield* Effect.log(chalk.gray(`Account: ${accountId}`));
      yield* Effect.log(chalk.gray("-".repeat(60)));

      const portfolio = yield* portfolioService.getAccountPortfolio(accountId);

      yield* Effect.log(chalk.green("✅ Portfolio loaded!"));
      yield* Effect.log(chalk.bold(`\n💰 XLM: ${portfolio.xlmBalance}`));

      if (portfolio.tokens.length > 0) {
        yield* Effect.log(chalk.bold(`\n📊 Tokens (${portfolio.tokens.length}):`));
        for (const token of portfolio.tokens) {
          yield* Effect.log(chalk.white(`  ${token.asset.code}: ${token.balance}`));
          yield* Effect.log(chalk.dim(`    Issuer: ${token.asset.issuer}`));
        }
      } else {
        yield* Effect.log(chalk.dim("\nNo other tokens"));
      }
    }),
    Effect.catchAll((error) =>
      pipe(
        Effect.logError(chalk.red("\n❌ Failed to load portfolio:")),
        Effect.tap(() => logErrorWithCause(chalk.red("Error"))(error)),
      )
    ),
  );
