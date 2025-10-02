#!/usr/bin/env bun

import { BunRuntime } from "@effect/platform-bun";
import { Command } from "commander";
import { Effect, pipe } from "effect";
import { getTokenPriceCommand } from "./commands/token-price";
import { AppLayer } from "./layers";

// CLI setup
const program = new Command();

program
  .name("stat-cli")
  .description("CLI for Montelibero Statistics")
  .version("1.0.0");

program
  .command("price")
  .description("Calculate token price relative to another token")
  .requiredOption("-a, --token-a <code>", "Token A code (e.g., MTL)")
  .requiredOption("--token-a-issuer <issuer>", "Token A issuer address")
  .requiredOption("-b, --token-b <code>", "Token B code (e.g., EURMTL)")
  .requiredOption("--token-b-issuer <issuer>", "Token B issuer address")
  .action((options) => {
    BunRuntime.runMain(
      pipe(
        getTokenPriceCommand(
          options.tokenA,
          options.tokenAIssuer,
          options.tokenB,
          options.tokenBIssuer,
        ),
        Effect.provide(AppLayer),
      ),
    );
  });

// Predefined token pairs for Montelibero
program
  .command("mtl-eurmtl")
  .description("Get MTL price in EURMTL (Montelibero tokens on mainnet)")
  .action(() => {
    // Real Montelibero token addresses on mainnet
    const MTL_ISSUER = "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V";
    const EURMTL_ISSUER = "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V";

    BunRuntime.runMain(
      pipe(
        getTokenPriceCommand("MTL", MTL_ISSUER, "EURMTL", EURMTL_ISSUER),
        Effect.provide(AppLayer),
      ),
    );
  });

program
  .command("xlm-usdc")
  .description("Get XLM price in USDC (example on mainnet)")
  .action(() => {
    BunRuntime.runMain(
      pipe(
        getTokenPriceCommand("XLM", "native", "USDC", "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"),
        Effect.provide(AppLayer),
      ),
    );
  });

program.parse();
