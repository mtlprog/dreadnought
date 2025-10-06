# Price Discovery System

This guide explains how the price discovery system works in stat.mtlf.me using path finding algorithms for token price calculation.

## Overview

The PriceService (`src/lib/stellar/price-service.ts`) implements a path finding-based price discovery system using Stellar Horizon API.

**Key Changes (October 2025)**:
- ✅ Path finding only - orderbook method removed
- ✅ Simplified path details (no bid/ask per hop)
- ✅ Comprehensive test coverage added

## Price Discovery Strategy

### Path Finding Algorithm

The system uses Stellar's path finding algorithms to discover multi-hop trading paths between tokens.

**Algorithm Sequence**:

1. **strictSendPaths** (Primary):
   - Send 1 unit of source token
   - Find paths that deliver destination token
   - Returns destination amount received
   - Formula: `price = destination_amount / source_amount`

2. **strictReceivePaths** (Fallback):
   - Receive 1 unit of destination token
   - Find paths from source token
   - Returns source amount needed
   - Formula: `price = destination_amount / source_amount`

**Implementation**:
```typescript
pipe(
  Effect.tryPromise({
    try: () => server.strictSendPaths(sourceAsset, "1", [destAsset]).call(),
    catch: (error) => new StellarError({ operation: "pathFindingSend", cause: error }),
  }),
  Effect.catchAll((sendError) =>
    pipe(
      Effect.log(`strictSendPaths failed, trying strictReceivePaths`),
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () => server.strictReceivePaths([sourceAsset], destAsset, "1").call(),
          catch: (error) => new StellarError({ operation: "pathFindingReceive", cause: error }),
        })
      )
    )
  )
);
```

**Path Analysis**:

The system extracts intermediate hops from Horizon response:

```typescript
// Example path: MTL → XLM → EURMTL
path = [
  { from: "MTL", to: "XLM" },
  { from: "XLM", to: "EURMTL" }
]
```

**Result Format**:
```typescript
{
  source: "path",
  path: [
    { from: "MTL", to: "XLM" },
    { from: "XLM", to: "EURMTL" }
  ]
}
```

## Batch Token Pricing

The `getTokensWithPrices` function processes multiple tokens in parallel with concurrency control.

**Implementation**:
```typescript
pipe(
  Effect.all(
    tokens.map((token) =>
      pipe(
        Effect.all({
          eurmtlData: pipe(
            getTokenPriceImpl(token.asset, baseTokens.eurmtl),
            Effect.catchAll(() => Effect.succeed({ price: null, details: undefined }))
          ),
          xlmData: pipe(
            getTokenPriceImpl(token.asset, baseTokens.xlm),
            Effect.catchAll(() => Effect.succeed({ price: null, details: undefined }))
          ),
        }),
        Effect.map(({ eurmtlData, xlmData }) => ({
          asset: token.asset,
          balance: token.balance,
          priceInEURMTL: eurmtlData.price,
          priceInXLM: xlmData.price,
          valueInEURMTL: eurmtlData.price
            ? (parseFloat(token.balance) * parseFloat(eurmtlData.price)).toFixed(2)
            : null,
          valueInXLM: xlmData.price
            ? (parseFloat(token.balance) * parseFloat(xlmData.price)).toFixed(7)
            : null,
          detailsEURMTL: eurmtlData.details,
          detailsXLM: xlmData.details,
        }))
      )
    ),
    { concurrency: 5 } // Limit concurrent requests
  )
);
```

**Concurrency Strategy**:
- **Token-level**: 5 tokens priced concurrently
- **Error handling**: Per-token errors don't fail entire batch

## Error Handling

### Graceful Degradation

The system handles errors at multiple levels:

1. **Token-level**: If EURMTL pricing fails, try XLM only
2. **Batch-level**: Failed tokens return null prices, don't fail entire batch
3. **UI-level**: Display "—" for missing prices

**Example**:
```typescript
Effect.catchAll((error) =>
  pipe(
    Effect.logError(`EURMTL pricing failed for ${token.asset.code}: ${error}`),
    Effect.flatMap(() => Effect.succeed({ price: null, details: undefined }))
  )
)
```

### Common Failure Scenarios

1. **No Payment Paths**:
   - Symptom: Path finding returns empty records
   - Result: `price: null` for that token
   - UI: Shows "—" in price column

2. **Rate Limiting**:
   - Symptom: 429 HTTP errors from Horizon
   - Mitigation: Reduce concurrency
   - Current limit: 5 concurrent tokens

3. **Invalid Assets**:
   - Symptom: "Issuer is invalid" error
   - Cause: Malformed issuer address or wrong network
   - Result: `price: null` for that token

## Performance Optimization

### Concurrency Tuning

Adjust concurrency based on Horizon API rate limits:

```typescript
// In getTokensWithPrices
Effect.all(tokens.map(...), { concurrency: 5 }) // ← Adjust this
```

**Guidelines**:
- Mainnet: 5-10 concurrent tokens safe
- Testnet: 3-5 concurrent tokens recommended
- Higher concurrency → faster results, more rate limit risk

### Caching Strategy (Future)

Consider implementing caching for:
- Orderbook data (5-10 second TTL)
- Path finding results (30-60 second TTL)
- Account balances (60+ second TTL)

**Example Pattern**:
```typescript
const cachedPrice = pipe(
  Effect.cached(getPriceImpl(tokenA, tokenB)),
  Effect.withTTL("10 seconds")
);
```

## CLI Usage

### Check Token Price

```bash
export STELLAR_NETWORK=mainnet

# Generic price check
bun run cli price \
  -a MTL \
  --token-a-issuer GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V \
  -b EURMTL \
  --token-b-issuer GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V

# Predefined pairs
bun run cli mtl-eurmtl
bun run cli xlm-usdc
```

### Interpreting Output

**Path Finding Result**:
```json
{
  "tokenA": "MTL:GACKTN...",
  "tokenB": "EURMTL:GACKTN...",
  "price": "0.169175",
  "timestamp": "2025-10-02T18:00:00.000Z",
  "details": {
    "source": "path",
    "path": [
      { "from": "MTL", "to": "XLM" },
      { "from": "XLM", "to": "EURMTL" }
    ]
  }
}
```

## Troubleshooting

### Issue: All Prices Return Null

**Possible Causes**:
1. Wrong network (testnet vs mainnet)
2. Invalid issuer addresses
3. Tokens don't exist on current network
4. Horizon API down

**Debugging**:
```typescript
Effect.tap(() => Effect.log(`Attempting to price ${tokenA.code} -> ${tokenB.code}`)),
Effect.tap(() => Effect.log(`Network: ${config.network}`)),
Effect.tap(() => Effect.log(`TokenA issuer: ${tokenA.issuer}`)),
```

### Issue: Path Finding Takes Too Long

**Possible Causes**:
1. Too many hops in path (>3 hops slow)
2. Rate limiting from Horizon
3. Network latency

**Solutions**:
- Reduce concurrency: `{ concurrency: 1 }`
- Implement timeout: `Effect.timeout("30 seconds")`
- Cache path results

### Issue: Inconsistent Prices

**Explanation**: Stellar DEX prices fluctuate in real-time. This is expected behavior.

**Mitigation**:
- Calculate average over multiple samples
- Use time-weighted average price (TWAP)
- Show timestamp with each price

## Integration Examples

### Get Price in Effect Program

```typescript
import { PriceServiceTag, PriceServiceLive } from "@/lib/stellar/price-service";

const program = pipe(
  PriceServiceTag,
  Effect.flatMap((service) =>
    service.getTokenPrice(
      { code: "MTL", issuer: "GACKTN...", type: "credit_alphanum4" },
      { code: "EURMTL", issuer: "GACKTN...", type: "credit_alphanum4" }
    )
  ),
  Effect.map((result) => {
    console.log(`Price: ${result.price}`);
    console.log(`Source: ${result.details?.source}`);
    return result;
  }),
  Effect.provide(PriceServiceLive)
);

await Effect.runPromise(program);
```

### Batch Price Multiple Tokens

```typescript
const tokens = [
  { asset: { code: "MTL", issuer: "...", type: "credit_alphanum4" }, balance: "100" },
  { asset: { code: "BTC", issuer: "...", type: "credit_alphanum4" }, balance: "0.5" },
];

const baseTokens = {
  eurmtl: { code: "EURMTL", issuer: "...", type: "credit_alphanum4" },
  xlm: { code: "XLM", issuer: "", type: "native" },
};

const program = pipe(
  PriceServiceTag,
  Effect.flatMap((service) => service.getTokensWithPrices(tokens, baseTokens)),
  Effect.map((results) => {
    for (const token of results) {
      console.log(`${token.asset.code}: ${token.priceInEURMTL} EURMTL`);
    }
    return results;
  }),
  Effect.provide(PriceServiceLive)
);
```

## Testing

The PriceService has comprehensive test coverage in `src/lib/stellar/price-service.test.ts`.

**Run tests**:
```bash
STELLAR_NETWORK=mainnet bun test src/lib/stellar/price-service.test.ts
```

**Test coverage**:
- ✅ Path finding for MTL/EURMTL pair
- ✅ Path finding for XLM/EURMTL pair
- ✅ Path hop structure validation
- ✅ Batch pricing multiple tokens
- ✅ Value calculation from price and balance
- ✅ Graceful error handling for invalid assets

**Example test**:
```typescript
test("should calculate price via path finding for MTL/EURMTL", async () => {
  const testRuntime = ManagedRuntime.make(PriceServiceLive);

  try {
    const priceService = await testRuntime.runPromise(PriceServiceTag);

    const result = await testRuntime.runPromise(
      priceService.getTokenPrice(MTL_ASSET, EURMTL_ASSET)
    );

    expect(result.price).toBeDefined();
    expect(parseFloat(result.price)).toBeGreaterThan(0);
    expect(result.details?.source).toBe("path");
    expect(result.details?.path.length).toBeGreaterThan(0);
  } finally {
    await testRuntime.dispose(); // CRITICAL: Always dispose
  }
});
```

## Related Documentation

- `/apps/stat.mtlf.me/CLAUDE.md`: Main app documentation
- `/CLAUDE.md`: Effect-TS patterns and testing
- `/docs/guides/effect-ts-testing.md`: ManagedRuntime testing patterns
- Stellar Docs: https://developers.stellar.org/docs/encyclopedia/path-payments
