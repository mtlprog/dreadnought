# @dreadnought/stellar-portfolio

Portfolio management service for Stellar accounts using Effect-TS in the Dreadnought monorepo.

## Purpose

Provides Effect-TS service for:
- Fetching account balances from Stellar Horizon API
- Parsing token balances (filters liquidity pool shares and malformed tokens)
- Extracting XLM balance
- Type-safe portfolio management with Effect patterns

## Installation

```bash
bun add @dreadnought/stellar-portfolio
```

## Usage

### Basic Portfolio Fetching

```typescript
import { PortfolioServiceLive, PortfolioServiceTag } from "@dreadnought/stellar-portfolio";
import { Effect, pipe } from "effect";

const program = pipe(
  PortfolioServiceTag,
  Effect.flatMap((service) =>
    service.getAccountPortfolio("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V")
  )
);

const result = await Effect.runPromise(
  Effect.provide(program, PortfolioServiceLive)
);

console.log(`Account: ${result.accountId}`);
console.log(`XLM Balance: ${result.xlmBalance}`);
console.log(`Tokens: ${result.tokens.length}`);
```

### With Multiple Services

```typescript
import { PortfolioServiceLive, PortfolioServiceTag } from "@dreadnought/stellar-portfolio";
import { Effect, Layer, pipe } from "effect";

// Compose with other services
const AppLayer = Layer.merge(
  PortfolioServiceLive,
  // ... other service layers
);

const program = pipe(
  PortfolioServiceTag,
  Effect.flatMap((service) => service.getAccountPortfolio("GABC..."))
);

await Effect.runPromise(Effect.provide(program, AppLayer));
```

### Error Handling

```typescript
import { PortfolioServiceTag } from "@dreadnought/stellar-portfolio";
import { Effect, pipe } from "effect";

const program = pipe(
  PortfolioServiceTag,
  Effect.flatMap((service) => service.getAccountPortfolio("GABC...")),
  Effect.catchTag("StellarError", (error) => {
    console.error(`Stellar API error: ${error.operation}`);
    return Effect.succeed(null);
  }),
  Effect.catchTag("EnvironmentError", (error) => {
    console.error(`Missing env var: ${error.variable}`);
    return Effect.succeed(null);
  })
);
```

## API Reference

### Types

**`TokenBalance`**
```typescript
interface TokenBalance {
  readonly asset: AssetInfo;
  readonly balance: string;
  readonly limit?: string | undefined;
}
```

**`AccountPortfolio`**
```typescript
interface AccountPortfolio {
  readonly accountId: string;
  readonly tokens: readonly TokenBalance[];
  readonly xlmBalance: string;
}
```

**`PortfolioService`**
```typescript
interface PortfolioService {
  readonly getAccountPortfolio: (
    accountId: string,
  ) => Effect.Effect<AccountPortfolio, StellarError | EnvironmentError, never>;
}
```

### Service Tag

**`PortfolioServiceTag`**
- Context tag for PortfolioService
- Use with `Effect.flatMap` to access service

### Live Implementation

**`PortfolioServiceLive`**
- Layer providing live PortfolioService implementation
- Fetches from Stellar Horizon API
- Parses balances and filters invalid tokens

## Features

### Automatic Filtering

The service automatically filters out:
- Liquidity pool shares (`liquidity_pool_shares`)
- Malformed tokens (missing code or issuer)
- Invalid balance records

### Balance Parsing

Balance parsing logic:
1. Identifies native XLM balance
2. Extracts credit tokens (alphanum4/alphanum12)
3. Preserves trust line limits when available
4. Returns structured data with proper types

## Dependencies

- `@dreadnought/stellar-core` - Stellar config, errors, API wrappers
- `@dreadnought/stellar-utils` - Asset types (AssetInfo)
- `effect` - Effect-TS for functional programming
- `@effect/schema` - Schema validation

## Used By

- `apps/stat.mtlf.me` - Fund statistics dashboard

## Testing

```bash
bun test
```

All 5 tests pass covering:
- Account portfolio fetching (mock service)
- Empty portfolio handling
- Multiple tokens
- Optional limit field
- Type safety (readonly arrays)

## Environment Variables

Inherited from `@dreadnought/stellar-core`:
- `STELLAR_NETWORK` - Network to use ("testnet" or "mainnet", defaults to "testnet")

## Effect-TS Patterns

### Service Definition

The package follows Effect-TS best practices:
- Context tag for dependency injection
- Layer-based service implementation
- Type-safe error handling
- Pure functional transformations

### Testing with ManagedRuntime

```typescript
import { ManagedRuntime } from "effect";

const testRuntime = ManagedRuntime.make(PortfolioServiceLive);

try {
  const result = await testRuntime.runPromise(program);
  // assertions
} finally {
  await testRuntime.dispose(); // CRITICAL: always dispose
}
```

## Example: Multi-Account Portfolio

```typescript
import { PortfolioServiceTag } from "@dreadnought/stellar-portfolio";
import { Effect } from "effect";

const accounts = [
  "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
  "GAQ5ERJVI6IW5UVNPEVXUUVMXH3GCDHJ4BJAXMAAKPR5VBWWAUOMABIZ",
];

const program = pipe(
  PortfolioServiceTag,
  Effect.flatMap((service) =>
    Effect.all(
      accounts.map((accountId) => service.getAccountPortfolio(accountId)),
      { concurrency: 3 } // Limit concurrent requests
    )
  )
);

const portfolios = await Effect.runPromise(
  Effect.provide(program, PortfolioServiceLive)
);

const totalXlm = portfolios.reduce(
  (sum, p) => sum + parseFloat(p.xlmBalance),
  0
);
```

## Migration from App-Specific Code

If you have existing portfolio fetching code in your app:

1. Replace portfolio service imports:
   ```typescript
   // Before
   import { PortfolioService } from "@/lib/stellar/portfolio-service";

   // After
   import { PortfolioService } from "@dreadnought/stellar-portfolio";
   ```

2. Update Layer composition (if needed):
   ```typescript
   // No changes needed - layer API remains the same
   const AppLayer = Layer.merge(PortfolioServiceLive, OtherServiceLive);
   ```

3. Run tests and builds to verify compatibility
