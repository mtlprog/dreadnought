# Stellar Blockchain Integration with Effect-TS

Complete guide to integrating Stellar blockchain operations with Effect-TS in the Dreadnought monorepo.

## Network Configuration

### Stellar Config Service

```typescript
import { Effect, pipe } from "effect";
import { Horizon, Networks } from "@stellar/stellar-sdk";

export interface StellarConfig {
  readonly network: "mainnet" | "testnet";
  readonly server: Horizon.Server;
  readonly networkPassphrase: string;
}

export class EnvironmentError extends S.TaggedError<EnvironmentError>()(
  "EnvironmentError",
  {
    variable: S.String,
  }
) {}

export const getStellarConfig = (): Effect.Effect<StellarConfig, EnvironmentError> =>
  pipe(
    Effect.sync(() => process.env["STELLAR_NETWORK"] ?? "testnet"),
    Effect.map((network) => ({
      network: network as "mainnet" | "testnet",
      server: new Horizon.Server(
        network === "mainnet"
          ? "https://horizon.stellar.org"
          : "https://horizon-testnet.stellar.org"
      ),
      networkPassphrase: network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
    }))
  );
```

### Environment Variables

```bash
# .env.local
STELLAR_NETWORK=mainnet  # or testnet
```

## Wrapping Stellar SDK with Effect

### Loading Accounts

```typescript
import { Server } from "@stellar/stellar-sdk/lib/horizon";

export class StellarError extends S.TaggedError<StellarError>()(
  "StellarError",
  {
    cause: S.Unknown,
    operation: S.String,
  }
) {}

export const loadAccount = (publicKey: string) => pipe(
  getStellarConfig(),
  Effect.flatMap((config) =>
    Effect.tryPromise({
      try: () => config.server.loadAccount(publicKey),
      catch: (error) => new StellarError({
        cause: error,
        operation: "loadAccount",
        message: `Failed to load account: ${publicKey}`
      })
    })
  ),
  Effect.tap(() => Effect.log(`Account loaded: ${publicKey}`)),
  Effect.timeout("10 seconds")
);
```

### Fetching Orderbook

```typescript
export const fetchOrderbook = (
  selling: Asset,
  buying: Asset,
  limit = 200
) => pipe(
  getStellarConfig(),
  Effect.flatMap((config) =>
    Effect.tryPromise({
      try: () => config.server
        .orderbook(selling, buying)
        .limit(limit)
        .call(),
      catch: (error) => new StellarError({
        cause: error,
        operation: "fetchOrderbook"
      })
    })
  ),
  Effect.map((response) => response.records),
  Effect.timeout("15 seconds")
);
```

### Path Finding

```typescript
export const findPaymentPath = (
  source: Asset,
  destination: Asset,
  amount: string
) => pipe(
  getStellarConfig(),
  Effect.flatMap((config) =>
    Effect.tryPromise({
      try: () => config.server
        .strictReceivePaymentPaths(source, destination, amount)
        .call(),
      catch: (error) => new PathFindingError({
        cause: error,
        source: source.code,
        destination: destination.code
      })
    })
  ),
  Effect.map((response) => response.records),
  Effect.tap((paths) => Effect.log(`Found ${paths.length} payment paths`)),
  Effect.timeout("20 seconds")
);
```

## Wallet Integration

### Wallet Kit Setup

```typescript
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID
} from "@stellar/wallet-sdk";

export const initWalletKit = () => pipe(
  getStellarConfig(),
  Effect.map((config) => new StellarWalletsKit({
    network: config.network === "mainnet"
      ? WalletNetwork.PUBLIC
      : WalletNetwork.TESTNET,
    selectedWalletId: FREIGHTER_ID,
    modules: allowAllModules(),
  }))
);
```

### Wallet Connection

```typescript
export const connectWallet = () => pipe(
  initWalletKit(),
  Effect.flatMap((kit) =>
    Effect.tryPromise({
      try: async () => {
        const { address } = await kit.getAddress();
        return address;
      },
      catch: (error) => new WalletError({
        cause: error,
        operation: "connect"
      })
    })
  )
);
```

### Transaction Signing

```typescript
export const signTransaction = (xdr: string) => pipe(
  initWalletKit(),
  Effect.flatMap((kit) =>
    Effect.tryPromise({
      try: async () => {
        const { signedTxXdr } = await kit.signTransaction(xdr);
        return signedTxXdr;
      },
      catch: (error) => new WalletError({
        cause: error,
        operation: "sign"
      })
    })
  )
);
```

## Asset Utilities

### Asset Type Guards

```typescript
import { Asset } from "@stellar/stellar-sdk";

export const isNativeAsset = (asset: Asset): boolean =>
  asset.isNative();

export const createAsset = (
  code: string,
  issuer?: string
): Effect.Effect<Asset, never> =>
  Effect.sync(() =>
    issuer ? new Asset(code, issuer) : Asset.native()
  );
```

### Asset Formatting

```typescript
export interface AssetInfo {
  readonly code: string;
  readonly issuer: string;
  readonly type: "native" | "credit_alphanum4" | "credit_alphanum12";
}

export const formatAsset = (asset: AssetInfo): string =>
  asset.type === "native" ? "XLM" : `${asset.code}:${asset.issuer.slice(0, 4)}...`;

export const parseAssetFromBalance = (
  balance: Horizon.HorizonApi.BalanceLine
): Effect.Effect<AssetInfo, never> =>
  Effect.sync(() => ({
    code: balance.asset_type === "native" ? "XLM" : balance.asset_code,
    issuer: balance.asset_type === "native" ? "" : balance.asset_issuer,
    type: balance.asset_type,
  }));
```

## Transaction Building

### Payment Transaction

```typescript
import {
  TransactionBuilder,
  Operation,
  Memo,
  BASE_FEE
} from "@stellar/stellar-sdk";

export const buildPaymentTransaction = (params: {
  sourceAccount: string;
  destination: string;
  asset: Asset;
  amount: string;
  memo?: string;
}) => pipe(
  getStellarConfig(),
  Effect.flatMap((config) =>
    pipe(
      loadAccount(params.sourceAccount),
      Effect.map((account) => {
        const txBuilder = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: config.networkPassphrase,
        });

        txBuilder.addOperation(
          Operation.payment({
            destination: params.destination,
            asset: params.asset,
            amount: params.amount,
          })
        );

        if (params.memo) {
          txBuilder.addMemo(Memo.text(params.memo));
        }

        return txBuilder
          .setTimeout(30)
          .build()
          .toXDR();
      })
    )
  )
);
```

### Multi-Operation Transaction

```typescript
export const buildMultiOpTransaction = (
  sourceAccount: string,
  operations: Operation[]
) => pipe(
  Effect.all({
    config: getStellarConfig(),
    account: loadAccount(sourceAccount),
  }),
  Effect.map(({ config, account }) => {
    const txBuilder = new TransactionBuilder(account, {
      fee: (parseInt(BASE_FEE) * operations.length).toString(),
      networkPassphrase: config.networkPassphrase,
    });

    operations.forEach((op) => txBuilder.addOperation(op));

    return txBuilder
      .setTimeout(30)
      .build()
      .toXDR();
  })
);
```

## Error Handling Patterns

### Retry with Exponential Backoff

```typescript
import { Schedule } from "effect";

export const loadAccountWithRetry = (publicKey: string) => pipe(
  loadAccount(publicKey),
  Effect.retry(
    Schedule.exponential("100 millis").pipe(
      Schedule.intersect(Schedule.recurs(3))
    )
  ),
  Effect.catchAll((error) =>
    Effect.fail(new AccountLoadError({
      cause: error,
      publicKey,
      message: "Failed to load account after 3 retries"
    }))
  )
);
```

### Fallback Chain

```typescript
export const getTokenPrice = (tokenA: Asset, tokenB: Asset) => pipe(
  getOrderbookPrice(tokenA, tokenB),
  Effect.catchAll(() =>
    pipe(
      Effect.log("Orderbook failed, trying path finding"),
      Effect.flatMap(() => getPathPrice(tokenA, tokenB))
    )
  ),
  Effect.catchAll(() =>
    pipe(
      Effect.log("Path finding failed, returning null"),
      Effect.succeed(null)
    )
  )
);
```

## Test Data Management

### Test Fixtures

```typescript
export const TestData = {
  ACCOUNTS: {
    MAIN_ISSUER: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
    SUBFOND_MABIZ: "GAQ5ERJVI6IW5UVNPEVXUUVMXH3GCDHJ4BJAXMAAKPR5VBWWAUOMABIZ",
  },
  ASSETS: {
    EURMTL: {
      code: "EURMTL",
      issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
      type: "credit_alphanum4" as const,
    },
    XLM: {
      code: "XLM",
      issuer: "",
      type: "native" as const,
    },
  }
} as const;
```

### Mock Stellar Service

```typescript
import { Layer } from "effect";

export const MockStellarServiceLive = Layer.succeed(StellarService, {
  loadAccount: (publicKey: string) => Effect.succeed({
    id: publicKey,
    sequence: "1234567890123456",
    balances: [
      { asset_type: "native", balance: "1000.0000000" },
      {
        asset_type: "credit_alphanum4",
        asset_code: "EURMTL",
        asset_issuer: TestData.ACCOUNTS.MAIN_ISSUER,
        balance: "500.00"
      }
    ]
  }),

  fetchOrderbook: (selling, buying) => Effect.succeed([
    { price: "1.0", amount: "1000" },
    { price: "1.1", amount: "500" }
  ])
});
```

## Concurrency and Rate Limiting

### Batch Processing

```typescript
export const loadMultipleAccounts = (
  publicKeys: readonly string[]
) => Effect.all(
  publicKeys.map(loadAccount),
  { concurrency: 3 } // Limit to 3 concurrent requests
);
```

### Sequential with Delay

```typescript
export const loadAccountsSequentially = (
  publicKeys: readonly string[]
) => pipe(
  Effect.all(
    publicKeys.map((key) =>
      pipe(
        loadAccount(key),
        Effect.delay("500 millis") // Add delay between requests
      )
    ),
    { concurrency: 1 }
  )
);
```

## Horizon API Best Practices

### Pagination

```typescript
export const fetchAllTransactions = (
  accountId: string,
  limit = 200
) => pipe(
  getStellarConfig(),
  Effect.flatMap((config) =>
    Effect.tryPromise({
      try: () => config.server
        .transactions()
        .forAccount(accountId)
        .limit(limit)
        .order("desc")
        .call(),
      catch: (error) => new StellarError({
        cause: error,
        operation: "fetchTransactions"
      })
    })
  ),
  Effect.map((response) => response.records)
);
```

### Streaming (Not Recommended with Effect)

For real-time updates, use polling instead:

```typescript
import { Schedule } from "effect";

export const pollAccountBalance = (
  accountId: string,
  intervalSeconds = 10
) => pipe(
  loadAccount(accountId),
  Effect.map((account) => account.balances),
  Effect.repeat(
    Schedule.spaced(`${intervalSeconds} seconds`)
  )
);
```

## Common Patterns

### Check Account Exists

```typescript
export const accountExists = (publicKey: string) => pipe(
  loadAccount(publicKey),
  Effect.map(() => true),
  Effect.catchTag("StellarError", () => Effect.succeed(false))
);
```

### Get Asset Balance

```typescript
export const getAssetBalance = (
  accountId: string,
  asset: AssetInfo
) => pipe(
  loadAccount(accountId),
  Effect.map((account) => {
    const balance = account.balances.find((b) =>
      asset.type === "native"
        ? b.asset_type === "native"
        : b.asset_code === asset.code && b.asset_issuer === asset.issuer
    );
    return balance?.balance ?? "0";
  })
);
```

### Validate Public Key

```typescript
import { StrKey } from "@stellar/stellar-sdk";

export const validatePublicKey = (key: string) =>
  Effect.sync(() => StrKey.isValidEd25519PublicKey(key));

export const parsePublicKey = (key: string) => pipe(
  validatePublicKey(key),
  Effect.flatMap((isValid) =>
    isValid
      ? Effect.succeed(key)
      : Effect.fail(new ValidationError({
          field: "publicKey",
          message: "Invalid Stellar public key"
        }))
  )
);
```

## See Also

- [Effect-TS Patterns](/docs/guides/effect-ts-patterns.md) - Core Effect-TS patterns
- [Effect-TS Testing](/docs/guides/effect-ts-testing.md) - Testing Stellar services
- [TypeScript Configuration](/docs/guides/typescript-config.md) - Type system setup
- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
- [Stellar Developer Docs](https://developers.stellar.org/)
