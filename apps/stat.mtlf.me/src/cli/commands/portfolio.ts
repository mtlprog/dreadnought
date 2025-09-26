import chalk from "chalk";
import { Effect, pipe } from "effect";
import { PortfolioService } from "../../lib/stellar";

export const getPortfolioCommand = (
  accountId: string,
): Effect.Effect<void, never, PortfolioService> =>
  pipe(
    Effect.gen(function*() {
      const portfolioService = yield* PortfolioService;

      yield* Effect.log(chalk.cyan("\n🔍 Загружаю портфель...\n"));
      yield* Effect.log(chalk.gray(`Счет: ${accountId}`));
      yield* Effect.log(chalk.gray("-".repeat(60)));

      const portfolio = yield* portfolioService.getAccountPortfolio(accountId);

      yield* Effect.log(chalk.green("✅ Портфель загружен!"));
      yield* Effect.log(chalk.bold(`\n💰 XLM: ${portfolio.xlmBalance}`));

      if (portfolio.tokens.length > 0) {
        yield* Effect.log(chalk.bold(`\n📊 Токены (${portfolio.tokens.length}):`));
        for (const token of portfolio.tokens) {
          yield* Effect.log(chalk.white(`  ${token.asset.code}: ${token.balance}`));
          yield* Effect.log(chalk.dim(`    Issuer: ${token.asset.issuer}`));
        }
      } else {
        yield* Effect.log(chalk.dim("\nНет других токенов"));
      }
    }),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error(chalk.red("\n❌ Ошибка загрузки портфеля:"));
        if (error !== null && typeof error === "object") {
          const errorMessage = "message" in error ? error.message : JSON.stringify(error);
          console.error(chalk.red(errorMessage));
          if ("cause" in error && error.cause !== null && error.cause !== undefined) {
            console.error(chalk.dim("Причина:"), error.cause);
          }
        } else {
          console.error(chalk.red(String(error)));
        }
      })
    ),
  );
