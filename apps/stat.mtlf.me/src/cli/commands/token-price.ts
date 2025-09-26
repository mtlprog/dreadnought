import chalk from "chalk";
import { Effect, pipe } from "effect";
import { type PriceService, PriceServiceTag } from "../../lib/stellar";
import type { AssetInfo } from "../../lib/stellar/types";
import { logErrorWithCause } from "../../lib/utils/error-handling";

export const getTokenPriceCommand = (
  tokenACode: string,
  tokenAIssuer: string,
  tokenBCode: string,
  tokenBIssuer: string,
): Effect.Effect<void, never, PriceService> =>
  pipe(
    Effect.gen(function*() {
      const priceService = yield* PriceServiceTag;

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
      pipe(
        Effect.logError(chalk.red("\n❌ Failed to calculate price:")),
        Effect.tap(() => logErrorWithCause(chalk.red("Error"))(error)),
      )
    ),
  );
