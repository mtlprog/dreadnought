import { Effect, pipe } from "effect";
import { PortfolioService } from "../../lib/stellar";
import chalk from "chalk";

export const getPortfolioCommand = (
  accountId: string,
): Effect.Effect<void, never, PortfolioService> =>
  pipe(
    Effect.gen(function* () {
      const portfolioService = yield* PortfolioService;

      console.log(chalk.cyan("\n🔍 Загружаю портфель...\n"));
      console.log(chalk.gray(`Счет: ${accountId}`));
      console.log(chalk.gray("-".repeat(60)));

      const portfolio = yield* portfolioService.getAccountPortfolio(accountId);

      console.log(chalk.green("✅ Портфель загружен!"));
      console.log(chalk.bold(`\n💰 XLM: ${portfolio.xlmBalance}`));

      if (portfolio.tokens.length > 0) {
        console.log(chalk.bold(`\n📊 Токены (${portfolio.tokens.length}):`));
        for (const token of portfolio.tokens) {
          console.log(chalk.white(`  ${token.asset.code}: ${token.balance}`));
          console.log(chalk.dim(`    Issuer: ${token.asset.issuer}`));
        }
      } else {
        console.log(chalk.dim("\nНет других токенов"));
      }
    }),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error(chalk.red("\n❌ Ошибка загрузки портфеля:"));
        if (error && typeof error === "object") {
          const errorMessage = "message" in error ? error.message : JSON.stringify(error);
          console.error(chalk.red(errorMessage));
          if ("cause" in error && error.cause) {
            console.error(chalk.dim("Причина:"), error.cause);
          }
        } else {
          console.error(chalk.red(String(error)));
        }
      }),
    ),
  );