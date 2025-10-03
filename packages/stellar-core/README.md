# @dreadnought/stellar-core

Core Stellar blockchain utilities for Dreadnought monorepo.

## Purpose

Provides foundational functionality for interacting with Stellar Horizon API:
- Network configuration (testnet/mainnet)
- Error types with Effect-TS integration
- API wrappers for common Horizon operations

## Installation

```bash
bun add @dreadnought/stellar-core
```

## Usage

### Stellar Configuration

```typescript
import { getStellarConfig } from "@dreadnought/stellar-core";
import { Effect } from "effect";

const program = pipe(
  getStellarConfig(),
  Effect.map((config) => {
    console.log(`Network: ${config.network}`);
    console.log(`Server: ${config.server.serverURL}`);
    return config;
  })
);

await Effect.runPromise(program);
```

### API Wrappers

```typescript
import { getStellarConfig, loadAccount } from "@dreadnought/stellar-core";
import { Effect, pipe } from "effect";

const program = pipe(
  getStellarConfig(),
  Effect.flatMap((config) =>
    loadAccount(config.server, "GABC...")
  ),
  Effect.map((account) => {
    console.log(`Account ID: ${account.id}`);
    console.log(`Balances: ${account.balances.length}`);
  })
);

await Effect.runPromise(program);
```

### Error Handling

```typescript
import { getStellarConfig, loadAccount, StellarError } from "@dreadnought/stellar-core";
import { Effect, pipe } from "effect";

const program = pipe(
  getStellarConfig(),
  Effect.flatMap((config) => loadAccount(config.server, "INVALID")),
  Effect.catchTag("StellarError", (error) => {
    console.error(`Stellar error: ${error.operation}`);
    return Effect.succeed(null);
  })
);
```

## API Reference

### Configuration

**`getStellarConfig()`**
- Returns: `Effect<StellarConfig, EnvironmentError>`
- Reads `STELLAR_NETWORK` env var (defaults to "testnet")

**`StellarConfig`**
```typescript
interface StellarConfig {
  readonly network: string;
  readonly server: Horizon.Server;
  readonly networkPassphrase: string;
}
```

### API Wrappers

**`loadAccount(server, accountId)`**
- Loads account from Horizon API
- Returns: `Effect<AccountResponse, StellarError>`

**`fetchOrderbook(server, selling, buying)`**
- Fetches orderbook for asset pair
- Returns: `Effect<OrderbookResponse, StellarError>`

**`getClaimableBalances(server, claimantAccountId)`**
- Gets claimable balances for account
- Returns: `Effect<ClaimableBalanceRecord[], StellarError>`

### Error Types

**`StellarError`**
- Thrown when Horizon API operations fail
- Fields: `operation: string`, `cause: unknown`

**`EnvironmentError`**
- Thrown when environment variables are missing
- Fields: `variable: string`

**`TokenPriceError`**
- Thrown when price calculation fails
- Fields: `message: string`, `tokenA?: string`, `tokenB?: string`, `cause?: unknown`

## Environment Variables

- `STELLAR_NETWORK` - Network to use ("testnet" or "mainnet", defaults to "testnet")

## Dependencies

- `@stellar/stellar-sdk` - Stellar SDK for blockchain operations
- `effect` - Effect-TS for functional programming
- `@effect/schema` - Schema validation and error types

## Used By

- `@dreadnought/stellar-utils` - Asset and account utilities
- `@dreadnought/stellar-portfolio` - Portfolio services
- `apps/crowd.mtla.me` - Crowdfunding platform
- `apps/stat.mtlf.me` - Fund statistics dashboard
