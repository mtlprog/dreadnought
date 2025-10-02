# Fund Structure Service

This guide explains how the FundStructureService aggregates portfolio data across multiple Stellar accounts to create a comprehensive view of the Montelibero Fund.

## Overview

The FundStructureService (src/lib/stellar/fund-structure-service.ts) is the orchestration layer that:

1. Fetches portfolio data for all fund accounts
2. Calculates token prices in EURMTL and XLM
3. Computes account-level and fund-level totals
4. Filters liquid vs illiquid tokens

## Fund Account Structure

### Account Definition

```typescript
interface FundAccount {
  readonly id: string;           // Stellar public key (G...)
  readonly name: string;          // Display name (e.g., "MABIZ")
  readonly type: "issuer" | "subfond" | "mutual" | "operational" | "other";
  readonly description: string;   // Russian description
}
```

**Account Types**:
- `issuer`: Main issuer account
- `subfond`: Subfund accounts (MABIZ, CITY, DEFI)
- `mutual`: Mutual fund accounts (MFB, APART)
- `operational`: Operational accounts (ADMIN)
- `other`: Other accounts NOT included in fund totals (LABR, MTLM)

### Validation Schema

All accounts are validated using `@effect/schema`:

```typescript
const FundAccountSchema = S.Struct({
  id: S.String.pipe(S.pattern(/^G[A-Z2-7]{55}$/)), // Stellar public key format
  name: S.String.pipe(S.nonEmptyString()),
  type: S.Literal("issuer", "subfond", "mutual", "operational", "other"),
  description: S.String.pipe(S.nonEmptyString()),
});
```

### Current Fund Accounts

From `/docs/FUND_STRUCTURE.md`:

**Main Issuer**:
- **MAIN ISSUER**: `GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V`
  - Основной эмитент токенов фонда

**Subfonds** (included in fund totals):
- **MABIZ**: `GAQ5ERJVI6IW5UVNPEVXUUVMXH3GCDHJ4BJAXMAAKPR5VBWWAUOMABIZ`
  - Сабфонд малого и среднего бизнеса
- **CITY**: `GCOJHUKGHI6IATN7AIEK4PSNBPXIAIZ7KB2AWTTUCNIAYVPUB2DMCITY`
  - Сабфонд городской инфраструктуры
- **DEFI**: `GAEZHXMFRW2MWLWCXSBNZNUSE6SN3ODZDDOMPFH3JPMJXN4DKBPMDEFI`
  - Сабфонд децентрализованных финансов

**Mutuals** (included in fund totals):
- **MFB**: `GCKCV7T56CAPFUYMCQUYSEUMZRC7GA7CAQ2BOL3RPS4NQXDTRCSULMFB`
  - Mutual Fund Business
- **APART**: `GD2SNF4QHUJD6VRAXWDA4CDUYENYB23YDFQ74DVC4P5SYR54AAVCUMFA`
  - Mutual Fund Apartments

**Operational** (included in fund totals):
- **ADMIN**: `GBSCMGJCE4DLQ6TYRNUMXUZZUXGZBM4BXVZUIHBBL5CSRRW2GWEHUADM`
  - Операционный счёт администрирования

**Others** (NOT included in fund totals, displayed separately):
- **LABR**: `GA7I6SGUHQ26ARNCD376WXV5WSE7VJRX6OEFNFCEGRLFGZWQIV73LABR`
  - Трудовые ресурсы
- **MTLM**: `GCR5J3NU2NNG2UKDQ5XSZVX7I6TDLB3LEN2HFUR2EPJUMNWCUL62MTLM`
  - Montelibero Meta

## Data Flow

### High-Level Pipeline

```
getFundStructure()
  ↓
Effect.all(FUND_ACCOUNTS.map(getAccountPortfolio), { concurrency: 3 })
  ↓
For each account:
  1. portfolioService.getAccountPortfolio(account.id)
     → Returns: { tokens: TokenBalance[], xlmBalance: string }

  2. priceService.getTokensWithPrices(tokens, { eurmtl, xlm })
     → Returns: TokenPriceWithBalance[] with prices and values

  3. priceService.getTokenPrice(XLM, EURMTL)
     → Returns: XLM price in EURMTL

  4. calculateAccountTotals(tokens, xlmBalance, xlmPriceInEURMTL)
     → Returns: { totalEURMTL, totalXLM }
  ↓
Aggregate all accounts into FundStructureData
  → { accounts, aggregatedTotals }
```

### Implementation Details

**Step 1: Fetch Account Portfolio**

```typescript
portfolioService.getAccountPortfolio(account.id)
  → Horizon API: loadAccount(accountId)
  → Parse balances:
      - XLM (native): balance
      - Tokens (credit_alphanum4/12): { asset, balance, limit? }
      - Skip: liquidity_pool_shares
  → Return: { accountId, tokens, xlmBalance }
```

**Step 2: Get Token Prices**

```typescript
priceService.getTokensWithPrices(tokens, { eurmtl, xlm })
  → For each token (concurrency: 5):
      - Get price in EURMTL (orderbook or path)
      - Get price in XLM (orderbook or path)
      - Calculate valueInEURMTL = balance × priceInEURMTL
      - Calculate valueInXLM = balance × priceInXLM
  → Return: TokenPriceWithBalance[] with all pricing data
```

**Step 3: Get XLM Price in EURMTL**

```typescript
priceService.getTokenPrice(XLM_ASSET, EURMTL_ASSET)
  → Try orderbook first
  → Fallback to path finding
  → Return: { price: "0.335", details: { source, ... } }
  → Catch all errors → return null (non-blocking)
```

**Step 4: Calculate Account Totals**

```typescript
calculateAccountTotals(tokens, xlmBalance, xlmPriceInEURMTL)
  → Filter liquid tokens (those with prices)
  → Sum EURMTL values:
      totalEURMTL = Σ(token.valueInEURMTL) + (xlmBalance × xlmPriceInEURMTL)
  → Sum XLM values:
      totalXLM = Σ(token.valueInXLM) + xlmBalance
  → Return: { totalEURMTL, totalXLM }
```

## Portfolio Data Structure

### FundAccountPortfolio

Extended account with portfolio and pricing data:

```typescript
interface FundAccountPortfolio extends FundAccount {
  readonly tokens: readonly TokenPriceWithBalance[];
  readonly xlmBalance: string;
  readonly xlmPriceInEURMTL: string | null;
  readonly totalEURMTL: number;
  readonly totalXLM: number;
}
```

### TokenPriceWithBalance

Token with pricing information:

```typescript
interface TokenPriceWithBalance {
  readonly asset: AssetInfo;
  readonly balance: string;
  readonly priceInEURMTL: string | null;  // Price per unit in EURMTL
  readonly priceInXLM: string | null;      // Price per unit in XLM
  readonly valueInEURMTL: string | null;   // Total value (balance × price)
  readonly valueInXLM: string | null;      // Total value (balance × price)
  readonly detailsEURMTL?: PriceDetails;   // How price was calculated
  readonly detailsXLM?: PriceDetails;      // How price was calculated
}
```

### FundStructureData

Complete fund structure with aggregated totals:

```typescript
interface FundStructureData {
  readonly accounts: readonly FundAccountPortfolio[];
  readonly otherAccounts: readonly FundAccountPortfolio[];  // "other" type accounts
  readonly aggregatedTotals: {
    readonly totalEURMTL: number;    // Sum of account totalEURMTL (excluding "other")
    readonly totalXLM: number;       // Sum of account totalXLM (excluding "other")
    readonly accountCount: number;   // Number of accounts processed (excluding "other")
    readonly tokenCount: number;     // Total tokens across accounts (excluding "other")
  };
}
```

**Important**: `otherAccounts` are displayed separately in the UI and NOT included in `aggregatedTotals`.

## Liquid vs Illiquid Tokens

### Liquid Tokens

Tokens with discoverable prices via orderbook or path finding.

**Criteria**: `priceInXLM !== null || priceInEURMTL !== null`

**Example**:
```typescript
{
  asset: { code: "MTL", issuer: "GACKTN...", type: "credit_alphanum4" },
  balance: "1000.0000000",
  priceInEURMTL: "0.50",
  priceInXLM: "1.5",
  valueInEURMTL: "500.00",
  valueInXLM: "1500.0000000"
}
```

### Illiquid Tokens

Tokens without discoverable prices (no orderbook, no paths).

**Criteria**: `priceInXLM === null && priceInEURMTL === null`

**Example**:
```typescript
{
  asset: { code: "CUSTOM", issuer: "GXXX...", type: "credit_alphanum4" },
  balance: "500.0000000",
  priceInEURMTL: null,
  priceInXLM: null,
  valueInEURMTL: null,
  valueInXLM: null
}
```

**Treatment**:
- Not included in total calculations
- Not displayed in UI (filtered out)
- Logged for debugging

### Filtering Logic

```typescript
const liquidTokens = tokens.filter(token =>
  token.priceInXLM !== null || token.priceInEURMTL !== null
);

// Only liquid tokens contribute to totals
const totalEURMTL = liquidTokens.reduce((sum, token) => {
  if (token.valueInEURMTL !== null && token.valueInEURMTL !== undefined) {
    return sum + parseFloat(token.valueInEURMTL);
  }
  return sum;
}, 0);
```

## Error Handling

### Three-Level Error Tolerance

**Level 1: Token Pricing Errors**
- If EURMTL pricing fails, still try XLM pricing
- If both fail, token gets `null` prices (becomes illiquid)
- Account processing continues

**Level 2: Account Portfolio Errors**
- If token pricing fails entirely, return empty tokens array
- Account totals = XLM balance only
- Other accounts continue processing

**Level 3: XLM Price Error**
- If XLM→EURMTL price fails, set `xlmPriceInEURMTL: null`
- Account totalEURMTL = sum of token values only (no XLM included)
- Account totalXLM = tokens + xlmBalance

### Error Handling Pattern

```typescript
pipe(
  getAccountPortfolio(account),
  // Try to get prices
  Effect.flatMap((portfolio) =>
    pipe(
      priceService.getTokensWithPrices(portfolio.tokens, baseTokens),
      // If pricing fails, still return basic data
      Effect.catchAll(() =>
        Effect.succeed({
          ...account,
          tokens: portfolio.tokens.map(token => ({
            asset: token.asset,
            balance: token.balance,
            priceInEURMTL: null,
            priceInXLM: null,
            valueInEURMTL: null,
            valueInXLM: null,
          })),
          xlmBalance: portfolio.xlmBalance,
          xlmPriceInEURMTL: null,
          totalEURMTL: 0,
          totalXLM: parseFloat(portfolio.xlmBalance),
        })
      )
    )
  )
)
```

## Concurrency Control

### Account-Level Concurrency

Process 3 accounts concurrently to balance speed and rate limiting:

```typescript
Effect.all(
  FUND_ACCOUNTS.map(getAccountPortfolio),
  { concurrency: 3 } // ← Adjust based on Horizon API limits
)
```

**Rationale**:
- 6 accounts total
- ~3-5 seconds per account (including pricing)
- Total time: ~6-10 seconds with concurrency: 3
- Horizon mainnet rate limit: ~100 req/s (safe with concurrency: 3)

### Token-Level Concurrency

Within each account, tokens are priced concurrently (controlled by PriceService):

```typescript
// In PriceService.getTokensWithPrices
Effect.all(
  tokens.map(getPriceForToken),
  { concurrency: 5 } // ← Already controlled by PriceService
)
```

## Performance Considerations

### Typical Load Times

**Mainnet (6 accounts, ~20-30 tokens total)**:
- Best case (all orderbooks): 5-8 seconds
- Typical (mixed orderbook/path): 8-12 seconds
- Worst case (many paths): 15-20 seconds

**Optimization Strategies**:

1. **Increase Concurrency**:
   ```typescript
   Effect.all(accounts, { concurrency: 5 }) // Faster, more rate limit risk
   ```

2. **Cache Results**:
   ```typescript
   const cachedPrice = pipe(
     getTokenPrice(tokenA, tokenB),
     Effect.cached,
     Effect.withTTL("30 seconds")
   );
   ```

3. **Skip Illiquid Tokens**:
   - Maintain whitelist of liquid tokens
   - Skip pricing for known illiquid tokens
   - Store in config or database

## Adding New Accounts

### Step 1: Update FUND_STRUCTURE.md

Add account to `/docs/FUND_STRUCTURE.md`:

```markdown
## Subfonds

- **NEWACCT**: `GNEW...ACCT`
```

### Step 2: Update FUND_ACCOUNTS_RAW

Add to `src/lib/stellar/fund-structure-service.ts`:

```typescript
const FUND_ACCOUNTS_RAW = [
  // ... existing accounts ...
  {
    id: "GNEWACCOUNTPUBLICKEY...",
    name: "NEWACCT",
    type: "subfond", // or "issuer" | "operational"
    description: "Описание нового аккаунта",
  },
] as const;
```

### Step 3: Validate Schema

Run the app to ensure schema validation passes:

```bash
bun dev
```

If validation fails, check:
- Public key format: Must start with `G`, 56 chars total
- Type: Must be one of `"issuer"`, `"subfond"`, `"operational"`
- Name and description: Must be non-empty strings

### Step 4: Test

```bash
# CLI test
export STELLAR_NETWORK=mainnet
bun run cli portfolio GNEWACCOUNTPUBLICKEY...

# Web UI
bun dev
# Navigate to http://localhost:3000
# Verify new account appears in table
```

## Integration with Client

### API Route Pattern (Future)

```typescript
// app/api/fund-structure/route.ts
import { FundStructureServiceLive, FundStructureServiceTag } from "@/lib/stellar/fund-structure-service";
import { PortfolioServiceLive, PriceServiceLive } from "@/lib/stellar";
import { Effect, Layer, pipe } from "effect";
import { NextResponse } from "next/server";

const AppLayer = Layer.merge(
  FundStructureServiceLive,
  Layer.merge(PortfolioServiceLive, PriceServiceLive)
);

export async function GET() {
  const program = pipe(
    FundStructureServiceTag,
    Effect.flatMap((service) => service.getFundStructure()),
    Effect.provide(AppLayer),
    Effect.catchAll((error) =>
      Effect.fail({
        error: "API Error",
        message: error instanceof Error ? error.message : "Unknown error"
      })
    )
  );

  return Effect.runPromise(program)
    .then(result => NextResponse.json(result))
    .catch(error => NextResponse.json(error, { status: 500 }));
}
```

### Client-Side Hook (Current)

See `src/hooks/use-fund-data.ts` for current implementation using `FundDataClient`.

**Usage**:
```typescript
const { data, isLoading, error, progress } = useFundData();

if (isLoading) return <LoadingState progress={progress} />;
if (error) return <ErrorState message={error} />;
if (!data) return <NoData />;

return <FundStructureTable fundData={data} />;
```

## Debugging

### Enable Detailed Logging

Effect-TS logging is built into the service:

```typescript
Effect.tap(() => Effect.log("Account loaded: ${accountId}")),
Effect.tap(() => Effect.log("Tokens priced: ${tokens.length}")),
Effect.logError("Pricing failed: ${error}"),
```

**View logs in console**:
- Browser: DevTools Console (client-side)
- CLI: stdout (server-side)

### Common Issues

**Issue: All Accounts Show Zero Balances**

**Cause**: Wrong network (testnet vs mainnet)

**Solution**:
```bash
export STELLAR_NETWORK=mainnet
```

**Issue: Some Accounts Missing**

**Cause**: Account processing failed

**Check**:
1. Is account funded? (needs 1+ XLM)
2. Does account exist on current network?
3. Are there rate limiting errors in logs?

**Issue: Totals Don't Add Up**

**Cause**: Illiquid tokens excluded from totals

**Check**:
```typescript
// Compare all tokens vs liquid tokens
console.log("All tokens:", account.tokens.length);
console.log("Liquid tokens:", account.tokens.filter(t => t.priceInXLM !== null).length);
```

## Related Documentation

- `/apps/stat.mtlf.me/CLAUDE.md`: Main app documentation
- `/apps/stat.mtlf.me/docs/guides/price-discovery.md`: Price discovery system
- `/docs/FUND_STRUCTURE.md`: Montelibero Fund accounts
- `/CLAUDE.md`: Effect-TS patterns and testing
