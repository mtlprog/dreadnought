# Effect-TS Patterns

Comprehensive guide to Effect-TS patterns used throughout the Dreadnought monorepo.

## Service Definition Pattern

All services follow this structure:

```typescript
import { Context, Effect, Layer, pipe } from "effect";

// 1. Define interface
export interface ServiceName {
  readonly method: (params: Params) => Effect.Effect<Result, Error>;
}

// 2. Create tag
export const ServiceName = Context.GenericTag<ServiceName>("@dreadnought/ServiceName");

// 3. Implement live layer
export const ServiceNameLive = Layer.succeed(ServiceName, {
  method: (params) => pipe(
    Effect.succeed(null),
    Effect.tap(() => Effect.log("method called")),
    Effect.map(transform),
    Effect.flatMap(operation)
  )
});
```

## Error Handling Pattern

### Tagged Errors with @effect/schema

```typescript
import * as S from "@effect/schema/Schema";

export class CustomError extends S.TaggedError<CustomError>()(
  "CustomError",
  {
    field: S.String,
    message: S.String,
    cause: S.optional(S.Unknown)
  }
) {}

export class NetworkError extends S.TaggedError<NetworkError>()(
  "NetworkError",
  {
    operation: S.String,
    cause: S.Unknown
  }
) {}
```

### Error Handling with catchTag

```typescript
pipe(
  riskyOperation(),
  Effect.catchTag("CustomError", (error) =>
    pipe(
      Effect.log(`Custom error: ${error.message}`),
      Effect.flatMap(() => fallbackOperation())
    )
  ),
  Effect.catchTag("NetworkError", (error) =>
    Effect.fail(new ApplicationError({ cause: error }))
  )
);
```

## Pipe Pattern (MANDATORY)

**Always use pipe() for Effect chains**:

```typescript
// ✅ CORRECT
pipe(
  initialValue,
  Effect.map(transform),
  Effect.flatMap(operation),
  Effect.catchTag("ErrorTag", handleError),
  Effect.tap(() => Effect.log("Success"))
);

// ❌ WRONG - Never use async/await
async function badExample() {
  try {
    const result = await fetch();
    return result;
  } catch (error) {
    console.error(error);
  }
}

// ❌ WRONG - No method chaining
initialValue
  .map(transform)
  .flatMap(operation);
```

## Layer Composition

### Simple Layer Merge

```typescript
export const AppLayer = Layer.merge(
  ServiceALive,
  ServiceBLive
);
```

### Complex Multi-Layer Composition

```typescript
export const AppLayer = Layer.merge(
  Layer.merge(ConfigServiceLive, LoggerServiceLive),
  Layer.merge(
    Layer.merge(DatabaseServiceLive, NetworkServiceLive),
    Layer.merge(StellarServiceLive, PriceServiceLive)
  )
);
```

### Layer with Dependencies

```typescript
export const ServiceWithDepsLive = Layer.effect(
  ServiceWithDeps,
  Effect.gen(function* () {
    const configService = yield* ConfigService;
    const loggerService = yield* LoggerService;

    return {
      method: (params) => pipe(
        configService.getConfig(),
        Effect.flatMap((config) =>
          loggerService.log(`Using config: ${config.name}`)
        )
      )
    };
  })
);
```

## Runtime Configuration

### BunRuntime for Applications

```typescript
import { BunRuntime } from "@effect/platform-bun";
import { Effect, pipe } from "effect";

const program = pipe(
  Effect.all({
    config: ConfigService,
    stellar: StellarService,
  }),
  Effect.flatMap(({ config, stellar }) =>
    stellar.loadAccount(config.defaultAccount)
  )
);

// Run with BunRuntime
BunRuntime.runMain(
  pipe(
    program,
    Effect.provide(AppLayer),
    Effect.tap(() => Effect.log("Application started"))
  )
);
```

### Effect.runPromise for API Routes

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const program = pipe(
    FundStructureService,
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

## Service Usage Patterns

### Single Service

```typescript
const program = pipe(
  ServiceTag,
  Effect.flatMap((service) => service.method(params))
);
```

### Multiple Services

```typescript
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
```

### Sequential Operations

```typescript
const program = pipe(
  ServiceA,
  Effect.flatMap((serviceA) =>
    pipe(
      serviceA.methodA(),
      Effect.flatMap((resultA) =>
        pipe(
          ServiceB,
          Effect.flatMap((serviceB) => serviceB.methodB(resultA))
        )
      )
    )
  )
);
```

## Concurrency Control

### Parallel Execution with Limits

```typescript
// Process items with max 3 concurrent operations
Effect.all(
  items.map(processItem),
  { concurrency: 3 }
);

// Explicitly sequential (concurrency: 1)
Effect.all(
  items.map(processItem),
  { concurrency: 1 }
);

// Unbounded concurrency (use with caution)
Effect.all(
  items.map(processItem),
  { concurrency: "unbounded" }
);
```

### Concurrent with Batching

```typescript
pipe(
  Effect.all(
    tokens.slice(0, 5).map((token) => getTokenPrice(token)),
    { concurrency: 3 }
  ),
  Effect.flatMap((firstBatch) =>
    Effect.all(
      tokens.slice(5).map((token) => getTokenPrice(token)),
      { concurrency: 3 }
    )
  )
);
```

## Wrapping External APIs

### Promises to Effect

```typescript
// ✅ CORRECT
export const loadAccount = (publicKey: string) => pipe(
  Effect.tryPromise({
    try: () => new Server(horizonUrl).loadAccount(publicKey),
    catch: (error) => new StellarError({
      cause: error,
      operation: "loadAccount"
    })
  }),
  Effect.tap(() => Effect.log(`Account loaded: ${publicKey}`)),
  Effect.timeout("10 seconds")
);
```

### Callbacks to Effect

```typescript
const readFileEffect = (path: string) =>
  Effect.async<string, FileError>((resume) => {
    fs.readFile(path, "utf8", (err, data) => {
      if (err) {
        resume(Effect.fail(new FileError({ cause: err })));
      } else {
        resume(Effect.succeed(data));
      }
    });
  });
```

## Logging Pattern

```typescript
// ✅ Use Effect.log
pipe(
  operation(),
  Effect.tap(() => Effect.log("Operation completed")),
  Effect.tap((result) => Effect.log(`Result: ${JSON.stringify(result)}`))
);

// ❌ NEVER use console.log
console.log("Operation completed"); // FORBIDDEN
```

## Schema Validation Pattern

```typescript
import * as S from "@effect/schema/Schema";

// Define schema
export const ConfigSchema = S.Struct({
  apiKey: S.String,
  timeout: S.Number,
  retries: S.optional(S.Number)
});

// Parse and validate
export const loadConfig = () => pipe(
  Effect.sync(() => process.env),
  Effect.flatMap((env) =>
    S.decodeUnknown(ConfigSchema)({
      apiKey: env.API_KEY,
      timeout: Number(env.TIMEOUT ?? 5000),
      ...(env.RETRIES ? { retries: Number(env.RETRIES) } : {})
    })
  ),
  Effect.mapError((error) => new ValidationError({ cause: error }))
);
```

## Retry and Timeout Patterns

### Retry with Policy

```typescript
import { Schedule } from "effect";

pipe(
  unreliableOperation(),
  Effect.retry(
    Schedule.exponential("100 millis").pipe(
      Schedule.intersect(Schedule.recurs(3))
    )
  )
);
```

### Timeout

```typescript
pipe(
  longOperation(),
  Effect.timeout("30 seconds"),
  Effect.catchTag("TimeoutException", () =>
    Effect.fail(new OperationTimeoutError())
  )
);
```

## Resource Management

### Scoped Resources

```typescript
const scopedResource = Effect.acquireRelease(
  Effect.sync(() => createResource()),
  (resource) => Effect.sync(() => resource.close())
);

pipe(
  Effect.scoped(
    pipe(
      scopedResource,
      Effect.flatMap((resource) => useResource(resource))
    )
  )
);
```

## Common Anti-Patterns

### ❌ FORBIDDEN

```typescript
// ❌ Using async/await
async function fetchData() {
  const result = await fetch(url);
  return result;
}

// ❌ Using try/catch
try {
  const result = riskyOperation();
} catch (error) {
  console.error(error);
}

// ❌ Using Promises directly
Promise.all([op1(), op2()]);

// ❌ Throwing errors
throw new Error("Something went wrong");

// ❌ Using console.log
console.log("Debug info");

// ❌ Method chaining without pipe
effect.map(fn).flatMap(fn2);
```

### ✅ CORRECT

```typescript
// ✅ Use Effect.tryPromise
pipe(
  Effect.tryPromise({
    try: () => fetch(url),
    catch: (error) => new NetworkError({ cause: error })
  })
);

// ✅ Use Effect.catchTag
pipe(
  riskyOperation(),
  Effect.catchTag("ErrorTag", handleError)
);

// ✅ Use Effect.all
Effect.all([op1(), op2()]);

// ✅ Use Effect.fail
Effect.fail(new CustomError({ message: "Something went wrong" }));

// ✅ Use Effect.log
Effect.log("Debug info");

// ✅ Use pipe
pipe(
  effect,
  Effect.map(fn),
  Effect.flatMap(fn2)
);
```

## See Also

- [Effect-TS Testing](/docs/guides/effect-ts-testing.md) - Testing patterns with ManagedRuntime
- [Stellar Integration](/docs/guides/stellar-integration.md) - Stellar SDK with Effect-TS
- [TypeScript Configuration](/docs/guides/typescript-config.md) - Type system configuration
- [Effect-TS Documentation](https://effect.website/) - Official documentation
