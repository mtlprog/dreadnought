# CLAUDE.md

Comprehensive guidance for working with the Dreadnought monorepo - an Effect-TS first blockchain dApp platform.

## 🎯 Core Philosophy

**Effect-TS first** monorepo for building blockchain dApps with maximum code reuse. Every async operation, error handling, and side effect MUST use Effect-TS.

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
│   ├── ui/                # @dreadnought/ui
│   ├── stellar-*/         # Stellar integrations
│   ├── bsn/              # @dreadnought/bsn
│   └── utils/            # @dreadnought/utils
```

### Package Standards

**Required for all packages:**
- ✅ Minimum 80% test coverage
- ✅ ManagedRuntime testing pattern
- ✅ TypeScript strict mode
- ✅ README with Effect-TS examples
- ✅ Semantic versioning
- ✅ TSDoc for all APIs
- ✅ No breaking changes without migration path

## 🎨 Design System

**Full guide**: `/docs/guides/design-system.md`

**Core Principles:**
- Functional Brutalism - every element serves a purpose
- Zero border-radius (except loaders)
- High contrast 7:1 minimum
- Monospace for technical data
- UPPERCASE for system messages
- 48px minimum touch targets

**Inspired by**: 90s anime interfaces (Evangelion, Lain, Ghost in the Shell)

## 💻 Technical Stack

```json
{
  "effect": "latest",
  "@effect/platform": "latest",
  "@effect/platform-bun": "latest",
  "@effect/schema": "latest",
  "@stellar/stellar-sdk": "^11.0.0"
}
```

**📘 Complete patterns**: `/docs/guides/effect-ts-patterns.md`

### Quick Pattern Reference

```typescript
// Service definition
export const ServiceNameLive = Layer.succeed(ServiceName, {
  method: (params) => pipe(
    Effect.succeed(null),
    Effect.tap(() => Effect.log("called"))
  )
})

// Error handling
export class CustomError extends S.TaggedError<CustomError>()(
  "CustomError",
  { field: S.String, message: S.String }
) {}

// Always use pipe
pipe(
  value,
  Effect.map(transform),
  Effect.catchTag("Error", handle)
)
```

## 🔧 Commands & Scripts

```bash
bun install          # Install dependencies
bun dev             # Start development
bun test            # Run tests
bun build           # Build for production
bun lint            # Run linter
```

### Git Workflow (Trunk-based)

```bash
git checkout master
git pull origin master
git add .
git commit -m "feat(scope): description"
git push origin master
```

**Commit types**: feat, fix, docs, style, refactor, perf, test, chore

## ⚙️ TypeScript & Stellar

**Full guides**:
- `/docs/guides/typescript-config.md` - Strict mode, branded types, exactOptionalPropertyTypes
- `/docs/guides/stellar-integration.md` - Network config, wallet integration, transaction building

### Quick TypeScript Fix

```typescript
// ❌ WRONG with exactOptionalPropertyTypes
{ ...obj, field: condition ? value : undefined }

// ✅ CORRECT
{ ...obj, ...(condition ? { field: value } : {}) }
```

## 🧪 Testing

**Full guides**:
- `/docs/guides/bun-testing.md` - Bun test framework, React Testing Library, Happy DOM
- `/docs/guides/effect-ts-testing.md` - Effect-TS ManagedRuntime patterns

### Critical Patterns (MANDATORY)

**Effect-TS Services:**
```typescript
describe("Service", () => {
  test("should work", async () => {
    const testRuntime = ManagedRuntime.make(ServiceLive);
    try {
      const result = await testRuntime.runPromise(program);
      expect(result).toBe(expected);
    } finally {
      await testRuntime.dispose(); // ОБЯЗАТЕЛЬНО!
    }
  });
});
```

**React Components:**
```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";

test("should render correctly", () => {
  render(<Component />);
  expect(screen.getByRole("button")).toBeInTheDocument();
});
```

**React Hooks:**
```typescript
import { act, renderHook } from "@testing-library/react";

test("should update value", () => {
  const { result } = renderHook(() => useHook("initial"));
  act(() => result.current[1]("updated"));
  expect(result.current[0]).toBe("updated");
});
```

**CRITICAL**:
- Always use `ManagedRuntime.make()` and `dispose()` in finally
- Use Happy DOM (not JSDom) for React component tests
- Use `getAttribute()` instead of `toHaveAttribute()` with Bun

## 🚫 Forbidden Patterns

### NEVER DO:
- ❌ async/await → use Effect
- ❌ try/catch → use Effect.tryPromise
- ❌ Promises → wrap in Effect
- ❌ throw errors → use Effect.fail
- ❌ console.log → use Effect.log
- ❌ Runtime.make() → use ManagedRuntime.make()
- ❌ Reuse runtime between tests
- ❌ Forget testRuntime.dispose()
- ❌ JSDom → use Happy DOM
- ❌ toHaveAttribute() → use getAttribute()
- ❌ Rounded corners in UI
- ❌ npm/yarn/pnpm → use Bun

## 📚 Documentation

### Implementation Guides

- **[Effect-TS Patterns](/docs/guides/effect-ts-patterns.md)** - Service definition, layers, runtime
- **[Effect-TS Testing](/docs/guides/effect-ts-testing.md)** - ManagedRuntime, mocks, patterns
- **[Bun Testing](/docs/guides/bun-testing.md)** - Bun test framework, React Testing Library, Happy DOM
- **[Stellar Integration](/docs/guides/stellar-integration.md)** - Network config, wallets, transactions
- **[TypeScript Config](/docs/guides/typescript-config.md)** - Strict mode, branded types, utilities
- **[Design System](/docs/guides/design-system.md)** - Retrofuturistic UI/UX
- **[i18n Implementation](/docs/guides/i18n.md)** - Internationalization with SSR
- **[Theme Switching](/docs/guides/theme-switching.md)** - Theme management

### Package Documentation

All packages documented in `/packages/README.md`

## 🎯 Priority Checklist

1. ✅ Effect-TS everywhere - no exceptions
2. ✅ ManagedRuntime for tests - always dispose()
3. ✅ Ask before coding - requirements first
4. ✅ Check existing packages - reuse over rebuild
5. ✅ Develop in /apps - packages only when requested
6. ✅ Test package changes - maintain compatibility
7. ✅ Use Bun - not Node/npm
8. ✅ Zero border-radius - angular design
9. ✅ Trunk-based git - direct to master
10. ✅ Stellar with Effect - wrap all blockchain ops

## ⚠️ Critical Reminders

**Testing**:
- `const testRuntime = ManagedRuntime.make(ServiceLive)` - правильный способ
- `try { ... } finally { await testRuntime.dispose() }` - обязательная структура
- Новый runtime для каждого теста - никогда не переиспользовать
- Happy DOM для React компонентов - JSDom не поддерживается в Bun
- `renderHook` из `@testing-library/react` - не из deprecated пакета
- `element.getAttribute()` вместо `toHaveAttribute()` - совместимость с Bun

**TypeScript**:
- Используй conditional spread для optional полей
- Всегда используй pipe() для Effect chains
- Оборачивай все внешние API в Effect.tryPromise

Remember: The goal is sustainable, reusable code that grows thoughtfully from proven app implementations.
