# Price Discovery System

This guide explains how the price discovery system works in stat.mtlf.me, including orderbook trading, path finding algorithms, and price calculation strategies.

## Overview

The PriceService (src/lib/stellar/price-service.ts) implements a sophisticated two-tier price discovery system:

1. **Direct Orderbook Trading**: For tokens with direct trading pairs
2. **Path Finding Fallback**: For illiquid tokens requiring multi-hop paths

## Price Discovery Strategy

### Tier 1: Direct Orderbook

The system first attempts to find prices using direct orderbook data from Stellar DEX.

**Implementation**:
```typescript
const directPrice = pipe(
  Effect.all({
    assetA: createAsset(tokenA),
    assetB: createAsset(tokenB),
  }),
  Effect.flatMap(({ assetA, assetB }) =>
    pipe(
      fetchOrderbook(config.server, assetA, assetB),
      Effect.flatMap(calculateAveragePrice),
    )
  )
);
```

**Price Calculation**:
1. Fetch orderbook for TokenA/TokenB pair
2. Extract best bid (highest buy price)
3. Extract best ask (lowest sell price)
4. Calculate mid-market price:
   - If both bid and ask exist: `(bid + ask) / 2`
   - If only bid exists: use bid
   - If only ask exists: use ask
   - If neither exists: fail

**Result Format**:
```typescript
{
  source: "orderbook",
  bid: "123.4567890",
  ask: "123.4567900",
  midPrice: "123.4567895"
}
```

### Tier 2: Path Finding

If direct orderbook fails, the system uses Stellar's path finding algorithms to discover multi-hop trading paths.

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

For each hop in the path, the system fetches orderbook data:

```typescript
// Example path: MTL → XLM → EURMTL
path = [
  { from: "MTL", to: "XLM", bid: "0.5", ask: "0.51", midPrice: "0.505" },
  { from: "XLM", to: "EURMTL", bid: "0.33", ask: "0.34", midPrice: "0.335" }
]
```

**Result Format**:
```typescript
{
  source: "path",
  path: [
    {
      from: "MTL",
      to: "XLM",
      price: "0.505",
      bid?: "0.5",
      ask?: "0.51",
      midPrice?: "0.505"
    },
    {
      from: "XLM",
      to: "EURMTL",
      price: "0.335",
      bid?: "0.33",
      ask?: "0.34",
      midPrice?: "0.335"
    }
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
- **Path-level**: 3 orderbook fetches per path hop
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

1. **No Orderbook Data**:
   - Symptom: Empty bids/asks array
   - Fallback: Try path finding
   - Result: TokenPriceError if path also fails

2. **No Payment Paths**:
   - Symptom: Path finding returns empty records
   - Result: `price: null` for that token
   - UI: Shows "—" in price column

3. **Rate Limiting**:
   - Symptom: 429 HTTP errors from Horizon
   - Mitigation: Reduce concurrency
   - Current limits: 5 concurrent for tokens, 3 for paths

## Performance Optimization

### Concurrency Tuning

Adjust concurrency based on Horizon API rate limits:

```typescript
// In getTokensWithPrices
Effect.all(tokens.map(...), { concurrency: 5 }) // ← Adjust this

// In path hop processing
Effect.all(hops, { concurrency: 3 }) // ← Adjust this
```

**Guidelines**:
- Mainnet: 5-10 concurrent requests safe
- Testnet: 3-5 concurrent requests recommended
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

**Orderbook Result**:
```json
{
  "tokenA": "MTL:GACKTN...",
  "tokenB": "EURMTL:GACKTN...",
  "price": "123.4567895",
  "timestamp": "2025-10-02T18:00:00.000Z",
  "details": {
    "source": "orderbook",
    "bid": "123.4567890",
    "ask": "123.4567900",
    "midPrice": "123.4567895"
  }
}
```

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
      {
        "from": "MTL",
        "to": "XLM",
        "price": "0.505",
        "bid": "0.5",
        "ask": "0.51",
        "midPrice": "0.505"
      },
      {
        "from": "XLM",
        "to": "EURMTL",
        "price": "0.335",
        "bid": "0.33",
        "ask": "0.34",
        "midPrice": "0.335"
      }
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

## Related Documentation

- `/apps/stat.mtlf.me/CLAUDE.md`: Main app documentation
- `/CLAUDE.md`: Effect-TS patterns and testing
- Stellar Docs: https://developers.stellar.org/docs/encyclopedia/path-payments
