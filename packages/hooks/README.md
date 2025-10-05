# @dreadnought/hooks

React hooks with Effect-TS integration for the Dreadnought monorepo.

## Features

- 🎣 **useLocalStorage** - Persistent state with localStorage and Effect-TS
- ⚡ **Effect-TS Integration** - All hooks use Effect for side effects
- 🔒 **Type-safe** - Full TypeScript support with generics
- 🌐 **SSR-safe** - Handles server/client rendering

## Installation

```bash
bun add @dreadnought/hooks
```

## Hooks

### useLocalStorage

Syncs state with localStorage using Effect-TS for error handling.

**Signature**:
```typescript
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void]
```

**Parameters**:
- `key` - The localStorage key
- `initialValue` - Initial value if key doesn't exist

**Returns**: Tuple of `[storedValue, setValue]` similar to `useState`

**Example**:
```typescript
"use client";

import { useLocalStorage } from "@dreadnought/hooks";

export function Settings() {
  const [theme, setTheme] = useLocalStorage<string>("theme", "dark");
  const [count, setCount] = useLocalStorage<number>("count", 0);

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme("light")}>Switch to Light</button>

      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

**Features**:
- ✅ Automatic JSON serialization/deserialization
- ✅ Effect-TS error handling with logging
- ✅ SSR-safe (checks `typeof window`)
- ✅ Syncs across component instances
- ✅ Type-safe with generics

**Error Handling**:
```typescript
// Errors are logged via Effect.logError
// Invalid JSON is handled gracefully
const [data, setData] = useLocalStorage<{ name: string }>(
  "user",
  { name: "Guest" }
);
```

## Design Philosophy

All hooks follow these principles:
- ✅ **Effect-TS first** - No try/catch, use Effect
- ✅ **Client-only** - Mark components with "use client"
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Pure functions** - No side effects in hook logic
- ✅ **SSR-safe** - Handle server rendering

## Future Hooks

Planned additions:
- `useDebounce` - Debounced values with Effect
- `useAsync` - Async operations with Effect
- `useMediaQuery` - Responsive breakpoints
- `useInterval` - Intervals with Effect
- `usePrevious` - Previous value tracking

## Used By

- `crowd.mtla.me` - Crowdfunding platform (useLocalStorage)

## Contributing

Follow monorepo guidelines in `/CLAUDE.md`:
- ✅ Effect-TS for all async operations
- ✅ Client components only ("use client")
- ✅ TypeScript strict mode
- ✅ TSDoc for all hooks
- ✅ Generic types for reusability
