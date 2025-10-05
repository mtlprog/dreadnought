# @dreadnought/theme

Theme management package with Effect-TS integration for the Dreadnought monorepo.

## Features

- 🎨 **ThemeSelector Component** - Dropdown theme switcher (Light/Dark/System)
- ⚡ **Effect-TS Runtime** - Client-side Effect execution helpers
- 🔄 **View Transitions API** - Smooth theme transitions
- 🎭 **Server Actions Integration** - Effect wrappers for Next.js server actions

## Installation

```bash
bun add @dreadnought/theme
```

## Usage

### ThemeSelector Component

```tsx
"use client";

import { ThemeSelector } from "@dreadnought/theme";

export function Header() {
  return (
    <header>
      <ThemeSelector />
    </header>
  );
}
```

### Theme Service

```typescript
import { getThemeEffect, setThemeEffect, runClientEffect } from "@dreadnought/theme";
import { pipe } from "effect";

// Get current theme
const program = pipe(
  getThemeEffect(),
  Effect.tap((theme) => Effect.log(`Current theme: ${theme}`))
);
const theme = await runClientEffect(program);

// Set theme
const setProgram = setThemeEffect("dark");
await runClientEffect(setProgram);
```

### Runtime Helpers

```typescript
import { runClientEffect } from "@dreadnought/theme";
import { Effect } from "effect";

// Run any Effect in client components
const program = Effect.succeed(42);
const result = await runClientEffect(program);
```

## Requirements

Your app must have server actions that export `getTheme()` and `setTheme()`:

```typescript
// app/actions.ts
"use server";

import { cookies } from "next/headers";

export type Theme = "light" | "dark" | "system";

export async function getTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  return (cookieStore.get("theme")?.value as Theme) ?? "dark";
}

export async function setTheme(theme: Theme) {
  const cookieStore = await cookies();
  cookieStore.set("theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}
```

## API Reference

### Components

#### `ThemeSelector`

Dropdown theme switcher component.

**Props**: None

**Features**:
- Light/Dark/System themes
- Icon-based UI (Sun/Moon/Monitor)
- View Transitions API support
- Keyboard accessible

---

### Services

#### `getThemeEffect(): Effect<Theme, ServerActionError>`

Gets the current theme from server.

**Returns**: Effect that resolves to `"light" | "dark" | "system"`

---

#### `setThemeEffect(theme: Theme): Effect<void, ServerActionError>`

Sets the theme using server action.

**Parameters**:
- `theme` - The theme to set

**Returns**: Effect that sets the theme

---

### Runtime

#### `runClientEffect<A, E>(effect: Effect<A, E>): Promise<A>`

Runs an Effect in client components.

**Parameters**:
- `effect` - The Effect to run

**Returns**: Promise that resolves with the Effect result

---

#### `clientRuntime`

Default Effect runtime for client-side execution.

---

### Types

#### `Theme`

```typescript
type Theme = "system" | "light" | "dark";
```

#### `ServerActionError`

Effect-TS error class for server action failures.

```typescript
class ServerActionError {
  readonly _tag = "ServerActionError";
  message: string;
  cause?: unknown;
}
```

## Styling

The ThemeSelector uses Tailwind CSS with design system tokens. Ensure your app has:

```css
/* globals.css */
@layer base {
  :root {
    --background: ...;
    --foreground: ...;
    --primary: ...;
    --border: ...;
  }

  .dark {
    --background: ...;
    --foreground: ...;
  }
}
```

## Design Philosophy

Follows **Functional Brutalism** design:
- Zero border-radius (angular design)
- High contrast UI
- UPPERCASE labels
- Monospace friendly
- 48px touch targets

## Used By

- `crowd.mtla.me` - Crowdfunding platform
- `mtlprog.xyz` - Landing page

## Contributing

Follow monorepo guidelines in `/CLAUDE.md`:
- ✅ Effect-TS first (no async/await)
- ✅ Client components only ("use client")
- ✅ TypeScript strict mode
- ✅ TSDoc for all exports
