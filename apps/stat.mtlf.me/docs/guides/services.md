# Stellar Services Guide

Detailed documentation for all Effect-TS services used in stat.mtlf.me.

## PortfolioService

Fetches account balances and token holdings from Stellar Horizon API.

### Interface

```typescript
interface PortfolioService {
  readonly getAccountPortfolio: (
    accountId: string,
  ) => Effect.Effect<AccountPortfolio, StellarError | EnvironmentError>;
}
```

### Implementation

**File**: `src/lib/stellar/portfolio-service.ts`

```typescript
export const PortfolioServiceLive = Layer.effect(
  PortfolioServiceTag,
  Effect.gen(function* () {
    return {
      getAccountPortfolio: (accountId: string) =>
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
        ),
    };
  })
);
```

### Data Flow

1. **getStellarConfig()** - Retrieves network configuration (mainnet/testnet)
2. **loadAccountBalances()** - Calls Horizon API `server.loadAccount(accountId)`
3. **parseBalances()** - Filters balances:
   - Skips liquidity pool shares (`balance.asset_type === "liquidity_pool_shares"`)
   - Extracts tokens with asset info
   - Separates XLM balance
4. **Returns** `AccountPortfolio`:
   ```typescript
   {
     accountId: string;
     tokens: { asset: AssetInfo; balance: string }[];
     xlmBalance: string;
   }
   ```

### Error Handling

- `StellarError` - Horizon API failures (account not found, network errors)
- `EnvironmentError` - Missing/invalid `STELLAR_NETWORK` env var

### Usage Example

```typescript
const program = pipe(
  PortfolioServiceTag,
  Effect.flatMap((service) =>
    service.getAccountPortfolio("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V")
  )
);

const runtime = ManagedRuntime.make(PortfolioServiceLive);
try {
  const portfolio = await runtime.runPromise(program);
  console.log(portfolio.tokens);
} finally {
  await runtime.dispose();
}
```

## PriceService

Discovers token prices using orderbook and path finding algorithms.

### Interface

```typescript
interface PriceService {
  readonly getTokenPrice: (
    tokenA: AssetInfo,
    tokenB: AssetInfo,
  ) => Effect.Effect<TokenPairPrice, TokenPriceError | StellarError | EnvironmentError>;

  readonly getTokensWithPrices: (
    tokens: readonly { asset: AssetInfo; balance: string }[],
    baseTokens: { eurmtl: AssetInfo; xlm: AssetInfo },
  ) => Effect.Effect<readonly TokenPriceWithBalance[], TokenPriceError | StellarError | EnvironmentError>;
}
```

### Price Discovery Strategy

**Two-tier system** (orderbook → path finding):

#### Tier 1: Orderbook Price

```typescript
const getOrderbookPrice = (selling: Asset, buying: Asset) => pipe(
  getStellarConfig(),
  Effect.flatMap((config) =>
    Effect.tryPromise({
      try: () => config.server.orderbook(selling, buying).limit(1).call(),
      catch: (error) => new StellarError({ cause: error })
    })
  ),
  Effect.map((response) => {
    const bid = response.bids[0]?.price;
    const ask = response.asks[0]?.price;
    if (bid && ask) {
      const midPrice = (parseFloat(bid) + parseFloat(ask)) / 2;
      return { price: midPrice, source: "orderbook" as const };
    }
    return null;
  })
);
```

**Mid-price calculation**: `(bid + ask) / 2`

#### Tier 2: Path Finding

```typescript
const getPathPrice = (source: Asset, destination: Asset) => pipe(
  findPaymentPaths(source, destination, "1"),
  Effect.map((paths) => {
    if (paths.length === 0) return null;

    // Analyze multi-hop paths
    const bestPath = paths[0];
    const hops = bestPath.path.map((hop) => ({
      from: hop.asset_code,
      to: hop.asset_code,
      rate: parseFloat(hop.source_amount) / parseFloat(hop.destination_amount)
    }));

    return {
      price: parseFloat(bestPath.destination_amount),
      source: "path" as const,
      hops
    };
  })
);
```

### Concurrency Configuration

```typescript
// Process 5 tokens in parallel
Effect.all(
  tokens.map((token) => getTokenPrice(token.asset, baseToken)),
  { concurrency: 5 }
);

// Path finding: 3 concurrent hops
Effect.all(
  paths.map(analyzePath),
  { concurrency: 3 }
);
```

### Return Types

```typescript
interface TokenPairPrice {
  price: number | null;
  source: "orderbook" | "path" | null;
  details?: {
    bid?: string;
    ask?: string;
    hops?: Array<{ from: string; to: string; rate: number }>;
  };
}

interface TokenPriceWithBalance {
  asset: AssetInfo;
  balance: string;
  priceInEURMTL: number | null;
  priceInXLM: number | null;
  valueInEURMTL: number | null;
  valueInXLM: number | null;
}
```

### Detailed Documentation

See `/apps/stat.mtlf.me/docs/guides/price-discovery.md` for:
- Complete price discovery algorithm
- Orderbook trading mechanics
- Path finding strategies
- Error handling patterns
- CLI usage examples

## FundStructureService

Aggregates portfolio data across all Montelibero Fund accounts.

### Interface

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

### Fund Accounts Configuration

**10 accounts total** (from `/docs/FUND_STRUCTURE.md`):

```typescript
const FUND_ACCOUNTS_RAW = [
  {
    id: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
    name: "Main Issuer",
    type: "issuer" as const,
    description: "EURMTL issuer account"
  },
  {
    id: "GAQ5ERJVI6IW5UVNPEVXUUVMXH3GCDHJ4BJAXMAAKPR5VBWWAUOMABIZ",
    name: "Subfond MABIZ",
    type: "subfond" as const,
    description: "Business subfund"
  },
  // ... 8 more accounts
] as const;
```

**Schema Validation**:

```typescript
import * as S from "@effect/schema/Schema";

const FundAccountSchema = S.Struct({
  id: S.String.pipe(
    S.minLength(56),
    S.maxLength(56),
    S.filter((s) => s.startsWith("G"))
  ),
  name: S.String.pipe(S.minLength(1)),
  type: S.Literal("issuer", "subfond", "operational"),
  description: S.String.pipe(S.minLength(1)),
});
```

### Data Flow

1. **Get accounts** - Load from config with schema validation
2. **Fetch portfolios** - Parallel processing (3 concurrent)
   ```typescript
   Effect.all(
     accounts.map((account) =>
       portfolioService.getAccountPortfolio(account.id)
     ),
     { concurrency: 3 }
   )
   ```
3. **Get prices** - For all unique tokens across accounts
4. **Calculate values** - Multiply balances by prices
5. **Aggregate totals** - Sum across all fund accounts (excluding "other" category)

### Liquid vs Illiquid Tokens

**Liquid tokens**: Have price data from orderbook or path finding
**Illiquid tokens**: No price available, display "—" in UI

```typescript
const tokenWithPrice = {
  asset: { code: "EURMTL", issuer: "G...", type: "credit_alphanum4" },
  balance: "1000.00",
  priceInEURMTL: 1.0,
  valueInEURMTL: 1000.0
};

const illiquidToken = {
  asset: { code: "RARE", issuer: "G...", type: "credit_alphanum4" },
  balance: "500.00",
  priceInEURMTL: null,  // No price found
  valueInEURMTL: null
};
```

**Important**: All tokens are displayed, regardless of liquidity status.

### Concurrency & Performance

- **Portfolio fetching**: 3 accounts in parallel
- **Price discovery**: 5 tokens in parallel
- **Timeouts**: 10s for account load, 15s for orderbook, 20s for paths

### Error Handling

**Graceful degradation**:
- Account load failure → skip account, log error
- Price fetch failure → set price to `null`, continue
- Partial results → return available data with warnings

### Detailed Documentation

See `/apps/stat.mtlf.me/docs/guides/fund-structure-service.md` for:
- Complete architecture
- Account management
- Adding new accounts
- Error recovery patterns
- Testing strategies

## FundDataClient

Client-side service for fetching fund structure from API (browser environment).

### Interface

```typescript
interface FundDataClient {
  readonly fetchFundStructure: () => Effect.Effect<
    FundStructureData,
    FundDataFetchError | FundDataParseError | FundDataNetworkError
  >;
}
```

### Implementation

**File**: `src/lib/services/fund-data-client.ts`

```typescript
export const FundDataClientLive = Layer.succeed(FundDataClient, {
  fetchFundStructure: () =>
    pipe(
      Effect.tryPromise({
        try: () => fetch("/api/fund-structure"),
        catch: (error) => new FundDataNetworkError({ cause: error })
      }),
      Effect.filterOrFail(
        (response) => response.ok,
        (response) => new FundDataFetchError({
          status: response.status,
          statusText: response.statusText
        })
      ),
      Effect.flatMap((response) =>
        Effect.tryPromise({
          try: () => response.json(),
          catch: (error) => new FundDataParseError({ cause: error })
        })
      ),
      Effect.flatMap((data) =>
        S.decodeUnknown(FundStructureDataSchema)(data).pipe(
          Effect.mapError((error) => new FundDataParseError({ cause: error }))
        )
      )
    )
});
```

### Error Types

```typescript
// Network failure (fetch() failed)
class FundDataNetworkError extends S.TaggedError<FundDataNetworkError>()(
  "FundDataNetworkError",
  { cause: S.Unknown }
) {}

// HTTP error (non-200 status)
class FundDataFetchError extends S.TaggedError<FundDataFetchError>()(
  "FundDataFetchError",
  {
    status: S.Number,
    statusText: S.String
  }
) {}

// JSON parse or schema validation error
class FundDataParseError extends S.TaggedError<FundDataParseError>()(
  "FundDataParseError",
  { cause: S.Unknown }
) {}
```

### Usage in React

```typescript
import { Effect, pipe } from "effect";
import { FundDataClient, FundDataClientLive } from "@/lib/services/fund-data-client";

const useFundData = () => {
  const [data, setData] = useState<FundStructureData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const program = pipe(
      FundDataClient,
      Effect.flatMap((client) => client.fetchFundStructure()),
      Effect.tap((result) => Effect.sync(() => setData(result))),
      Effect.catchAll((error) =>
        Effect.sync(() => setError(error.message))
      )
    );

    Effect.runPromise(
      Effect.provide(program, FundDataClientLive)
    );
  }, []);

  return { data, error };
};
```

## Service Dependencies

### Dependency Graph

```
FundStructureService
├── PortfolioService
│   └── StellarConfig
└── PriceService
    └── StellarConfig

FundDataClient (standalone)
```

### Layer Composition

```typescript
// CLI Layer
export const AppLayer = Layer.merge(
  PriceServiceLive,
  PortfolioServiceLive
);

// Full app layer
export const FullAppLayer = Layer.merge(
  AppLayer,
  FundStructureServiceLive
);
```

## See Also

- **[Price Discovery Guide](/apps/stat.mtlf.me/docs/guides/price-discovery.md)** - Complete price discovery documentation
- **[Fund Structure Guide](/apps/stat.mtlf.me/docs/guides/fund-structure-service.md)** - Fund structure architecture
- **[CLI Usage Guide](/apps/stat.mtlf.me/docs/guides/cli-usage.md)** - CLI commands and patterns
- **[Effect-TS Patterns](/docs/guides/effect-ts-patterns.md)** - Core Effect-TS patterns
- **[Stellar Integration](/docs/guides/stellar-integration.md)** - Stellar SDK integration
