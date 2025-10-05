# @dreadnought/utils

Common utility functions for the Dreadnought monorepo.

## Installation

```bash
bun add @dreadnought/utils
```

## Usage

### cn() - Tailwind Class Name Merger

Combines multiple class names using `clsx` and `tailwind-merge`. Handles conditional classes and merges Tailwind classes intelligently.

```typescript
import { cn } from "@dreadnought/utils";

// Basic usage
cn("px-2 py-1", "bg-primary")
// => "px-2 py-1 bg-primary"

// Conditional classes
cn("px-2 py-1", isActive && "bg-primary")
// => "px-2 py-1 bg-primary" (if isActive is true)

// Object syntax
cn("px-2", { "bg-primary": isActive, "text-white": isActive })
// => "px-2 bg-primary text-white" (if isActive is true)

// Tailwind merge (overwrites conflicting classes)
cn("px-2 px-4", "py-1 py-2")
// => "px-4 py-2"
```

### formatNumber() - Number Formatting

Formats numbers with thin space separators for thousands. Uses non-breaking thin space (U+202F) for proper monospace font rendering.

```typescript
import { formatNumber } from "@dreadnought/utils";

// Basic usage
formatNumber(1234567.89)
// => "1 234 567.89"

// Custom decimals
formatNumber(1234.5678, 7)
// => "1 234.5678000"

// Zero decimals
formatNumber(1234567, 0)
// => "1 234 567"

// Small numbers
formatNumber(123.45, 2)
// => "123.45"
```

## API Reference

### `cn(...inputs: ClassValue[]): string`

**Parameters**:
- `inputs` - Variable number of class name arguments (strings, objects, arrays, conditionals)

**Returns**: Merged class name string

**Dependencies**: `clsx`, `tailwind-merge`

---

### `formatNumber(value: number, decimals?: number): string`

**Parameters**:
- `value` - The number to format
- `decimals` - Number of decimal places (default: 2)

**Returns**: Formatted string with thin space separators

**Dependencies**: None (pure function)

## Design Philosophy

All utilities in this package are:
- ✅ **Pure functions** - No side effects
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Well-tested** - Comprehensive test coverage
- ✅ **Well-documented** - TSDoc comments
- ✅ **Reusable** - Used across multiple apps

## Used By

- `crowd.mtla.me` - Crowdfunding platform
- `stat.mtlf.me` - Fund statistics dashboard
- `mtlprog.xyz` - Landing page
- `@dreadnought/ui` - UI component library

## Contributing

When adding new utilities:
1. Ensure they are **generic and reusable**
2. Add comprehensive **TSDoc comments**
3. Write **unit tests**
4. Update this README
5. Follow **Dreadnought monorepo guidelines** (`/CLAUDE.md`)
