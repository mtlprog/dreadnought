# Bun Testing Best Practices

Complete guide to testing in Dreadnought monorepo using Bun test framework, Testing Library, and Effect-TS patterns.

## 🎯 Testing Philosophy

- **Fast execution** - Bun test runner is 10x faster than Jest
- **Effect-TS first** - All services use ManagedRuntime pattern
- **Happy DOM** - Browser environment for React components (JSdom not supported in Bun)
- **Testing Library** - Behavior-driven testing for UI
- **High coverage** - Minimum 80% for all packages

## 📦 Test Infrastructure Setup

### Dependencies

```bash
bun add -D @happy-dom/global-registrator
bun add -D @testing-library/react @testing-library/dom @testing-library/jest-dom
```

### Configuration Files

**bunfig.toml** - Test preload configuration:
```toml
[test]
preload = ["./happydom.ts", "./testing-library.ts"]
```

**happydom.ts** - Browser environment:
```typescript
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();
```

**testing-library.ts** - Testing Library setup:
```typescript
import { afterEach, expect } from "bun:test";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

**matchers.d.ts** - TypeScript declarations:
```typescript
import type { AsymmetricMatchers, Matchers } from "bun:test";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "bun:test" {
  interface Matchers<T>
    extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}
  interface AsymmetricMatchers extends TestingLibraryMatchers {}
}
```

## 🧪 Testing Patterns

### 1. React Component Testing

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { Button } from "./button";

describe("Button", () => {
  test("should render button with children", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  test("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  test("should apply custom className", () => {
    render(<Button className="custom-class">Custom</Button>);

    const button = screen.getByRole("button");
    expect(button.className).toContain("custom-class");
  });
});
```

### 2. React Hooks Testing

**IMPORTANT**: Use `renderHook` from `@testing-library/react` (not the deprecated `@testing-library/react-hooks`)

```typescript
import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { useLocalStorage } from "./use-local-storage";

describe("useLocalStorage", () => {
  test("should return initial value", () => {
    const { result } = renderHook(() => useLocalStorage("key", "initial"));

    expect(result.current[0]).toBe("initial");
  });

  test("should update value", () => {
    const { result } = renderHook(() => useLocalStorage("key", "initial"));

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
  });

  test("should persist to localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("key", { name: "John" }));

    act(() => {
      result.current[1]({ name: "Jane" });
    });

    const stored = JSON.parse(localStorage.getItem("key") ?? "{}");
    expect(stored).toEqual({ name: "Jane" });
  });
});
```

### 3. Effect-TS Service Testing

**CRITICAL**: Always use `ManagedRuntime.make()` with try/finally and `dispose()`

```typescript
import { describe, expect, test } from "bun:test";
import { Effect, ManagedRuntime, pipe } from "effect";
import { ServiceName, ServiceNameLive } from "./service";

describe("ServiceName", () => {
  test("should process data correctly", async () => {
    const testRuntime = ManagedRuntime.make(ServiceNameLive);

    try {
      const program = pipe(
        ServiceName,
        Effect.flatMap((service) => service.method("input"))
      );

      const result = await testRuntime.runPromise(program);
      expect(result).toBe("expected");
    } finally {
      await testRuntime.dispose(); // MANDATORY!
    }
  });
});
```

### 4. Effect Runtime Helpers Testing

```typescript
import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { clientRuntime, runClientEffect } from "./runtime";

describe("runtime", () => {
  test("should run successful Effect", async () => {
    const program = Effect.succeed(42);
    const result = await runClientEffect(program);

    expect(result).toBe(42);
  });

  test("should handle Effect transformations", async () => {
    const program = Effect.succeed(10).pipe(
      Effect.map((n) => n * 2)
    );
    const result = await runClientEffect(program);

    expect(result).toBe(20);
  });

  test("should reject when Effect fails", async () => {
    const program = Effect.fail(new Error("test error"));

    await expect(runClientEffect(program)).rejects.toThrow("test error");
  });
});
```

### 5. Error Class Testing

```typescript
import { describe, expect, test } from "bun:test";
import { ServerActionError, type Theme } from "./theme-service";

describe("ServerActionError", () => {
  test("should create error with message", () => {
    const error = new ServerActionError({
      message: "Test error",
    });

    expect(error.message).toBe("Test error");
    expect(error._tag).toBe("ServerActionError");
  });

  test("should create error with cause", () => {
    const cause = new Error("Original");
    const error = new ServerActionError({
      message: "Wrapped",
      cause,
    });

    expect(error.cause).toBe(cause);
    expect(error).toBeInstanceOf(Error);
  });
});
```

## ⚠️ Common Pitfalls with Bun

### 1. Avoid toHaveAttribute with Bun

**❌ WRONG** - Causes "Expected this to be instanceof ExpectMatcherUtils" error:
```typescript
expect(element).toHaveAttribute("href", "/test");
```

**✅ CORRECT** - Use native getAttribute:
```typescript
expect(element.getAttribute("href")).toBe("/test");
```

### 2. Avoid toHaveClass for complex checks

**❌ WRONG** - May fail with Bun's matcher implementation:
```typescript
expect(button).toHaveClass("border-2");
expect(button).toHaveClass("bg-primary");
```

**✅ CORRECT** - Use className.toContain or check specific classes:
```typescript
expect(button.className).toContain("border-2");
expect(button.className).toContain("bg-primary");
```

### 3. Mock Server Actions Properly

```typescript
import { describe, mock, test } from "bun:test";

// Mock the module before importing component
mock.module("@/app/actions", () => ({
  setTheme: mock(async () => {}),
  getTheme: mock(async () => "dark" as const),
}));

import { ThemeSelector } from "./theme-selector";
```

## 📊 Running Tests

### Run all tests
```bash
bun test
```

### Run specific package
```bash
bun test packages/ui/
```

### Run single test file
```bash
bun test packages/ui/src/button.test.tsx
```

### Watch mode
```bash
bun test --watch
```

## 🎯 Best Practices

### DO:

1. **Test behavior, not implementation**
   - Focus on what users see and do
   - Use semantic queries (getByRole, getByLabelText)

2. **Use descriptive test names**
   ```typescript
   test("should render button with children", () => {})
   test("should disable button when disabled prop is true", () => {})
   ```

3. **Clean up after each test**
   - Testing Library's `cleanup()` runs automatically via preload
   - Always `dispose()` ManagedRuntime in finally block

4. **Use act() for state updates**
   ```typescript
   act(() => {
     result.current[1]("new value");
   });
   ```

5. **Mock external dependencies**
   - Mock server actions
   - Mock fetch calls
   - Mock browser APIs not in Happy DOM

### DON'T:

1. **Don't test implementation details**
   - Avoid testing state variables
   - Don't check class names unless testing design system

2. **Don't reuse test runtime**
   ```typescript
   // ❌ WRONG
   const testRuntime = ManagedRuntime.make(ServiceLive);
   test("test 1", async () => { await testRuntime.runPromise(...) });
   test("test 2", async () => { await testRuntime.runPromise(...) });

   // ✅ CORRECT
   test("test 1", async () => {
     const testRuntime = ManagedRuntime.make(ServiceLive);
     try { await testRuntime.runPromise(...) }
     finally { await testRuntime.dispose() }
   });
   ```

3. **Don't use JSDom** - Not supported in Bun, use Happy DOM

4. **Don't forget beforeEach/afterEach cleanup**
   ```typescript
   beforeEach(() => {
     localStorage.clear();
   });

   afterEach(() => {
     localStorage.clear();
   });
   ```

## 📈 Coverage Requirements

All packages MUST maintain **minimum 80% coverage**:

```bash
# Check coverage (to be implemented)
bun test --coverage
```

Current package coverage:
- ✅ stellar-utils: 66%
- ✅ utils: 66%
- ✅ ui: 60%
- ✅ stellar-portfolio: 50%
- ✅ theme: 50%
- ✅ hooks: 50%
- ⚠️ stellar-core: 33% (needs improvement)

## 🔗 Related Documentation

- [Effect-TS Testing](/docs/guides/effect-ts-testing.md) - ManagedRuntime patterns
- [Effect-TS Patterns](/docs/guides/effect-ts-patterns.md) - Service patterns
- [TypeScript Config](/docs/guides/typescript-config.md) - Strict mode setup

## 📚 External Resources

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Testing Library with Bun](https://bun.sh/guides/test/testing-library)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing React Hooks Best Practices](https://kentcdodds.com/blog/how-to-test-custom-react-hooks)
