# stat.mtlf.me - Montelibero Fund Statistics Dashboard

A Next.js 15 dApp that displays real-time statistics and portfolio composition for the Montelibero Fund on the Stellar blockchain. Built with Effect-TS, showcasing fund structure, token prices, and aggregated holdings across multiple accounts.

**Parent Documentation**: See `/CLAUDE.md` for monorepo-wide guidelines, Effect-TS patterns, design system, and testing strategies.

## ⚠️ Documentation Maintenance

**IMPORTANT**: When making changes to app logic, you MUST update this documentation:

1. **This file** (`apps/stat.mtlf.me/CLAUDE.md`) - Update relevant sections
2. **Detailed guides** in `apps/stat.mtlf.me/docs/guides/`:
   - `price-discovery.md` - When modifying PriceService or pricing algorithms
   - `fund-structure-service.md` - When modifying FundStructureService, adding accounts, or changing data flow

**What to update**:
- Service interfaces and function signatures
- Data flow diagrams and pipelines
- Error handling patterns
- Configuration options
- CLI commands
- Integration examples

**When to update**:
- Adding new services or layers
- Modifying existing service logic
- Adding/removing fund accounts
- Changing price discovery algorithms
- Adding new CLI commands
- Updating error handling strategies

Keep documentation in sync with code to ensure future developers (including yourself) can quickly understand the system.

## Overview

**Purpose**: Real-time dashboard for tracking Montelibero Fund assets across multiple Stellar accounts with automatic price discovery and portfolio valuation.

**Key Features**:
- Multi-account fund structure visualization
- Real-time token price discovery (orderbook + path finding)
- Aggregated portfolio totals in EURMTL and XLM
- CLI tools for manual price checks and portfolio analysis
- Client-side data fetching with progress indicators
- Tooltips showing price calculation details (bid/ask/path)

**Tech Stack**:
- Next.js 15 (App Router, React 19)
- Effect-TS for all async operations
- Stellar SDK 12.3.0
- Tailwind CSS 4 with retrofuturistic design
- next-themes for theme switching

## Project Structure

```
apps/stat.mtlf.me/
├── src/
│   ├── cli/                    # CLI tools
│   │   ├── index.ts           # Main CLI entry point
│   │   ├── layers.ts          # CLI Effect layers (AppLayer)
│   │   └── commands/
│   │       ├── portfolio.ts   # Portfolio CLI commands
│   │       └── token-price.ts # Price calculation commands
│   ├── components/
│   │   ├── portfolio/
│   │   │   ├── fund-structure-table.tsx  # Main fund table
│   │   │   ├── portfolio-client.tsx      # Client wrapper
│   │   │   └── portfolio-demo.tsx        # Demo component
│   │   ├── layout/
│   │   │   └── footer.tsx     # App footer
│   │   └── ui/               # UI components (shadcn-style)
│   │       ├── stellar-asset.tsx   # Asset display component
│   │       ├── stellar-account.tsx # Account display component
│   │       └── [other shadcn components]
│   ├── hooks/
│   │   └── use-fund-data.ts   # Fund data fetching hook with progress
│   ├── lib/
│   │   ├── stellar/
│   │   │   ├── config.ts           # Stellar network config
│   │   │   ├── errors.ts           # Stellar error types
│   │   │   ├── types.ts            # Stellar type definitions
│   │   │   ├── portfolio-service.ts # Portfolio fetching
│   │   │   ├── price-service.ts     # Token price discovery
│   │   │   ├── fund-structure-service.ts # Fund composition
│   │   │   └── index.ts            # Service exports
│   │   ├── services/
│   │   │   └── fund-data-client.ts # API client for fund data
│   │   ├── errors/
│   │   │   └── fund-data-errors.ts # Client-side errors
│   │   └── utils/
│   │       ├── error-handling.ts   # Error handling utilities
│   │       └── utils.ts            # General utilities (cn, etc.)
│   └── app/                   # Next.js 15 App Router (no files yet)
└── package.json
```

## Core Services (Effect-TS)

### 1. PortfolioService (src/lib/stellar/portfolio-service.ts)

Fetches account balances and token holdings from Stellar Horizon API.

```typescript
interface PortfolioService {
  readonly getAccountPortfolio: (
    accountId: string,
  ) => Effect.Effect<AccountPortfolio, StellarError | EnvironmentError>;
}
```

**Key Function**: `getAccountPortfolio(accountId: string)`
- Loads account from Horizon API
- Parses all token balances (filters out liquidity pool shares)
- Returns tokens array + XLM balance
- Uses `Effect.tryPromise` to wrap Horizon API calls

**Implementation Pattern**:
```typescript
pipe(
  getStellarConfig(),
  Effect.flatMap((config) =>
    pipe(
      loadAccountBalances(config.server, accountId),
      Effect.flatMap(parseBalances),
      Effect.map(({ tokens, xlmBalance }) => ({
        accountId,
        tokens,
        xlmBalance,
      }))
    )
  )
);
```

### 2. PriceService (src/lib/stellar/price-service.ts)

Discovers token prices using orderbook and path finding algorithms.

```typescript
interface PriceService {
  readonly getTokenPrice: (
    tokenA: AssetInfo,
    tokenB: AssetInfo,
  ) => Effect.Effect<TokenPairPrice, TokenPriceError | StellarError | EnvironmentError>;

  readonly getTokensWithPrices: (
    tokens: readonly { asset: AssetInfo; balance: string }[],
    baseTokens: { eurmtl: AssetInfo; xlm: AssetInfo },
  ) => Effect.Effect<readonly TokenPriceWithBalance[], ...>;
}
```

**Price Discovery Strategy**: Two-tier system (orderbook → path finding)
- **Tier 1**: Direct orderbook (mid-price from bid/ask)
- **Tier 2**: Path finding with multi-hop analysis

**Concurrency**: 5 concurrent tokens, 3 concurrent path hops

**📘 Full Price Discovery Guide**: See `docs/guides/price-discovery.md` for complete details on orderbook trading, path finding algorithms, error handling, and CLI usage.

### 3. FundStructureService (src/lib/stellar/fund-structure-service.ts)

Aggregates portfolio data across all Montelibero Fund accounts.

```typescript
interface FundStructureService {
  readonly getFundStructure: () => Effect.Effect<
    FundStructureData,
    TokenPriceError | StellarError | EnvironmentError,
    PortfolioService | PriceService
  >;
  readonly getFundAccounts: () => Effect.Effect<readonly FundAccount[], never>;
}
```

**Fund Accounts** (6 total from `/docs/FUND_STRUCTURE.md`):
- 1 Main Issuer (GACKTN...)
- 5 Subfonds (MABIZ, LABR, CITY, MTLM, DEFI)

**Key Features**:
- Schema validation for all accounts (`@effect/schema`)
- Concurrency: 3 accounts processed in parallel
- Liquid token filtering (only tokens with prices count toward totals)
- Graceful error handling (partial results on failures)

**📘 Full Fund Structure Guide**: See `docs/guides/fund-structure-service.md` for complete details on data flow, account management, liquid vs illiquid tokens, error handling, and adding new accounts.

### 4. FundDataClient (src/lib/services/fund-data-client.ts)

Client-side service for fetching fund structure from API.

```typescript
interface FundDataClient {
  readonly fetchFundStructure: () => Effect.Effect<
    FundStructureData,
    FundDataFetchError | FundDataParseError | FundDataNetworkError
  >;
}
```

**Error Handling**:
- `FundDataNetworkError`: Failed to connect to API
- `FundDataFetchError`: HTTP error (non-200 status)
- `FundDataParseError`: Invalid JSON or schema validation failed

**Schema Validation**: Uses `@effect/schema` to validate API response structure

## CLI Tools

### Running CLI Commands

```bash
# Set environment first
export STELLAR_NETWORK=mainnet  # or testnet

# Run CLI
bun run cli [command]
```

### Available Commands

**1. Generic Price Check**:
```bash
bun run cli price \
  -a MTL \
  --token-a-issuer GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V \
  -b EURMTL \
  --token-b-issuer GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V
```

**2. Predefined Pairs**:
```bash
# MTL price in EURMTL (Montelibero tokens)
bun run cli mtl-eurmtl

# XLM price in USDC (example)
bun run cli xlm-usdc
```

**CLI Layer Composition** (src/cli/layers.ts):
```typescript
export const AppLayer = Layer.merge(
  PriceServiceLive,
  PortfolioServiceLive
);
```

**CLI Execution Pattern**:
```typescript
const program = pipe(
  getTokenPriceCommand(tokenA, issuerA, tokenB, issuerB),
  Effect.provide(AppLayer),
);

BunRuntime.runMain(program);
```

## Client-Side Data Fetching

### useFundData Hook (src/hooks/use-fund-data.ts)

Custom React hook with progress tracking and error handling.

**Features**:
- Progressive loading indicator (simulated progress + actual progress)
- Safe unmount handling with `useRef`
- Effect.fork for background progress updates
- Schedule-based progress simulation (500ms intervals)

**Usage**:
```typescript
const { data, isLoading, error, progress } = useFundData();
```

**State Management**:
```typescript
interface UseFundDataState {
  data: FundStructureData | null;
  isLoading: boolean;
  error: string | null;
  progress: number; // 0-100
}
```

**Progress Flow**:
1. Initial: `10%`
2. Simulated increases: Random increments (capped at 90%)
3. Data received: `95%`
4. Delay 300ms: `100%`
5. Display data after 300ms delay

## UI Components

### FundStructureTable (src/components/portfolio/fund-structure-table.tsx)

Main table component displaying fund structure with nested accounts.

**Features**:
- Sticky table headers
- Account type indicators (ISSUER/SUBFOND/OPERATIONAL)
- Color-coded account sections (border-cyber-green)
- Tooltips with price details (orderbook vs path finding)
- XLM balance row + token rows per account
- Aggregated totals footer

**Price Tooltip Format**:
- **Orderbook**: Shows BID, ASK, and MID price
- **Path Finding**: Shows multi-hop path with prices for each hop

**Color Scheme**:
- `cyber-green`: Account borders, headers, totals
- `electric-cyan`: Value columns
- `warning-amber`: Total values, type indicators
- `steel-gray`: Labels, descriptions

### StellarAsset (src/components/ui/stellar-asset.tsx)

Component for displaying Stellar asset codes with optional issuer.

**Props**:
```typescript
interface StellarAssetProps {
  assetCode: string;
  assetIssuer?: string;
  className?: string;
}
```

### StellarAccount (src/components/ui/stellar-account.tsx)

Component for displaying Stellar account IDs with truncation and copy-to-clipboard.

**Props**:
```typescript
interface StellarAccountProps {
  accountId: string;
  className?: string;
}
```

## Configuration

### Stellar Network (src/lib/stellar/config.ts)

**Environment Variable**: `STELLAR_NETWORK`
- `mainnet`: https://horizon.stellar.org
- `testnet` (default): https://horizon-testnet.stellar.org

```typescript
export const getStellarConfig = (): Effect.Effect<StellarConfig, EnvironmentError> =>
  pipe(
    Effect.sync(() => process.env["STELLAR_NETWORK"] ?? "testnet"),
    Effect.map((network) => ({
      network,
      server: new Horizon.Server(
        network === "mainnet"
          ? "https://horizon.stellar.org"
          : "https://horizon-testnet.stellar.org"
      ),
      networkPassphrase: network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
    }))
  );
```

**Usage in Services**: All services call `getStellarConfig()` to get network configuration

## Error Types

### Stellar Errors (src/lib/stellar/errors.ts)

```typescript
// Horizon API errors
class StellarError extends S.TaggedError<StellarError>()(
  "StellarError",
  {
    cause: S.Unknown,
    operation: S.String, // "loadAccount", "fetchOrderbook", etc.
  }
) {}

// Environment configuration errors
class EnvironmentError extends S.TaggedError<EnvironmentError>()(
  "EnvironmentError",
  {
    variable: S.String,
  }
) {}

// Price calculation errors
class TokenPriceError extends S.TaggedError<TokenPriceError>()(
  "TokenPriceError",
  {
    message: S.String,
    tokenA: S.optional(S.String),
    tokenB: S.optional(S.String),
    cause: S.optional(S.Unknown),
  }
) {}
```

### Client Errors (src/lib/errors/fund-data-errors.ts)

```typescript
class FundDataNetworkError extends S.TaggedError // fetch() failed
class FundDataFetchError extends S.TaggedError   // HTTP error
class FundDataParseError extends S.TaggedError   // JSON/schema error
```

## Testing

### Test Files
- `src/lib/stellar/fund-structure-service.test.ts`: Fund structure service tests

### Testing Pattern (ManagedRuntime)

**IMPORTANT**: See `/CLAUDE.md` for complete Effect-TS testing patterns. Always use `ManagedRuntime.make()` and `dispose()`.

```typescript
describe("FundStructureService", () => {
  test("should get fund structure", async () => {
    const testRuntime = ManagedRuntime.make(
      Layer.merge(
        FundStructureServiceLive,
        Layer.merge(PortfolioServiceLive, PriceServiceLive)
      )
    );

    try {
      const program = pipe(
        FundStructureServiceTag,
        Effect.flatMap((service) => service.getFundStructure())
      );

      const result = await testRuntime.runPromise(program);
      expect(result.accounts.length).toBeGreaterThan(0);
    } finally {
      await testRuntime.dispose();
    }
  });
});
```

## Development Workflow

### Running the App

```bash
# Development
bun dev

# Build
bun build

# Lint
bun lint

# CLI
bun run cli
```

### Environment Setup

Create `.env.local`:
```bash
STELLAR_NETWORK=mainnet  # or testnet
```

### Adding New Fund Accounts

1. Update `/docs/FUND_STRUCTURE.md`
2. Update `FUND_ACCOUNTS_RAW` in `src/lib/stellar/fund-structure-service.ts`
3. Ensure account follows schema validation:
   ```typescript
   {
     id: "G..." // 56 chars, starts with G
     name: string // non-empty
     type: "issuer" | "subfond" | "operational"
     description: string // non-empty
   }
   ```

### Adding New Price Pairs

For CLI predefined pairs, edit `src/cli/index.ts`:

```typescript
program
  .command("my-token-pair")
  .description("Get TOKEN1 price in TOKEN2")
  .action(() => {
    const program = pipe(
      getTokenPriceCommand("TOKEN1", "ISSUER1", "TOKEN2", "ISSUER2"),
      Effect.provide(AppLayer),
    );
    BunRuntime.runMain(program);
  });
```

## Design System Notes

**Color Palette** (Montelibero Fund theme):
- `cyber-green`: Primary actions, account borders
- `electric-cyan`: Value highlights
- `warning-amber`: Total summaries
- `steel-gray`: Secondary text, borders

**Typography**:
- Monospace font for all numbers, codes, addresses
- UPPERCASE for labels, headers, system messages
- Minimum 7:1 contrast ratio

**Component Guidelines**:
- Zero border-radius (angular aesthetic)
- Large touch targets (48px minimum)
- Sticky headers for long tables
- Tooltips for complex data (price details)

## Key Patterns

### 1. Service Composition

```typescript
// CLI Layer
export const AppLayer = Layer.merge(
  PriceServiceLive,
  PortfolioServiceLive
);

// Service usage with dependencies
pipe(
  Effect.all({
    portfolioService: PortfolioServiceTag,
    priceService: PriceServiceTag,
  }),
  Effect.flatMap(({ portfolioService, priceService }) =>
    // use both services
  )
);
```

### 2. Error Handling with Fallbacks

```typescript
// Try primary method, fallback to secondary
pipe(
  primaryMethod(),
  Effect.catchAll((error) =>
    pipe(
      Effect.log(`Primary failed: ${error}, trying fallback`),
      Effect.flatMap(() => fallbackMethod())
    )
  )
);
```

### 3. Concurrency Control

```typescript
// Limit concurrent requests to avoid rate limiting
Effect.all(
  items.map(processItem),
  { concurrency: 3 }
);
```

### 4. Client-Side Effect Execution

```typescript
// In React components
const program = pipe(
  Effect.tryPromise({ try: () => fetch("/api/...") }),
  Effect.flatMap(parseResponse),
  Effect.tap(updateState),
  Effect.catchAll(handleError)
);

Effect.runPromise(program).catch(() => {
  // Error already handled by Effect
});
```

## Common Issues

### 1. Rate Limiting

**Symptom**: Horizon API returns 429 errors
**Solution**: Reduce concurrency in `Effect.all({ concurrency: N })`

### 2. Path Finding Failures

**Symptom**: No price found for illiquid tokens
**Solution**: Prices return `null` gracefully, UI shows "—"

### 3. Account Not Found

**Symptom**: StellarError with "Account not found"
**Solution**: Verify account exists on correct network (mainnet vs testnet)

## Future Enhancements

- [ ] Add API routes (currently only client-side)
- [ ] Server-side rendering for fund structure data
- [ ] Historical price charts
- [ ] Price alerts and notifications
- [ ] Export fund reports (CSV, PDF)
- [ ] Multi-language support (i18n)
- [ ] WebSocket for real-time price updates
- [ ] Cache layer for price data (reduce Horizon API calls)

## Related Documentation

- `/CLAUDE.md`: Monorepo guidelines, Effect-TS patterns, design system
- `/docs/FUND_STRUCTURE.md`: Montelibero Fund account structure
- `/packages/README.md`: Available packages for code reuse
- `/docs/guides/design-system.md`: Complete design system documentation
- `/docs/guides/effect-ts-testing.md`: Testing patterns with ManagedRuntime
