# Packages

This directory contains reusable packages for the Dreadnought monorepo.

## Package Structure

Each package follows the pattern:
```
packages/
├── package-name/
│   ├── package.json
│   ├── src/
│   │   └── index.ts
│   ├── README.md
│   └── (tests)
```

## Available Packages

### @dreadnought/stellar-core

**Purpose**: Core Stellar blockchain utilities
**Key Features**: Network configuration, error types, API wrappers
**Dependencies**: `@stellar/stellar-sdk`, `effect`, `@effect/schema`
**Used By**: `crowd.mtla.me`, `stat.mtlf.me`

**Exports**:
- `getStellarConfig()` - Get network configuration (testnet/mainnet)
- `loadAccount()` - Load account from Horizon API
- `fetchOrderbook()` - Fetch orderbook for asset pair
- `getClaimableBalances()` - Get claimable balances for account
- Error types: `StellarError`, `EnvironmentError`, `TokenPriceError`

**Example**:
```typescript
import { getStellarConfig, loadAccount } from "@dreadnought/stellar-core";
import { Effect, pipe } from "effect";

const program = pipe(
  getStellarConfig(),
  Effect.flatMap((config) => loadAccount(config.server, "GABC..."))
);
```

See `packages/stellar-core/README.md` for full documentation.

---

### @dreadnought/stellar-utils

**Purpose**: Utility functions for Stellar assets and accounts
**Key Features**: Asset parsing/formatting, account validation, type conversions
**Dependencies**: `@stellar/stellar-sdk`
**Used By**: `crowd.mtla.me`, `stat.mtlf.me`, `@dreadnought/stellar-portfolio`

**Exports**:
- `createAsset()` - Create Stellar SDK Asset from AssetInfo
- `parseAssetString()` - Parse "CODE:ISSUER" format
- `formatAssetDisplay()` - Format asset for display
- `assetToInfo()` - Convert Asset to AssetInfo
- `isValidStellarAccountId()` - Validate account ID format
- `truncateAccountId()` - Truncate for display
- `formatAccountIdForDisplay()` - Format with validation options

**Example**:
```typescript
import { parseAssetString, truncateAccountId } from "@dreadnought/stellar-utils";

const asset = parseAssetString("EURMTL:GABC...");
const shortId = truncateAccountId("GACKTN5DA...");
```

See `packages/stellar-utils/README.md` for full documentation.

---

### @dreadnought/stellar-portfolio

**Purpose**: Portfolio management service for Stellar accounts
**Key Features**: Effect-TS service, balance parsing, token filtering
**Dependencies**: `@dreadnought/stellar-core`, `@dreadnought/stellar-utils`, `effect`, `@effect/schema`
**Used By**: `stat.mtlf.me`

**Exports**:
- `PortfolioService` - Service interface
- `PortfolioServiceTag` - Context tag for DI
- `PortfolioServiceLive` - Live service implementation
- `AccountPortfolio` - Portfolio data type
- `TokenBalance` - Token balance type

**Example**:
```typescript
import { PortfolioServiceLive, PortfolioServiceTag } from "@dreadnought/stellar-portfolio";
import { Effect, pipe } from "effect";

const program = pipe(
  PortfolioServiceTag,
  Effect.flatMap((service) => service.getAccountPortfolio("GABC..."))
);

await Effect.runPromise(Effect.provide(program, PortfolioServiceLive));
```

See `packages/stellar-portfolio/README.md` for full documentation.

---

## Creating New Packages

Only create packages when:
1. Code is proven in an app
2. Reuse is needed across multiple apps
3. Explicit request from development team

Follow the naming convention: `@dreadnought/package-name`

### Package Checklist

- ✅ Use Effect-TS for all async operations
- ✅ Include comprehensive README.md
- ✅ Write tests with ManagedRuntime pattern
- ✅ Use peerDependencies for effect and @effect/schema
- ✅ Export all types and interfaces
- ✅ Follow strict TypeScript configuration