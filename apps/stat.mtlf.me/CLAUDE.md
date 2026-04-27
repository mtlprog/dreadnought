# stat.mtlf.me - Montelibero Fund Statistics Dashboard

Real-time statistics and portfolio composition for Montelibero Fund on Stellar blockchain.

**Parent**: `/CLAUDE.md` - Monorepo-wide guidelines, Effect-TS patterns, design system, testing

## Overview

**Purpose**: Dashboard for tracking fund assets across multiple Stellar accounts with automatic price discovery

**Key Features**:
- Dashboard `/` with subfund pie chart, key indicator history, full indicator grid
- Fund details `/fund` with multi-account fund structure table
- All data fetched from external API at `https://stat.mtlprog.xyz/api/v1/...` — no local backend
- Real-time token price discovery via Stellar Horizon (CLI only)
- CLI tools for manual price checks

**Tech Stack**: Next.js 15, Effect-TS (CLI), Stellar SDK 12.3.0, Tailwind CSS 4, next-themes, Recharts

## Project Structure

```
apps/stat.mtlf.me/
├── app/
│   ├── page.tsx              # / — dashboard (charts + indicators)
│   └── fund/page.tsx         # /fund — fund structure table
├── src/
│   ├── cli/                  # CLI tools (Stellar pricing)
│   ├── components/
│   │   ├── dashboard/        # Dashboard widgets (charts, KPI cards)
│   │   ├── portfolio/        # Fund details table
│   │   └── ui/               # Shared primitives
│   ├── hooks/                # Data hooks (use-indicators, use-fund-data, ...)
│   ├── lib/
│   │   ├── api/              # External API client (stat.mtlprog.xyz)
│   │   └── stellar/          # Stellar services (CLI only)
└── docs/guides/              # Detailed documentation
```

## External API

Single data source: `https://stat.mtlprog.xyz/api/v1`. Endpoints:
- `GET /indicators?compare=30d,90d,365d` — KPI list with period deltas
- `GET /charts/balance-by-subfund` — pie chart slices (MABIZ, MCITY, DEFI, BOSS)
- `GET /charts/indicator-history?ids=&range=` — time-series for line charts
- `GET /snapshots`, `/snapshots/latest`, `/snapshots/{date}` — fund snapshots

Wrappers in `src/lib/api/`. No local API routes; no database.

## Core Services (CLI only)

The Stellar Effect-TS services power CLI tools. See `/docs/guides/effect-ts-patterns.md`.

### 1. PortfolioService (`src/lib/stellar/portfolio-service.ts`)

Fetches account balances from Horizon API.

```typescript
interface PortfolioService {
  readonly getAccountPortfolio: (accountId: string)
    => Effect.Effect<AccountPortfolio, StellarError | EnvironmentError>;
}
```

### 2. PriceService (`src/lib/stellar/price-service.ts`)

Path finding-based price discovery using Stellar Horizon API.

```typescript
interface PriceService {
  readonly getTokenPrice: (tokenA: AssetInfo, tokenB: AssetInfo)
    => Effect.Effect<TokenPairPrice, TokenPriceError | StellarError>;
}
```

**Method**: `strictSendPaths` (fallback: `strictReceivePaths`)
**Concurrency**: 5 tokens parallel
**Test coverage**: `price-service.test.ts`

**📘 Full guide**: `docs/guides/price-discovery.md`

### 3. FundStructureService (`src/lib/stellar/fund-structure-service.ts`)

Aggregates 10 fund accounts (8 main + 2 other, see `/docs/FUND_STRUCTURE.md`).

```typescript
interface FundStructureService {
  readonly getFundStructure: () => Effect.Effect<FundStructureData, ...>;
}
```

**Important**: All tokens displayed (liquid + illiquid). "Other" accounts excluded from totals.

**📘 Full guide**: `docs/guides/fund-structure-service.md`

## CLI Tools

**Setup**:
```bash
export STELLAR_NETWORK=mainnet
bun run cli [command]
```

**Commands**:
```bash
# Generic price
bun run cli price -a MTL --token-a-issuer G... -b EURMTL --token-b-issuer G...

# Predefined pairs
bun run cli mtl-eurmtl
bun run cli xlm-usdc
```

**📘 Full guide**: `docs/guides/cli-usage.md`

## UI Components

- **DashboardPage** (`src/components/dashboard/`) — pie chart, indicator history, indicators grid
- **FundStructureTable** — main table with sticky headers, tooltips
- **StellarAsset / StellarAccount** — display primitives with explorer links

**📘 Full guide**: `docs/guides/ui-components.md`

## Configuration

### Stellar Network (`src/lib/stellar/config.ts`)

```bash
STELLAR_NETWORK=mainnet  # or testnet
```

### Fund Accounts

10 accounts: 1 Issuer + 3 Subfonds + 2 Mutuals + 1 Operational + 2 Others + 1 MTLM

Update in:
1. `/docs/FUND_STRUCTURE.md`
2. `src/lib/stellar/fund-structure-service.ts` (FUND_ACCOUNTS_RAW)
3. Validate schema (56 chars, starts with G)

## Development

```bash
bun dev              # Dev server
bun build            # Production build
bun lint             # Linter
bun run cli          # CLI tools
```

## Testing

**Pattern** (see `/docs/guides/effect-ts-testing.md`):

```typescript
test("should work", async () => {
  const testRuntime = ManagedRuntime.make(ServiceLive);
  try {
    const result = await testRuntime.runPromise(program);
    expect(result).toBe(expected);
  } finally {
    await testRuntime.dispose();
  }
});
```

## Key Patterns

### Service Composition

```typescript
export const AppLayer = Layer.merge(
  PriceServiceLive,
  PortfolioServiceLive
);
```

### Error Handling

```typescript
pipe(
  primaryMethod(),
  Effect.catchAll(() => fallbackMethod())
);
```

### Concurrency

```typescript
Effect.all(items.map(process), { concurrency: 3 });
```

## Common Issues

1. **Rate limiting** - Reduce concurrency in `Effect.all`
2. **Path finding failures** - Prices return `null`, UI shows "—"
3. **Account not found** - Verify network (mainnet vs testnet)

## Documentation

### App Guides
- **[Price Discovery](/apps/stat.mtlf.me/docs/guides/price-discovery.md)** - Price algorithms
- **[Fund Structure](/apps/stat.mtlf.me/docs/guides/fund-structure-service.md)** - Fund architecture
- **[CLI Usage](/apps/stat.mtlf.me/docs/guides/cli-usage.md)** - CLI commands
- **[UI Components](/apps/stat.mtlf.me/docs/guides/ui-components.md)** - Component docs

### Monorepo Guides
- **[Effect-TS Patterns](/docs/guides/effect-ts-patterns.md)** - Core patterns
- **[Effect-TS Testing](/docs/guides/effect-ts-testing.md)** - Testing with ManagedRuntime
- **[Stellar Integration](/docs/guides/stellar-integration.md)** - Stellar SDK integration
- **[Design System](/docs/guides/design-system.md)** - Retrofuturistic UI/UX

