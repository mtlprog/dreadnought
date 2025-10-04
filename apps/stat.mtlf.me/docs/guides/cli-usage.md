# CLI Usage Guide

Complete guide to using the stat.mtlf.me command-line interface for price checks and portfolio analysis.

## Setup

### Environment Configuration

```bash
# Required
export STELLAR_NETWORK=mainnet  # or testnet

# For specific CLI commands
cd apps/stat.mtlf.me
```

### Running CLI

```bash
# From app directory
bun run cli [command]

# Or with full path
cd /path/to/dreadnought/apps/stat.mtlf.me
bun run cli [command]
```

## Available Commands

### 1. Generic Token Price

Get price for any token pair:

```bash
bun run cli price \
  -a <TOKEN_A_CODE> \
  --token-a-issuer <ISSUER_A> \
  -b <TOKEN_B_CODE> \
  --token-b-issuer <ISSUER_B>
```

**Example**: MTL price in EURMTL

```bash
bun run cli price \
  -a MTL \
  --token-a-issuer GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V \
  -b EURMTL \
  --token-b-issuer GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V
```

**Output**:
```
Price discovery for MTL/EURMTL
Source: orderbook
Bid: 0.95
Ask: 1.05
Mid: 1.00
```

### 2. Predefined Pairs

#### MTL/EURMTL Price

```bash
bun run cli mtl-eurmtl
```

Equivalent to the full command above, using predefined Montelibero Fund tokens.

#### XLM/USDC Price

```bash
bun run cli xlm-usdc
```

Get XLM price in USDC (for reference pricing).

**Output**:
```
Price discovery for XLM/USDC
Source: path
Hops: 2
  1. XLM → EURMTL (rate: 0.12)
  2. EURMTL → USDC (rate: 1.08)
Final price: 0.1296 USDC per XLM
```

### 3. Portfolio Analysis

```bash
bun run cli portfolio [account-id]
```

**Example**:
```bash
bun run cli portfolio GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V
```

**Output**:
```
Portfolio for GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V

XLM Balance: 1,234.56 XLM

Tokens:
┌─────────┬──────────┬────────────┬──────────────┬──────────────┐
│ Code    │ Balance  │ EURMTL     │ XLM          │ Value (EUR)  │
├─────────┼──────────┼────────────┼──────────────┼──────────────┤
│ EURMTL  │ 5,000.00 │ 1.00       │ 8.33         │ 5,000.00     │
│ MTL     │ 2,500.00 │ 0.50       │ 4.17         │ 1,250.00     │
│ RARE    │ 100.00   │ —          │ —            │ —            │
└─────────┴──────────┴────────────┴──────────────┴──────────────┘

Total Value: 6,250.00 EURMTL (520.83 XLM)
Illiquid Tokens: 1 (RARE)
```

## CLI Implementation

### Layer Composition

**File**: `src/cli/layers.ts`

```typescript
import { Layer } from "effect";
import { PriceServiceLive } from "@/lib/stellar/price-service";
import { PortfolioServiceLive } from "@/lib/stellar/portfolio-service";

export const AppLayer = Layer.merge(
  PriceServiceLive,
  PortfolioServiceLive
);
```

### Command Structure

**File**: `src/cli/index.ts`

```typescript
import { Command } from "commander";
import { BunRuntime } from "@effect/platform-bun";
import { Effect, pipe } from "effect";
import { AppLayer } from "./layers";
import { getTokenPriceCommand } from "./commands/token-price";
import { getPortfolioCommand } from "./commands/portfolio";

const program = new Command();

program
  .name("stat-cli")
  .description("CLI for Montelibero Fund statistics")
  .version("1.0.0");

// Generic price command
program
  .command("price")
  .description("Get token price")
  .requiredOption("-a, --token-a <code>", "Token A code")
  .requiredOption("--token-a-issuer <issuer>", "Token A issuer")
  .requiredOption("-b, --token-b <code>", "Token B code")
  .requiredOption("--token-b-issuer <issuer>", "Token B issuer")
  .action((options) => {
    const effectProgram = pipe(
      getTokenPriceCommand(
        options.tokenA,
        options.tokenAIssuer,
        options.tokenB,
        options.tokenBIssuer
      ),
      Effect.provide(AppLayer)
    );

    BunRuntime.runMain(effectProgram);
  });

// Predefined MTL/EURMTL
program
  .command("mtl-eurmtl")
  .description("Get MTL price in EURMTL")
  .action(() => {
    const effectProgram = pipe(
      getTokenPriceCommand(
        "MTL",
        "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
        "EURMTL",
        "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V"
      ),
      Effect.provide(AppLayer)
    );

    BunRuntime.runMain(effectProgram);
  });

program.parse();
```

### Price Command Implementation

**File**: `src/cli/commands/token-price.ts`

```typescript
import { Effect, pipe } from "effect";
import { PriceServiceTag } from "@/lib/stellar/price-service";

export const getTokenPriceCommand = (
  tokenACode: string,
  tokenAIssuer: string,
  tokenBCode: string,
  tokenBIssuer: string
) =>
  pipe(
    PriceServiceTag,
    Effect.flatMap((priceService) =>
      priceService.getTokenPrice(
        {
          code: tokenACode,
          issuer: tokenAIssuer,
          type: tokenAIssuer ? "credit_alphanum4" : "native",
        },
        {
          code: tokenBCode,
          issuer: tokenBIssuer,
          type: tokenBIssuer ? "credit_alphanum4" : "native",
        }
      )
    ),
    Effect.tap((result) =>
      Effect.sync(() => {
        console.log(`\nPrice discovery for ${tokenACode}/${tokenBCode}`);
        console.log(`Source: ${result.source ?? "not found"}`);

        if (result.source === "orderbook" && result.details) {
          console.log(`Bid: ${result.details.bid}`);
          console.log(`Ask: ${result.details.ask}`);
          console.log(`Mid: ${result.price}`);
        } else if (result.source === "path" && result.details?.hops) {
          console.log(`Hops: ${result.details.hops.length}`);
          result.details.hops.forEach((hop, i) => {
            console.log(`  ${i + 1}. ${hop.from} → ${hop.to} (rate: ${hop.rate})`);
          });
          console.log(`Final price: ${result.price} ${tokenBCode} per ${tokenACode}`);
        } else {
          console.log("No price found");
        }
      })
    ),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error("\nError:", error);
        process.exit(1);
      })
    )
  );
```

### Portfolio Command Implementation

**File**: `src/cli/commands/portfolio.ts`

```typescript
import { Effect, pipe } from "effect";
import { PortfolioServiceTag } from "@/lib/stellar/portfolio-service";
import { PriceServiceTag } from "@/lib/stellar/price-service";

export const getPortfolioCommand = (accountId: string) =>
  pipe(
    Effect.all({
      portfolioService: PortfolioServiceTag,
      priceService: PriceServiceTag,
    }),
    Effect.flatMap(({ portfolioService, priceService }) =>
      pipe(
        portfolioService.getAccountPortfolio(accountId),
        Effect.flatMap((portfolio) =>
          pipe(
            priceService.getTokensWithPrices(portfolio.tokens, {
              eurmtl: {
                code: "EURMTL",
                issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
                type: "credit_alphanum4",
              },
              xlm: { code: "XLM", issuer: "", type: "native" },
            }),
            Effect.map((tokensWithPrices) => ({
              portfolio,
              tokensWithPrices,
            }))
          )
        )
      )
    ),
    Effect.tap(({ portfolio, tokensWithPrices }) =>
      Effect.sync(() => {
        console.log(`\nPortfolio for ${accountId}`);
        console.log(`\nXLM Balance: ${formatNumber(portfolio.xlmBalance)} XLM`);

        console.log("\nTokens:");
        console.table(
          tokensWithPrices.map((token) => ({
            Code: token.asset.code,
            Balance: formatNumber(token.balance),
            "EURMTL Price": token.priceInEURMTL ?? "—",
            "XLM Price": token.priceInXLM ?? "—",
            "Value (EUR)": token.valueInEURMTL
              ? formatNumber(token.valueInEURMTL.toString())
              : "—",
          }))
        );

        const totalValue = tokensWithPrices.reduce(
          (sum, t) => sum + (t.valueInEURMTL ?? 0),
          0
        );
        const illiquidCount = tokensWithPrices.filter(
          (t) => t.priceInEURMTL === null
        ).length;

        console.log(`\nTotal Value: ${formatNumber(totalValue.toString())} EURMTL`);
        if (illiquidCount > 0) {
          console.log(`Illiquid Tokens: ${illiquidCount}`);
        }
      })
    ),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error("\nError:", error);
        process.exit(1);
      })
    )
  );

const formatNumber = (value: string): string => {
  const num = parseFloat(value);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};
```

## Execution Pattern

### BunRuntime for CLI

All CLI commands use `BunRuntime.runMain()`:

```typescript
const program = pipe(
  getTokenPriceCommand(tokenA, issuerA, tokenB, issuerB),
  Effect.provide(AppLayer)
);

BunRuntime.runMain(program);
```

**Why BunRuntime?**
- Optimized for Bun runtime
- Automatic error handling
- Process exit on completion
- No need for manual `dispose()`

### Error Handling

```typescript
pipe(
  command(),
  Effect.catchAll((error) =>
    Effect.sync(() => {
      console.error("Error:", error);
      process.exit(1);
    })
  )
);
```

## Adding New Commands

### Step 1: Create Command Module

**File**: `src/cli/commands/my-command.ts`

```typescript
import { Effect, pipe } from "effect";
import { MyServiceTag } from "@/lib/services/my-service";

export const getMyCommand = (params: MyParams) =>
  pipe(
    MyServiceTag,
    Effect.flatMap((service) => service.myMethod(params)),
    Effect.tap((result) =>
      Effect.sync(() => {
        console.log("Result:", result);
      })
    )
  );
```

### Step 2: Register in CLI

**File**: `src/cli/index.ts`

```typescript
import { getMyCommand } from "./commands/my-command";

program
  .command("my-command")
  .description("My new command")
  .requiredOption("-p, --param <value>", "Parameter")
  .action((options) => {
    const effectProgram = pipe(
      getMyCommand(options.param),
      Effect.provide(AppLayer)
    );

    BunRuntime.runMain(effectProgram);
  });
```

### Step 3: Update Layer (if needed)

**File**: `src/cli/layers.ts`

```typescript
export const AppLayer = Layer.merge(
  Layer.merge(PriceServiceLive, PortfolioServiceLive),
  MyServiceLive // Add new service
);
```

## Common Patterns

### Formatting Output

```typescript
// Numbers
const formatNumber = (value: string, decimals = 2): string => {
  const num = parseFloat(value);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

// Tables
console.table(
  items.map((item) => ({
    Column1: item.field1,
    Column2: formatNumber(item.field2),
  }))
);

// Colors (with chalk)
import chalk from "chalk";

console.log(chalk.green("Success!"));
console.log(chalk.red("Error!"));
console.log(chalk.blue("Info"));
```

### Progress Indicators

```typescript
import ora from "ora";

const spinner = ora("Loading...").start();

pipe(
  longRunningOperation(),
  Effect.tap(() =>
    Effect.sync(() => {
      spinner.succeed("Done!");
    })
  ),
  Effect.catchAll((error) =>
    Effect.sync(() => {
      spinner.fail(`Error: ${error}`);
    })
  )
);
```

### Interactive Prompts

```typescript
import inquirer from "inquirer";

const askForConfirmation = () =>
  Effect.tryPromise({
    try: async () => {
      const answers = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmed",
          message: "Continue?",
          default: false,
        },
      ]);
      return answers.confirmed;
    },
    catch: (error) => new InteractionError({ cause: error }),
  });

// Usage
pipe(
  askForConfirmation(),
  Effect.flatMap((confirmed) =>
    confirmed
      ? performAction()
      : Effect.sync(() => console.log("Cancelled"))
  )
);
```

## Debugging

### Verbose Logging

```typescript
// Add verbose flag
program.option("-v, --verbose", "Verbose output");

// In command
pipe(
  operation(),
  Effect.tap(() =>
    options.verbose
      ? Effect.log("Debug: operation completed")
      : Effect.void
  )
);
```

### Error Stack Traces

```typescript
Effect.catchAll((error) =>
  Effect.sync(() => {
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  })
);
```

## See Also

- **[Services Guide](/apps/stat.mtlf.me/docs/guides/services.md)** - Service implementations
- **[Price Discovery](/apps/stat.mtlf.me/docs/guides/price-discovery.md)** - Price discovery details
- **[Effect-TS Patterns](/docs/guides/effect-ts-patterns.md)** - Core Effect-TS patterns
- **[Commander.js Documentation](https://github.com/tj/commander.js)** - CLI framework
