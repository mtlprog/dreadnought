# stat.mtlf.me - Montelibero Fund Statistics Dashboard

Real-time statistics and portfolio composition for Montelibero Fund on Stellar blockchain.

**Parent**: `/CLAUDE.md` - Monorepo-wide guidelines, Effect-TS patterns, design system, testing

## Overview

**Purpose**: Dashboard for tracking fund assets across multiple Stellar accounts with automatic price discovery

**Key Features**:
- Multi-account fund structure visualization
- Real-time token price discovery (orderbook + path finding)
- Aggregated portfolio totals in EURMTL and XLM
- CLI tools for manual price checks
- Client-side data fetching with progress indicators

**Tech Stack**: Next.js 15, Effect-TS, Stellar SDK 12.3.0, Tailwind CSS 4, next-themes

## Project Structure

```
apps/stat.mtlf.me/
├── src/
│   ├── cli/                    # CLI tools
│   ├── components/             # React components
│   ├── hooks/                  # Custom hooks
│   ├── lib/
│   │   ├── stellar/           # Stellar services
│   │   └── services/          # Client services
│   └── app/                   # Next.js 15 App Router
└── docs/guides/               # Detailed documentation
```

## Core Services

All services use Effect-TS patterns (see `/docs/guides/effect-ts-patterns.md`).

### 1. PortfolioService (`src/lib/stellar/portfolio-service.ts`)

Fetches account balances from Horizon API.

```typescript
interface PortfolioService {
  readonly getAccountPortfolio: (accountId: string)
    => Effect.Effect<AccountPortfolio, StellarError | EnvironmentError>;
}
```

### 2. PriceService (`src/lib/stellar/price-service.ts`)

Two-tier price discovery: orderbook → path finding.

```typescript
interface PriceService {
  readonly getTokenPrice: (tokenA: AssetInfo, tokenB: AssetInfo)
    => Effect.Effect<TokenPairPrice, TokenPriceError | StellarError>;
}
```

**Concurrency**: 5 tokens parallel, 3 path hops parallel

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

### 4. FundDataClient (`src/lib/services/fund-data-client.ts`)

Client-side API fetching with schema validation.

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

- **FundStructureTable** - Main table with sticky headers, tooltips
- **StellarAsset** - Asset display with issuer tooltip
- **StellarAccount** - Account ID with copy-to-clipboard
- **PortfolioClient** - Client wrapper with progress

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
- **[Services](/apps/stat.mtlf.me/docs/guides/services.md)** - Detailed service documentation
- **[Price Discovery](/apps/stat.mtlf.me/docs/guides/price-discovery.md)** - Price algorithms
- **[Fund Structure](/apps/stat.mtlf.me/docs/guides/fund-structure-service.md)** - Fund architecture
- **[CLI Usage](/apps/stat.mtlf.me/docs/guides/cli-usage.md)** - CLI commands
- **[UI Components](/apps/stat.mtlf.me/docs/guides/ui-components.md)** - Component docs

### Monorepo Guides
- **[Effect-TS Patterns](/docs/guides/effect-ts-patterns.md)** - Core patterns
- **[Effect-TS Testing](/docs/guides/effect-ts-testing.md)** - Testing with ManagedRuntime
- **[Stellar Integration](/docs/guides/stellar-integration.md)** - Stellar SDK integration
- **[Design System](/docs/guides/design-system.md)** - Retrofuturistic UI/UX

## Future Enhancements

- [ ] Server-side rendering for fund data
- [ ] Historical price charts
- [ ] Price alerts and notifications
- [ ] Export reports (CSV, PDF)
- [ ] WebSocket real-time updates
- [ ] Price data caching layer
