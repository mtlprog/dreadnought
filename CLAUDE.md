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

## 🎨 Design System: Retrofuturistic

### Core Design Philosophy
1. **Large & Bold** - Oversized elements that command attention
2. **Angular & Sharp** - NO rounded corners (except loaders)
3. **High Contrast** - Stark color relationships
4. **Deliberate Roughness** - Intentional imperfections
5. **Functional Brutalism** - Every element serves a purpose
6. **Cathode Display** - Terminal-like, monospace fonts

### Color Palette
```css
--background: #000000      /* Pure black */
--foreground: #FFFFFF      /* Pure white */
--cyber-green: #00FF00     /* Classic terminal */
--electric-cyan: #00FFFF   /* Neon accent */
--warning-amber: #FFAA00   /* Alert state */
--steel-gray: #404040      /* Structural */
```

### Typography Scale
```
Hero: text-8xl md:text-9xl (128-144px)
H1: text-6xl md:text-7xl (96-112px)
H2: text-4xl md:text-5xl (48-60px)
H3: text-2xl md:text-3xl (24-30px)
Body: text-base (16px)
Code: font-mono
```

### Component Rules
- **Zero border-radius** (except loaders)
- **Large interactive elements** (min 48px touch targets)
- **High contrast only** (no low contrast combinations)
- **Monospace for data/code**
- **Uppercase for system messages**

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

### Bun Test Pattern
```typescript
import { describe, test, expect } from "bun:test"
import { Effect, Layer } from "effect"

describe("Service", () => {
  const runtime = Runtime.make(TestLayer)
  
  test("should work", async () => {
    const result = await pipe(
      effectToTest,
      runtime.runPromise
    )
    expect(result).toBe(expected)
  })
})
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

## 📚 Package Documentation

All packages must be documented in `/packages/README.md`:

```markdown
## @dreadnought/package-name

**Purpose**: Brief description
**Key Features**: List features
**Dependencies**: Other packages
**Used By**: Apps/packages using this
```

## 🎯 Priority Rules Summary

1. **Effect-TS everywhere** - No exceptions
2. **Ask before coding** - Requirements first
3. **Check existing packages** - Reuse over rebuild
4. **Develop in /apps** - Packages only when requested
5. **Test package changes** - Maintain compatibility
6. **Use Bun** - Not Node/npm
7. **Zero border-radius** - Angular design
8. **Trunk-based git** - Direct to master
9. **Stellar with Effect** - Wrap all blockchain ops
10. **Large UI elements** - Retrofuturistic scale

## Working Notes

When working on this project:
- Always maintain the Effect-TS pattern consistency
- Check `/packages/README.md` before implementing features
- Ask for clarification on ambiguous requirements
- Prefer explicit over implicit
- Document all decisions in code comments
- Use descriptive commit messages
- Keep components simple and composable
- Test edge cases thoroughly
- Consider mobile-first responsive design
- Maintain high contrast accessibility

Remember: The goal is sustainable, reusable code that grows thoughtfully from proven app implementations.
