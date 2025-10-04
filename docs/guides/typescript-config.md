# TypeScript Configuration Guide

Complete guide to TypeScript configuration and patterns used in the Dreadnought monorepo.

## Strict Mode Configuration (Non-negotiable)

All projects in the monorepo use TypeScript strict mode with additional safety checks:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

## Branded Types with Effect

Branded types provide compile-time type safety for domain-specific values.

### Simple Nominal Branding

```typescript
import { Brand } from "effect";

export type UserId = string & Brand.Brand<"UserId">;
export const UserId = Brand.nominal<UserId>();

export type AccountId = string & Brand.Brand<"AccountId">;
export const AccountId = Brand.nominal<AccountId>();

// Usage
const userId: UserId = UserId("user-123");
const accountId: AccountId = AccountId("acc-456");

// ❌ Type error: userId and accountId are not assignable to each other
const wrongAssignment: UserId = accountId; // ERROR
```

### Refined Branded Types with Validation

```typescript
import { Brand } from "effect";

export type PublicKey = string & Brand.Brand<"PublicKey">;
export const PublicKey = Brand.refined<PublicKey>(
  (s): s is PublicKey => /^G[A-Z2-7]{55}$/.test(s),
  (s) => Brand.error(`Invalid Stellar public key: ${s}`)
);

export type Email = string & Brand.Brand<"Email">;
export const Email = Brand.refined<Email>(
  (s): s is Email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
  (s) => Brand.error(`Invalid email: ${s}`)
);

// Usage with Effect
import { Effect } from "effect";

const validatePublicKey = (key: string): Effect.Effect<PublicKey, Brand.BrandErrors> =>
  Effect.try(() => PublicKey(key));

const program = pipe(
  validatePublicKey("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V"),
  Effect.map((validKey) => {
    // validKey is now PublicKey type
    return { publicKey: validKey };
  })
);
```

### Numeric Branded Types

```typescript
export type PositiveNumber = number & Brand.Brand<"PositiveNumber">;
export const PositiveNumber = Brand.refined<PositiveNumber>(
  (n): n is PositiveNumber => n > 0,
  (n) => Brand.error(`Number must be positive: ${n}`)
);

export type Percentage = number & Brand.Brand<"Percentage">;
export const Percentage = Brand.refined<Percentage>(
  (n): n is Percentage => n >= 0 && n <= 100,
  (n) => Brand.error(`Percentage must be between 0 and 100: ${n}`)
);
```

## exactOptionalPropertyTypes Handling

The `exactOptionalPropertyTypes` flag prevents assigning `undefined` to optional properties.

### ❌ WRONG: Assigning undefined

```typescript
interface Config {
  apiKey: string;
  timeout?: number; // Optional property
}

// ❌ ERROR with exactOptionalPropertyTypes
const config: Config = {
  apiKey: "key",
  timeout: someCondition ? 5000 : undefined // ERROR!
};
```

### ✅ CORRECT: Conditional Spread

```typescript
// ✅ Use conditional spread
const config: Config = {
  apiKey: "key",
  ...(someCondition ? { timeout: 5000 } : {})
};

// ✅ Use explicit branching
const config: Config = someCondition
  ? { apiKey: "key", timeout: 5000 }
  : { apiKey: "key" };

// ✅ Use separate construction
const baseConfig = { apiKey: "key" };
const config: Config = someCondition
  ? { ...baseConfig, timeout: 5000 }
  : baseConfig;
```

### Effect-TS Pattern with Optional Fields

```typescript
import { Effect, pipe } from "effect";

interface ProjectData {
  id: string;
  name: string;
  deadline?: Date;
}

// ✅ CORRECT: Conditional spread with Effect
export const createProject = (
  id: string,
  name: string,
  hasDeadline: boolean
): Effect.Effect<ProjectData, never> =>
  Effect.sync(() => ({
    id,
    name,
    ...(hasDeadline ? { deadline: new Date() } : {})
  }));

// ✅ CORRECT: Use map for transformations
export const addOptionalField = (
  base: { id: string; name: string },
  shouldAdd: boolean
): Effect.Effect<ProjectData, never> =>
  pipe(
    Effect.succeed(base),
    Effect.map((data) =>
      shouldAdd
        ? { ...data, deadline: new Date() }
        : data
    )
  );
```

## Array Index Access Safety

With `noUncheckedIndexedAccess`, array access returns `T | undefined`.

### ❌ WRONG: Unchecked array access

```typescript
const items = ["a", "b", "c"];
const first = items[0]; // Type: string | undefined
console.log(first.toUpperCase()); // ERROR: first might be undefined
```

### ✅ CORRECT: Safe array access

```typescript
// ✅ Use optional chaining
const first = items[0];
console.log(first?.toUpperCase());

// ✅ Use type guard
if (items[0] !== undefined) {
  console.log(items[0].toUpperCase()); // OK: items[0] is string
}

// ✅ Use Effect for safer handling
import { Effect, Option } from "effect";

const getFirstItem = <T>(items: readonly T[]): Effect.Effect<T, NoItemError> =>
  items[0] !== undefined
    ? Effect.succeed(items[0])
    : Effect.fail(new NoItemError());

// ✅ Use Option for nullable values
const getFirstItemOption = <T>(items: readonly T[]): Option.Option<T> =>
  items[0] !== undefined ? Option.some(items[0]) : Option.none();
```

## Const Assertions

Use `as const` for literal type inference and immutability.

### Configuration Objects

```typescript
// ✅ Use as const for configuration
export const STELLAR_ASSETS = {
  EURMTL: {
    code: "EURMTL",
    issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
    type: "credit_alphanum4"
  },
  XLM: {
    code: "XLM",
    issuer: "",
    type: "native"
  }
} as const;

// Type is now:
// {
//   readonly EURMTL: {
//     readonly code: "EURMTL";
//     readonly issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V";
//     readonly type: "credit_alphanum4";
//   };
//   ...
// }
```

### Enum-like Patterns

```typescript
// ✅ Use const object instead of enum
export const ProjectStatus = {
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELED: "canceled"
} as const;

export type ProjectStatus = typeof ProjectStatus[keyof typeof ProjectStatus];
// Type: "active" | "completed" | "canceled"

// Usage in Effect
export const validateStatus = (
  status: string
): Effect.Effect<ProjectStatus, ValidationError> =>
  Object.values(ProjectStatus).includes(status as ProjectStatus)
    ? Effect.succeed(status as ProjectStatus)
    : Effect.fail(new ValidationError({ field: "status", value: status }));
```

## Readonly Collections

### Readonly Arrays

```typescript
// ✅ Prefer readonly arrays for immutability
export interface FundStructure {
  readonly accounts: readonly Account[];
  readonly tokens: readonly Token[];
}

// Function signatures with readonly
export const processAccounts = (
  accounts: readonly Account[]
): Effect.Effect<ProcessedData, ProcessError> =>
  Effect.all(
    accounts.map(processAccount),
    { concurrency: 3 }
  );
```

### Readonly Records

```typescript
// ✅ Use Record with readonly
export type AssetPrices = Readonly<Record<string, number>>;

// ✅ Use ReadonlyMap for mutable operations
const priceCache: ReadonlyMap<string, number> = new Map([
  ["EURMTL", 1.0],
  ["MTL", 0.5]
]);
```

## Union Types and Discriminated Unions

### Discriminated Unions

```typescript
// ✅ Use discriminated unions for state
export type LoadingState<T, E> =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "Success"; readonly data: T }
  | { readonly _tag: "Failure"; readonly error: E };

export const matchLoadingState = <T, E, R>(
  state: LoadingState<T, E>,
  handlers: {
    onLoading: () => R;
    onSuccess: (data: T) => R;
    onFailure: (error: E) => R;
  }
): R => {
  switch (state._tag) {
    case "Loading":
      return handlers.onLoading();
    case "Success":
      return handlers.onSuccess(state.data);
    case "Failure":
      return handlers.onFailure(state.error);
  }
};
```

### Effect-TS Tagged Unions

```typescript
import * as S from "@effect/schema/Schema";

// ✅ Use Schema for tagged errors
export class NotFoundError extends S.TaggedError<NotFoundError>()(
  "NotFoundError",
  {
    id: S.String,
  }
) {}

export class ValidationError extends S.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: S.String,
    message: S.String,
  }
) {}

// Usage with catchTag
pipe(
  findItem(id),
  Effect.catchTag("NotFoundError", (error) =>
    Effect.fail(new ApiError({ message: `Item ${error.id} not found` }))
  ),
  Effect.catchTag("ValidationError", (error) =>
    Effect.fail(new ApiError({ message: error.message }))
  )
);
```

## Type Narrowing

### Type Guards

```typescript
// ✅ Use type guards with Effect
export const isPositiveNumber = (n: number): n is PositiveNumber =>
  n > 0;

export const validatePositive = (n: number): Effect.Effect<PositiveNumber, ValidationError> =>
  isPositiveNumber(n)
    ? Effect.succeed(n as PositiveNumber)
    : Effect.fail(new ValidationError({
        field: "number",
        message: "Must be positive"
      }));
```

### Assertion Functions

```typescript
// ✅ Use assertion functions for invariants
export function assertPublicKey(key: string): asserts key is PublicKey {
  if (!/^G[A-Z2-7]{55}$/.test(key)) {
    throw new Error(`Invalid public key: ${key}`);
  }
}

// Convert to Effect pattern
export const assertPublicKeyEffect = (key: string): Effect.Effect<PublicKey, ValidationError> =>
  /^G[A-Z2-7]{55}$/.test(key)
    ? Effect.succeed(key as PublicKey)
    : Effect.fail(new ValidationError({ field: "publicKey", value: key }));
```

## Generic Constraints

### Bounded Generics

```typescript
// ✅ Use generic constraints
export interface Service<T extends { id: string }> {
  readonly findById: (id: string) => Effect.Effect<T, NotFoundError>;
  readonly save: (item: T) => Effect.Effect<void, SaveError>;
}

// ✅ Multiple constraints
export const mergeItems = <T extends { id: string } & { timestamp: number }>(
  items: readonly T[]
): T[] =>
  items.sort((a, b) => b.timestamp - a.timestamp);
```

### Generic Effect Functions

```typescript
// ✅ Generic Effect with constraints
export const fetchAndParse = <T>(
  url: string,
  schema: S.Schema<T, unknown>
): Effect.Effect<T, FetchError | ParseError> =>
  pipe(
    Effect.tryPromise({
      try: () => fetch(url).then(r => r.json()),
      catch: (error) => new FetchError({ cause: error })
    }),
    Effect.flatMap((data) =>
      S.decodeUnknown(schema)(data).pipe(
        Effect.mapError((error) => new ParseError({ cause: error }))
      )
    )
  );
```

## Common TypeScript Patterns

### Utility Types

```typescript
// ✅ Use built-in utility types
type PartialAccount = Partial<Account>;
type RequiredAccount = Required<Account>;
type AccountKeys = keyof Account;
type AccountValues = Account[keyof Account];

// ✅ Create custom utility types
type WithTimestamp<T> = T & { readonly timestamp: number };
type WithId<T> = T & { readonly id: string };
type Nullable<T> = T | null;
type AsyncResult<T, E> = Effect.Effect<T, E>;
```

### Template Literal Types

```typescript
// ✅ Use template literal types for asset codes
type AssetPrefix = "P" | "C";
type AssetCode<T extends string> = `${AssetPrefix}${T}`;

type ProjectToken = AssetCode<"MTL">; // "PMTL" | "CMTL"
```

## See Also

- [Effect-TS Patterns](/docs/guides/effect-ts-patterns.md) - Effect-TS service patterns
- [Effect-TS Testing](/docs/guides/effect-ts-testing.md) - Testing with types
- [Stellar Integration](/docs/guides/stellar-integration.md) - Stellar type patterns
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) - Official documentation
