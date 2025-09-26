import chalk from "chalk";
import { Effect, pipe } from "effect";
import { PriceService } from "../../lib/stellar";
import type { AssetInfo } from "../../lib/stellar/types";

export const getTokenPriceCommand = (
  tokenACode: string,
  tokenAIssuer: string,
  tokenBCode: string,
  tokenBIssuer: string,
): Effect.Effect<void, never, PriceService> =>
  pipe(
    Effect.gen(function*() {
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

      yield* Effect.log(chalk.cyan("\n🔍 Calculating token price...\n"));
      yield* Effect.log(
        chalk.gray(
          `Token A: ${tokenA.code}${tokenA.issuer !== "" ? ` (${tokenA.issuer})` : " (native)"}`,
        ),
      );
      yield* Effect.log(
        chalk.gray(
          `Token B: ${tokenB.code}${tokenB.issuer !== "" ? ` (${tokenB.issuer})` : " (native)"}`,
        ),
      );
      yield* Effect.log(chalk.gray("-".repeat(60)));

      const result = yield* priceService.getTokenPrice(tokenA, tokenB);

      yield* Effect.log(chalk.green("✅ Price calculation completed!"));
      yield* Effect.log(chalk.bold(`\n💰 Price: ${result.price}`));
      yield* Effect.log(chalk.dim(`📊 Pair: ${result.tokenA} / ${result.tokenB}`));
      yield* Effect.log(chalk.dim(`⏰ Timestamp: ${result.timestamp.toISOString()}`));
    }),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error(chalk.red("\n❌ Failed to calculate price:"));
        if (error !== null && typeof error === "object") {
          const errorMessage = "message" in error ? error.message : JSON.stringify(error);
          console.error(chalk.red(errorMessage));
          if ("cause" in error && error.cause !== null && error.cause !== undefined) {
            console.error(chalk.dim("Cause:"), error.cause);
          }
        } else {
          console.error(chalk.red(String(error)));
        }
      })
    ),
  );
