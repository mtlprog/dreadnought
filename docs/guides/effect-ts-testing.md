# Effect-TS Testing with ManagedRuntime

Complete guide to testing Effect-TS services using the ManagedRuntime pattern.

## Core Testing Pattern

### CRITICAL: ManagedRuntime Pattern (MANDATORY)

**Always use `ManagedRuntime.make()` for tests, never `Runtime.make()`**

```typescript
import { describe, test, expect } from "bun:test";
import { Effect, ManagedRuntime, pipe } from "effect";
import { ServiceName, ServiceNameLive } from "./service";

describe("Service", () => {
  test("should work correctly", async () => {
    const testRuntime = ManagedRuntime.make(ServiceNameLive);

    try {
      const program = pipe(
        ServiceName,
        Effect.flatMap((service) => service.method())
      );

      const result = await testRuntime.runPromise(program);
      expect(result).toBe(expected);
    } finally {
      // ОБЯЗАТЕЛЬНО: всегда dispose runtime
      await testRuntime.dispose();
    }
  });
});
```

## Multiple Service Dependencies

```typescript
import { Layer } from "effect";

describe("Complex Service", () => {
  test("should handle dependencies", async () => {
    const TestLayer = Layer.merge(
      ServiceALive,
      Layer.merge(ServiceBLive, ServiceCLive)
    );

    const testRuntime = ManagedRuntime.make(TestLayer);

    try {
      const program = pipe(
        Effect.all({
          serviceA: ServiceA,
          serviceB: ServiceB,
        }),
        Effect.flatMap(({ serviceA, serviceB }) =>
          Effect.all([
            serviceA.methodA(),
            serviceB.methodB(),
          ])
        )
      );

      const [resultA, resultB] = await testRuntime.runPromise(program);
      expect(resultA).toBe(expectedA);
      expect(resultB).toBe(expectedB);
    } finally {
      await testRuntime.dispose();
    }
  });
});
```

## Error Testing Pattern

```typescript
test("should handle errors correctly", async () => {
  const testRuntime = ManagedRuntime.make(ServiceLive);

  try {
    const program = pipe(
      ServiceName,
      Effect.flatMap((service) => service.failingMethod()),
      Effect.catchTag("ExpectedError", (error) => Effect.succeed(error))
    );

    const result = await testRuntime.runPromise(program);
    expect(result).toBeInstanceOf(ExpectedError);
  } finally {
    await testRuntime.dispose();
  }
});

test("should propagate unexpected errors", async () => {
  const testRuntime = ManagedRuntime.make(ServiceLive);

  try {
    const program = pipe(
      ServiceName,
      Effect.flatMap((service) => service.failingMethod())
    );

    await expect(testRuntime.runPromise(program)).rejects.toThrow();
  } finally {
    await testRuntime.dispose();
  }
});
```

## Async Resource Testing

```typescript
test("should manage resources properly", async () => {
  const testRuntime = ManagedRuntime.make(
    Layer.merge(DatabaseLive, NetworkLive)
  );

  try {
    const program = pipe(
      Effect.all({
        db: DatabaseService,
        network: NetworkService,
      }),
      Effect.flatMap(({ db, network }) =>
        pipe(
          db.transaction((tx) =>
            pipe(
              network.fetchData(),
              Effect.flatMap((data) => tx.insert(data))
            )
          )
        )
      )
    );

    const result = await testRuntime.runPromise(program);
    expect(result.id).toBeDefined();
  } finally {
    await testRuntime.dispose();
  }
});
```

## Mock Services

### Simple Mock

```typescript
export const MockServiceLive = Layer.succeed(ServiceTag, {
  method: (params) => Effect.succeed({ mocked: true })
});

test("should use mock", async () => {
  const testRuntime = ManagedRuntime.make(MockServiceLive);

  try {
    const program = pipe(
      ServiceTag,
      Effect.flatMap((service) => service.method({ id: "test" }))
    );

    const result = await testRuntime.runPromise(program);
    expect(result.mocked).toBe(true);
  } finally {
    await testRuntime.dispose();
  }
});
```

### Conditional Mock

```typescript
export const ConditionalMockLive = Layer.succeed(ServiceTag, {
  method: (params) =>
    params.shouldFail
      ? Effect.fail(new MockError({ message: "Forced failure" }))
      : Effect.succeed({ data: params.id })
});
```

### Mock with Test Data

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
  })
});
```

## Testing Anti-Patterns (FORBIDDEN)

### ❌ WRONG: Using non-existent Runtime.make()

```typescript
// ❌ НЕ СУЩЕСТВУЕТ - Runtime.make() не существует
const runtime = Runtime.make(TestLayer); // ERROR!
```

### ❌ WRONG: Not disposing runtime

```typescript
// ❌ УТЕЧКА РЕСУРСОВ - нет dispose()
test("bad test", async () => {
  const testRuntime = ManagedRuntime.make(ServiceLive);
  const result = await testRuntime.runPromise(program);
  // ОТСУТСТВУЕТ: await testRuntime.dispose();
});
```

### ❌ WRONG: Reusing runtime between tests

```typescript
// ❌ КОНФЛИКТ СОСТОЯНИЯ - переиспользование runtime
describe("Bad Tests", () => {
  const testRuntime = ManagedRuntime.make(ServiceLive); // ПЛОХО!

  test("test1", async () => {
    // runtime уже может быть в неправильном состоянии
  });
});
```

### ✅ CORRECT: Fresh runtime per test

```typescript
// ✅ ПРАВИЛЬНО: новый runtime для каждого теста
describe("Good Tests", () => {
  test("test1", async () => {
    const testRuntime = ManagedRuntime.make(ServiceLive);
    try {
      // test logic
    } finally {
      await testRuntime.dispose();
    }
  });

  test("test2", async () => {
    const testRuntime = ManagedRuntime.make(ServiceLive); // Новый!
    try {
      // test logic
    } finally {
      await testRuntime.dispose();
    }
  });
});
```

## Test Organization

### File Structure

```
src/
├── service.ts
├── service.test.ts    # Tests next to code
└── test-utils/
    ├── fixtures.ts    # Test data
    └── mocks.ts       # Mock services
```

### Shared Test Utilities

```typescript
// test-utils/test-runtime.ts
export const createTestRuntime = <R, E>(layer: Layer.Layer<R, E>) => {
  const runtime = ManagedRuntime.make(layer);
  return {
    runPromise: runtime.runPromise.bind(runtime),
    dispose: runtime.dispose.bind(runtime)
  };
};

// Usage
test("with helper", async () => {
  const testRuntime = createTestRuntime(ServiceLive);
  try {
    const result = await testRuntime.runPromise(program);
    expect(result).toBe(expected);
  } finally {
    await testRuntime.dispose();
  }
});
```

## Integration Testing

### With Real Services

```typescript
describe("Integration Tests", () => {
  test("should work with real Stellar API", async () => {
    const testRuntime = ManagedRuntime.make(
      Layer.merge(StellarServiceLive, PriceServiceLive)
    );

    try {
      const program = pipe(
        Effect.all({
          stellar: StellarService,
          price: PriceService,
        }),
        Effect.flatMap(({ stellar, price }) =>
          pipe(
            stellar.loadAccount("GACKTN..."),
            Effect.flatMap((account) =>
              price.getTokenPrice(
                account.balances[0]!.asset,
                { code: "XLM", issuer: "" }
              )
            )
          )
        )
      );

      const result = await testRuntime.runPromise(program);
      expect(result.price).toBeGreaterThan(0);
    } finally {
      await testRuntime.dispose();
    }
  });
});
```

### With Environment Variables

```typescript
import { beforeAll, afterAll } from "bun:test";

describe("Environment Tests", () => {
  const originalEnv = process.env.STELLAR_NETWORK;

  beforeAll(() => {
    process.env.STELLAR_NETWORK = "testnet";
  });

  afterAll(() => {
    process.env.STELLAR_NETWORK = originalEnv;
  });

  test("should use testnet", async () => {
    const testRuntime = ManagedRuntime.make(StellarServiceLive);
    try {
      const program = pipe(
        StellarService,
        Effect.flatMap((service) => service.getConfig())
      );

      const result = await testRuntime.runPromise(program);
      expect(result.network).toBe("testnet");
    } finally {
      await testRuntime.dispose();
    }
  });
});
```

## Concurrency Testing

```typescript
test("should handle concurrent requests", async () => {
  const testRuntime = ManagedRuntime.make(ServiceLive);

  try {
    const program = Effect.all(
      [1, 2, 3, 4, 5].map((id) =>
        pipe(
          ServiceTag,
          Effect.flatMap((service) => service.process({ id }))
        )
      ),
      { concurrency: 3 }
    );

    const results = await testRuntime.runPromise(program);
    expect(results).toHaveLength(5);
  } finally {
    await testRuntime.dispose();
  }
});
```

## Timeout Testing

```typescript
test("should timeout long operations", async () => {
  const testRuntime = ManagedRuntime.make(ServiceLive);

  try {
    const program = pipe(
      ServiceTag,
      Effect.flatMap((service) => service.longOperation()),
      Effect.timeout("1 second")
    );

    await expect(testRuntime.runPromise(program)).rejects.toThrow();
  } finally {
    await testRuntime.dispose();
  }
});
```

## Critical Testing Reminders

**НИКОГДА НЕ ЗАБЫВАЙ:**

1. `const testRuntime = ManagedRuntime.make(ServiceLive)` - правильный способ
2. `try { ... } finally { await testRuntime.dispose() }` - обязательная структура
3. Новый runtime для каждого теста - никогда не переиспользовать
4. Используй `Effect.catchTag` для обработки ошибок в тестах
5. Оборачивай все внешние API в `Effect.tryPromise`

## Test Coverage Requirements

For shared libraries and packages:
- ✅ Minimum 80% test coverage
- ✅ All public APIs tested
- ✅ Error paths tested
- ✅ Edge cases covered
- ✅ Integration tests for external services

## See Also

- [Effect-TS Patterns](/docs/guides/effect-ts-patterns.md) - Core Effect-TS patterns
- [Stellar Integration](/docs/guides/stellar-integration.md) - Testing Stellar services
- [TypeScript Configuration](/docs/guides/typescript-config.md) - Type system setup
