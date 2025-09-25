import { Effect, pipe } from "effect";
import { PriceService } from "../../lib/stellar";
import { AssetInfo } from "../../lib/stellar/types";
import chalk from "chalk";

export const getTokenPriceCommand = (
  tokenACode: string,
  tokenAIssuer: string,
  tokenBCode: string,
  tokenBIssuer: string,
): Effect.Effect<void, never, PriceService> =>
  pipe(
    Effect.gen(function* () {
      const priceService = yield* PriceService;

      // Handle native XLM tokens
      const tokenA: AssetInfo = {
        code: tokenACode,
        issuer: tokenAIssuer === "native" ? "" : tokenAIssuer,
        type: tokenACode === "XLM" && tokenAIssuer === "native" ? "native" : "credit_alphanum4",
      };

      const tokenB: AssetInfo = {
        code: tokenBCode,
        issuer: tokenBIssuer === "native" ? "" : tokenBIssuer,
        type: tokenBCode === "XLM" && tokenBIssuer === "native" ? "native" : "credit_alphanum4",
      };

      console.log(chalk.cyan("\n🔍 Calculating token price...\n"));
      console.log(
        chalk.gray(
          `Token A: ${tokenA.code}${tokenA.issuer ? " (" + tokenA.issuer + ")" : " (native)"}`,
        ),
      );
      console.log(
        chalk.gray(
          `Token B: ${tokenB.code}${tokenB.issuer ? " (" + tokenB.issuer + ")" : " (native)"}`,
        ),
      );
      console.log(chalk.gray("-".repeat(60)));

      const result = yield* priceService.getTokenPrice(tokenA, tokenB);

      console.log(chalk.green("✅ Price calculation completed!"));
      console.log(chalk.bold(`\n💰 Price: ${result.price}`));
      console.log(chalk.dim(`📊 Pair: ${result.tokenA} / ${result.tokenB}`));
      console.log(chalk.dim(`⏰ Timestamp: ${result.timestamp.toISOString()}`));
    }),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error(chalk.red("\n❌ Failed to calculate price:"));
        if (error && typeof error === "object") {
          const errorMessage = "message" in error ? error.message : JSON.stringify(error);
          console.error(chalk.red(errorMessage));
          if ("cause" in error && error.cause) {
            console.error(chalk.dim("Cause:"), error.cause);
          }
        } else {
          console.error(chalk.red(String(error)));
        }
      }),
    ),
  );