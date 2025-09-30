# CLAUDE.md

This file provides comprehensive guidance to Claude Code for working with the Dreadnought monorepo - a blockchain dApp development platform using Effect-TS, Stellar, and Next.js with a retrofuturistic design aesthetic.

## 🎯 Core Philosophy

This is a **Effect-TS first** monorepo for building blockchain dApps with maximum code reuse. Every async operation, error handling, and side effect MUST use Effect-TS. No exceptions.

### Non-Negotiable Rules
1. **ALWAYS use Effect-TS** - No async/await, no Promises, no try/catch
2. **Develop in /apps first** - Only move to /packages when explicitly requested
3. **Reuse over rebuild** - Check existing packages before creating new code
4. **Test-driven package changes** - All package modifications need tests
5. **Use Bun** - Not Node.js, npm, pnpm, or yarn

## 📋 Development Workflow

### PHASE 1: Requirements Gathering (MANDATORY)

Before writing ANY code, you MUST:

1. **Ask clarifying questions** about requirements
2. **Identify functional requirements** - what exactly needs to be built
3. **Understand context** - how it fits into existing system
4. **Clarify edge cases** - error scenarios handling
5. **Confirm UI/UX expectations** - visual design, interactions
6. **Identify integrations** - blockchain, APIs, services

**DO NOT PROCEED** with implementation until all questions are answered.

### PHASE 2: Package Analysis (MANDATORY)

Before starting development:

1. **Read `/packages/README.md`** to understand available packages
2. **Analyze existing packages** for code reuse
3. **Document reuse potential** for each relevant package

### PHASE 3: Implementation

**ALWAYS develop new features in `/apps/[app-name]` first**

✅ DO:
- Create new app in /apps/
- Use existing packages from /packages/
- Write tests for any package modifications
- Maintain backward compatibility

❌ DO NOT:
- Create new packages without explicit request
- Modify packages without permission
- Move code to packages unless requested
- Break existing functionality

## 🏗️ Project Structure

```
dreadnought/
├── apps/                    # NextJS dApps (thin layer)
│   └── [app-name]/         # Individual dApp
├── packages/               # Reusable components
│   ├── ui/                # @dreadnought/ui - Shared UI
│   ├── stellar-auth/      # @dreadnought/stellar-auth
│   ├── stellar-nft/       # @dreadnought/stellar-nft
│   ├── stellar-wallet-kit/# @dreadnought/stellar-wallet-kit
│   ├── bsn/              # @dreadnought/bsn
│   ├── mmwb/             # @dreadnought/mmwb
│   ├── config/           # @dreadnought/config
│   └── utils/            # @dreadnought/utils
```

### Package Naming Convention
- Scope: `@dreadnought/[package-name]`
- Use kebab-case
- Be specific: `stellar-auth` not just `auth`

## 🎨 Design System: Retrofuturistic Brutalism

The Dreadnought design system draws inspiration from 90s anime interfaces (Evangelion, Serial Experiments Lain, Ghost in the Shell, Bubblegum Crisis, Gundam) combined with modern cyberpunk aesthetics. Every visual decision serves both aesthetic cohesion and user needs.

**📘 Full Design System**: See `/docs/guides/design-system.md` for comprehensive guidelines including:
- Anime-inspired color palettes (Evangelion, Lain, Ghost in the Shell, etc.)
- Typography system with fluid scaling
- Visual effects (glitch, scanlines, CRT glow, holographic)
- Component patterns (buttons, panels, forms, navigation)
- Animation principles and timing
- Responsive design and accessibility

### Quick Reference

**Core Principles:**
1. **Functional Brutalism** - Every element serves a purpose
2. **Cathode Display Aesthetic** - Terminal-like interfaces with phosphor glow
3. **Angular Geometry** - Zero border-radius (except loading states)
4. **High Contrast Clarity** - 7:1 minimum contrast ratio
5. **Oversized Elements** - Large, bold, commanding presence
6. **Information Dense** - Complex layouts inspired by anime HUDs

**Color Philosophy:**
- Create context-specific palettes inspired by 90s anime interfaces
- Background: Pure black (#000000) or near-black
- Text: High contrast white or tinted grays
- Accents: Electric, saturated colors (cyan, green, red, pink, orange)

**Component Checklist:**
- ✅ Zero border-radius (except loaders)
- ✅ Minimum 48px touch targets
- ✅ High contrast (7:1 minimum)
- ✅ Monospace for technical data
- ✅ UPPERCASE for labels/system messages
- ✅ Scanlines or CRT effects where appropriate

## 💻 Technical Stack

### Core Dependencies
```json
{
  "effect": "latest",
  "@effect/platform": "latest",
  "@effect/platform-bun": "latest",
  "@effect/schema": "latest",
  "@stellar/stellar-sdk": "^11.0.0",
  "@stellar/wallets-kit": "^1.0.0"
}
```

### Effect-TS Patterns (MANDATORY)

#### Service Definition
```typescript
export interface ServiceName {
  readonly method: (params) => Effect.Effect<Result, Error>
}

export const ServiceName = Context.GenericTag<ServiceName>("@dreadnought/ServiceName")

export const ServiceNameLive = Layer.succeed(ServiceName, {
  method: (params) => pipe(
    Effect.succeed(null),
    Effect.tap(() => Effect.log("method called"))
  )
})
```

#### Error Handling
```typescript
import * as S from "@effect/schema/Schema"

export class CustomError extends S.TaggedError<CustomError>()(
  "CustomError",
  {
    field: S.String,
    message: S.String,
    cause: S.optional(S.Unknown)
  }
) {}
```

#### Always Use Pipe
```typescript
// ✅ CORRECT
pipe(
  initialValue,
  Effect.map(transform),
  Effect.flatMap(operation),
  Effect.catchTag("ErrorTag", handleError)
)

// ❌ WRONG - Never use async/await
async function badExample() {
  try {
    const result = await fetch()
    return result
  } catch (error) {
    console.error(error)
  }
}
```

## 🔧 Commands & Scripts

### Development
```bash
bun install          # Install dependencies
bun dev             # Start development
bun test            # Run tests
bun build           # Build for production
bun lint            # Run linter
```

### Git Workflow (Trunk-based)
```bash
# Work directly on master
git checkout master
git pull origin master
git add .
git commit -m "feat(package): description"
git push origin master
```

### Commit Convention
```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, perf, test, chore
Scopes: ui, stellar-auth, stellar-nft, bsn, mmwb, config, utils
Breaking: Add ! after type or BREAKING CHANGE in footer
```

## ⚙️ TypeScript Configuration

### Strict Mode (Non-negotiable)
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

### Branded Types
```typescript
import { Brand } from "effect"

export type UserId = string & Brand.Brand<"UserId">
export const UserId = Brand.nominal<UserId>()

export type PublicKey = string & Brand.Brand<"PublicKey">
export const PublicKey = Brand.refined<PublicKey>(
  (s): s is PublicKey => /^G[A-Z2-7]{55}$/.test(s),
  (s) => Brand.error(`Invalid public key: ${s}`)
)
```

## 🌟 Stellar Blockchain Integration

### Network Configuration
```typescript
// Always use Effect-TS for Stellar operations
export const loadAccount = (publicKey: string): Effect.Effect<Account, NetworkError> =>
  pipe(
    StellarConfig,
    Effect.flatMap(config =>
      Effect.tryPromise({
        try: () => new Horizon.Server(config.horizonUrl).loadAccount(publicKey),
        catch: (error) => new NetworkError({ cause: error })
      })
    )
  )
```

### Wallet Integration
- Use `@stellar/wallets-kit` for multi-wallet support
- Always wrap in Effect.tryPromise
- Support Freighter, Albedo, xBull wallets

## 🧪 Testing Strategy

### Test Organization
```
src/
├── service.ts
├── service.test.ts    # Tests next to code
└── test-utils/
    └── fixtures.ts    # Test data
```

### Effect-TS Testing Patterns (CRITICAL)

#### ManagedRuntime Pattern (MANDATORY)
```typescript
import { describe, test, expect, afterEach } from "bun:test";
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

#### Multiple Service Dependencies
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

#### Error Testing Pattern
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
```

#### Async Resource Testing
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

### Testing Anti-Patterns (FORBIDDEN)

#### ❌ WRONG: Using non-existent Runtime.make()
```typescript
// ❌ НЕ СУЩЕСТВУЕТ - Runtime.make() не существует
const runtime = Runtime.make(TestLayer); // ERROR!
```

#### ❌ WRONG: Not disposing runtime
```typescript
// ❌ УТЕЧКА РЕСУРСОВ - нет dispose()
test("bad test", async () => {
  const testRuntime = ManagedRuntime.make(ServiceLive);
  const result = await testRuntime.runPromise(program);
  // ОТСУТСТВУЕТ: await testRuntime.dispose();
});
```

#### ❌ WRONG: Reusing runtime between tests
```typescript
// ❌ КОНФЛИКТ СОСТОЯНИЯ - переиспользование runtime
describe("Bad Tests", () => {
  const testRuntime = ManagedRuntime.make(ServiceLive); // ПЛОХО!

  test("test1", async () => {
    // runtime уже может быть в неправильном состоянии
  });
});
```

#### ✅ CORRECT: Fresh runtime per test
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

### Runtime Configuration Patterns

#### BunRuntime for Applications
```typescript
import { BunRuntime } from "@effect/platform-bun";
import { Effect, pipe } from "effect";

// ✅ ПРАВИЛЬНО: для production приложений
const program = pipe(
  Effect.all({
    config: ConfigService,
    stellar: StellarService,
  }),
  Effect.flatMap(({ config, stellar }) =>
    stellar.loadAccount(config.defaultAccount)
  )
);

// Запуск с BunRuntime
BunRuntime.runMain(
  pipe(
    program,
    Effect.provide(AppLayer),
    Effect.tap(() => Effect.log("Application started"))
  )
);
```

#### Layer Composition Best Practices
```typescript
// ✅ ПРАВИЛЬНО: композиция слоев
export const AppLayer = Layer.merge(
  Layer.merge(ConfigServiceLive, LoggerServiceLive),
  Layer.merge(
    Layer.merge(DatabaseServiceLive, NetworkServiceLive),
    Layer.merge(StellarServiceLive, PriceServiceLive)
  )
);

// ✅ ПРАВИЛЬНО: для API роутов
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

### TypeScript Configuration Issues

#### exactOptionalPropertyTypes Fix
```typescript
// ❌ WRONG: undefined assignment with exactOptionalPropertyTypes
const result = {
  ...baseObject,
  optionalField: someCondition ? value : undefined // ERROR!
};

// ✅ CORRECT: conditional spread
const result = {
  ...baseObject,
  ...(someCondition ? { optionalField: value } : {})
};

// ✅ CORRECT: explicit handling
const result = someCondition
  ? { ...baseObject, optionalField: value }
  : baseObject;
```

#### Stellar SDK Integration with Effect
```typescript
import { Effect, pipe } from "effect";
import { Server } from "@stellar/stellar-sdk/lib/horizon";

// ✅ ПРАВИЛЬНО: оборачивание Stellar SDK в Effect
export const loadAccount = (publicKey: string) => pipe(
  Effect.tryPromise({
    try: () => new Server(horizonUrl).loadAccount(publicKey),
    catch: (error) => new StellarError({
      cause: error,
      message: `Failed to load account: ${publicKey}`
    })
  }),
  Effect.tap(() => Effect.log(`Account loaded: ${publicKey}`)),
  Effect.timeout("10 seconds")
);

// ✅ ПРАВИЛЬНО: обработка path finding
export const findPaymentPath = (
  source: Asset,
  destination: Asset,
  amount: string
) => pipe(
  Effect.tryPromise({
    try: () => server.strictReceivePaymentPaths(
      source,
      destination,
      amount
    ).call(),
    catch: (error) => new PathFindingError({ cause: error })
  }),
  Effect.map(response => response.records),
  Effect.tap(paths => Effect.log(`Found ${paths.length} paths`))
);
```

### Test Data Management
```typescript
// ✅ ПРАВИЛЬНО: тестовые фикстуры
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

// ✅ ПРАВИЛЬНО: mock сервисы для тестов
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

## 🚫 Forbidden Patterns

### NEVER DO:
- ❌ Use async/await - always use Effect
- ❌ Use try/catch - use Effect.tryPromise
- ❌ Use Promises directly - wrap in Effect
- ❌ Throw errors - use Effect.fail
- ❌ Use console.log - use Effect.log
- ❌ Create packages prematurely
- ❌ Use rounded corners in UI
- ❌ Use npm/yarn/pnpm - use Bun
- ❌ Commit directly to packages without tests
- ❌ Store secrets in code

### Effect-TS Anti-Patterns (CRITICAL)
- ❌ **Runtime.make()** - НЕ СУЩЕСТВУЕТ! Use `ManagedRuntime.make()`
- ❌ **runtime.runPromise()** on Runtime - НЕ СУЩЕСТВУЕТ! Use `testRuntime.runPromise()`
- ❌ **Forgetting testRuntime.dispose()** - утечка ресурсов
- ❌ **Reusing runtime between tests** - конфликт состояний
- ❌ **Using undefined with exactOptionalPropertyTypes** - используй conditional spread
- ❌ **Not using pipe() for Effect chains** - обязательно используй pipe
- ❌ **Mixing async/await with Effect** - только Effect.tryPromise

## 📚 Documentation

### Package Documentation

All packages must be documented in `/packages/README.md`:

```markdown
## @dreadnought/package-name

**Purpose**: Brief description
**Key Features**: List features
**Dependencies**: Other packages
**Used By**: Apps/packages using this
```

### Implementation Guides

Comprehensive guides for common patterns:

- **[Design System](/docs/guides/design-system.md)** - Retrofuturistic UI/UX guidelines
- **[i18n Implementation](/docs/guides/i18n.md)** - Internationalization with Effect-TS and SSR
- **[Theme Switching](/docs/guides/theme-switching.md)** - Theme management with smooth animations
- **[Effect-TS Testing](/docs/guides/effect-ts-testing.md)** - Testing patterns with ManagedRuntime

**Quick Start for New Apps**:
- For internationalization: `/docs/guides/i18n.md` - Complete SSR implementation with cookies and Effect-TS
- For theme switching: `/docs/guides/theme-switching.md` - Smooth animations with View Transitions API
- Both guides include Effect-TS compliant implementation with full SSR support

## 🎯 Priority Rules Summary

1. **Effect-TS everywhere** - No exceptions
2. **ManagedRuntime for tests** - Always dispose() in finally blocks
3. **Ask before coding** - Requirements first
4. **Check existing packages** - Reuse over rebuild
5. **Develop in /apps** - Packages only when requested
6. **Test package changes** - Maintain compatibility
7. **Use Bun** - Not Node/npm
8. **Zero border-radius** - Angular design
9. **Trunk-based git** - Direct to master
10. **Stellar with Effect** - Wrap all blockchain ops
11. **Large UI elements** - Retrofuturistic scale

## Working Notes

When working on this project:
- **CRITICAL**: Always use `ManagedRuntime.make()` for tests, never `Runtime.make()`
- **CRITICAL**: Always call `await testRuntime.dispose()` in finally blocks
- **CRITICAL**: Create fresh runtime for each test - never reuse between tests
- Always maintain the Effect-TS pattern consistency
- Check `/packages/README.md` before implementing features
- Ask for clarification on ambiguous requirements
- Prefer explicit over implicit
- Use conditional spread for optional properties with exactOptionalPropertyTypes
- Document all decisions in code comments
- Use descriptive commit messages
- Keep components simple and composable
- Test edge cases thoroughly with proper Error handling via Effect.catchTag
- Consider mobile-first responsive design
- Maintain high contrast accessibility
- Always use pipe() for Effect chains
- Wrap all Stellar SDK calls in Effect.tryPromise

## ⚠️ Critical Testing Reminders

**НИКОГДА НЕ ЗАБЫВАЙ:**
1. `const testRuntime = ManagedRuntime.make(ServiceLive)` - правильный способ
2. `try { ... } finally { await testRuntime.dispose() }` - обязательная структура
3. Новый runtime для каждого теста - никогда не переиспользовать
4. Используй `Effect.catchTag` для обработки ошибок в тестах
5. Оборачивай все Stellar API в `Effect.tryPromise`

Remember: The goal is sustainable, reusable code that grows thoughtfully from proven app implementations.
