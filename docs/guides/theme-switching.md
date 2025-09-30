# Theme Switching with Effect-TS and SSR

Complete guide for adding smooth theme switching to Next.js 15 applications using Effect-TS with full SSR support and animations.

## Overview

This implementation provides:
- **Effect-TS compliant** - All async operations wrapped in Effect
- **SSR-first** - No flash on page load, theme applied server-side
- **Smooth animations** - CSS transitions + View Transitions API
- **Current selection display** - Visual feedback in UI
- **Cookie persistence** - Theme preference saved across sessions
- **System theme support** - Auto-detect OS preference

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Component                         │
│                    ThemeSelector.tsx                         │
│  - Uses Effect-TS via runClientEffect()                     │
│  - Imports from settings-client.ts                          │
│  - View Transitions API for smooth animation                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Client Effect Wrappers                          │
│            settings-client.ts                                │
│  - setThemeEffect(), getThemeEffect()                       │
│  - Wraps Server Actions in Effect.tryPromise                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Server Actions                                  │
│                 actions.ts                                   │
│  - setTheme(), getTheme()                                   │
│  - Thin wrappers: Effect.runPromise(effectFunction)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Server Effect Logic                             │
│               settings.ts                                    │
│  - setThemeEffect(), getThemeEffect()                       │
│  - Uses next/headers cookies()                              │
│  - Uses revalidatePath() for cache invalidation             │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step Implementation

### Step 1: Define Types and Errors

**`/src/services/settings.ts`** (server-side):
```typescript
import { Effect, pipe } from "effect";
import * as S from "@effect/schema/Schema";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type Theme = "system" | "light" | "dark";

export class ServerActionError extends S.TaggedError<ServerActionError>()(
  "ServerActionError",
  {
    message: S.String,
    cause: S.optional(S.Unknown),
  }
) {}
```

### Step 2: Implement Server Effect Functions

**`/src/services/settings.ts`** (continued):
```typescript
export const setThemeEffect = (theme: Theme) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const cookieStore = await cookies();
        cookieStore.set("theme", theme, {
          path: "/",
          maxAge: 365 * 24 * 60 * 60, // 1 year
          sameSite: "lax",
        });
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to set theme cookie",
          cause: error,
        }),
    }),
    Effect.flatMap(() =>
      Effect.tryPromise({
        try: async () => {
          revalidatePath("/");
        },
        catch: (error) =>
          new ServerActionError({
            message: "Failed to revalidate path",
            cause: error,
          }),
      })
    ),
    Effect.tap(() => Effect.log(`Theme set to: ${theme}`))
  );

export const getThemeEffect = () =>
  pipe(
    Effect.tryPromise({
      try: async (): Promise<Theme> => {
        const cookieStore = await cookies();
        const theme = cookieStore.get("theme")?.value;
        return theme === "system" || theme === "light" || theme === "dark"
          ? theme
          : "system";
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to get theme from cookies",
          cause: error,
        }),
    }),
    Effect.tap((theme) => Effect.log(`Theme retrieved: ${theme}`))
  );
```

### Step 3: Create Server Actions

**`/src/app/actions.ts`**:
```typescript
"use server";

import { Effect } from "effect";
import {
  setThemeEffect,
  getThemeEffect,
  type Theme,
} from "@/services/settings";

export type { Theme };

export async function setTheme(theme: Theme) {
  return Effect.runPromise(setThemeEffect(theme));
}

export async function getTheme(): Promise<Theme> {
  return Effect.runPromise(getThemeEffect());
}
```

### Step 4: Create Client Effect Wrappers

**`/src/services/settings-client.ts`**:
```typescript
import { Effect, pipe } from "effect";
import * as S from "@effect/schema/Schema";

export type Theme = "system" | "light" | "dark";

export class ServerActionError extends S.TaggedError<ServerActionError>()(
  "ServerActionError",
  {
    message: S.String,
    cause: S.optional(S.Unknown),
  }
) {}

export const setThemeEffect = (theme: Theme) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const { setTheme } = await import("@/app/actions");
        await setTheme(theme);
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to set theme",
          cause: error,
        }),
    }),
    Effect.tap(() => Effect.log(`Theme set to: ${theme}`))
  );

export const getThemeEffect = () =>
  pipe(
    Effect.tryPromise({
      try: async (): Promise<Theme> => {
        const { getTheme } = await import("@/app/actions");
        return getTheme();
      },
      catch: (error) =>
        new ServerActionError({
          message: "Failed to get theme",
          cause: error,
        }),
    }),
    Effect.tap((theme) => Effect.log(`Theme retrieved: ${theme}`))
  );
```

### Step 5: Create Client Runtime Helper

**`/src/lib/runtime.ts`**:
```typescript
import { Runtime, type Effect } from "effect";

/**
 * Default runtime for client-side Effect execution
 */
export const clientRuntime = Runtime.defaultRuntime;

/**
 * Helper to run Effect in client components
 */
export function runClientEffect<A, E>(
  effect: Effect.Effect<A, E>
): Promise<A> {
  return Runtime.runPromise(clientRuntime)(effect);
}
```

### Step 6: Add View Transitions Type Definitions

**`/src/global.d.ts`**:
```typescript
// View Transitions API types
interface ViewTransition {
  readonly finished: Promise<void>;
  readonly ready: Promise<void>;
  readonly updateCallbackDone: Promise<void>;
  skipTransition(): void;
}

interface Document {
  startViewTransition?: (updateCallback: () => void | Promise<void>) => ViewTransition;
}
```

### Step 7: Add CSS Transitions

**`/src/app/globals.css`**:
```css
@layer base {
  html {
    scroll-behavior: smooth;
  }

  /* Smooth theme transitions for all color-related properties */
  html,
  html * {
    transition: background-color 0.3s ease,
                color 0.3s ease,
                border-color 0.3s ease,
                box-shadow 0.3s ease,
                opacity 0.3s ease;
  }

  /* Disable transitions for reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    html,
    html * {
      transition: none !important;
    }
  }
}
```

### Step 8: Configure Tailwind Dark Mode

**`/tailwind.config.ts`**:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // Enable class-based dark mode
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Your theme colors here
      },
    },
  },
};

export default config;
```

### Step 9: Add Theme CSS Variables

**`/src/app/globals.css`** (add theme variables):
```css
:root {
  /* Light theme (default) */
  --background: #ffffff;
  --foreground: #0a0e1a;
  --primary: #0066cc;
  --primary-foreground: #ffffff;
  /* ... other light theme colors */
}

.dark {
  /* Dark theme */
  --background: #0a0e1a;
  --foreground: #e8f4f8;
  --primary: #00d9ff;
  --primary-foreground: #0a0e1a;
  /* ... other dark theme colors */
}
```

### Step 10: Update Layout for SSR Theme

**`/src/app/layout.tsx`**:
```typescript
import { cookies } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode; }>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value || "dark";

  // Resolve system theme to actual theme for SSR
  // In production, you might want to detect system preference
  const resolvedTheme = theme === "system" ? "dark" : theme;

  return (
    <html lang="en" className={resolvedTheme}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
```

### Step 11: Create Theme Selector Component

**`/src/components/ThemeSelector.tsx`**:
```typescript
"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Effect, pipe } from "effect";
import {
  getThemeEffect,
  setThemeEffect,
  type Theme,
} from "@/services/settings-client";
import { runClientEffect } from "@/lib/runtime";

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "LIGHT", icon: Sun },
  { value: "dark", label: "DARK", icon: Moon },
  { value: "system", label: "AUTO", icon: Monitor },
];

export function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>("dark");

  useEffect(() => {
    const program = pipe(
      getThemeEffect(),
      Effect.tap((theme) => Effect.sync(() => setCurrentTheme(theme)))
    );

    void runClientEffect(program);
  }, []);

  const handleSelect = (theme: Theme) => {
    setIsOpen(false);
    setCurrentTheme(theme);

    const program = pipe(
      setThemeEffect(theme),
      Effect.tap(() => Effect.log(`Theme changed to: ${theme}`))
    );

    // Use View Transitions API if available for smooth animation
    if (document.startViewTransition) {
      document.startViewTransition(async () => {
        await runClientEffect(program);
      });
    } else {
      void runClientEffect(program);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 border-2 border-border bg-background/90 backdrop-blur-sm text-foreground hover:border-primary hover:bg-primary/10 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Select theme"
      >
        <Sun className="w-5 h-5 mx-auto dark:hidden transition-all duration-300" />
        <Moon className="w-5 h-5 mx-auto hidden dark:block transition-all duration-300" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-32 border-2 border-border bg-background shadow-lg z-50">
            {THEMES.map((theme) => {
              const Icon = theme.icon;
              return (
                <button
                  key={theme.value}
                  onClick={() => handleSelect(theme.value)}
                  className={`w-full h-10 px-4 text-xs font-bold uppercase tracking-wider transition-all duration-200 border-b border-border last:border-b-0 flex items-center gap-2 ${
                    currentTheme === theme.value
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-primary hover:text-primary-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {theme.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
```

### Step 12: Add Middleware (Optional)

**`/src/middleware.ts`**:
```typescript
import { NextResponse, type NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Get theme from cookie, default to "dark"
  const theme = request.cookies.get("theme")?.value || "dark";

  // Set theme header for client
  response.headers.set("x-theme", theme === "system" ? "dark" : theme);

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

## Effect-TS Patterns

### 1. Server-Side Effects with next/headers

```typescript
export const setThemeEffect = (theme: Theme) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const cookieStore = await cookies(); // Next.js 15 async cookies
        cookieStore.set("theme", theme, { /* ... */ });
      },
      catch: (error) => new ServerActionError({ /* ... */ })
    }),
    Effect.flatMap(() => /* revalidate */),
    Effect.tap(() => Effect.log(/* ... */))
  );
```

### 2. Client-Side Effect Wrappers

```typescript
export const setThemeEffect = (theme: Theme) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const { setTheme } = await import("@/app/actions"); // Dynamic import
        await setTheme(theme);
      },
      catch: (error) => new ServerActionError({ /* ... */ })
    }),
    Effect.tap(() => Effect.log(/* ... */))
  );
```

### 3. View Transitions Integration

```typescript
if (document.startViewTransition) {
  document.startViewTransition(async () => {
    await runClientEffect(program); // Run Effect inside transition
  });
}
```

## Customization

### Adding More Themes

1. Update type:
```typescript
export type Theme = "system" | "light" | "dark" | "cyberpunk" | "retro";
```

2. Add CSS variables:
```css
.cyberpunk {
  --background: #0f0f23;
  --foreground: #00ff41;
  --primary: #ff00ff;
  /* ... */
}
```

3. Update component:
```typescript
const THEMES = [
  { value: "light", label: "LIGHT", icon: Sun },
  { value: "dark", label: "DARK", icon: Moon },
  { value: "cyberpunk", label: "CYBER", icon: Zap },
  { value: "system", label: "AUTO", icon: Monitor },
];
```

### Customizing Transitions

**Slower transitions**:
```css
html * {
  transition: background-color 0.5s ease,
              color 0.5s ease;
}
```

**Per-element control**:
```css
/* Fast hover transitions */
button:hover,
a:hover {
  transition-duration: 0.15s;
}

/* Slow background transitions */
body {
  transition: background-color 0.6s ease;
}
```

### System Theme Detection

For true system theme support (not just defaulting to dark):

```typescript
export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value || "system";

  // You could read Accept-CH header or use client-side detection
  // For SSR, default to dark for system theme
  const resolvedTheme = theme === "system" ? "dark" : theme;

  return (
    <html lang="en" className={resolvedTheme}>
      <body>
        {/* Add client-side script to detect actual system preference */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if (document.documentElement.classList.contains('dark')) {
              const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (!isDark) {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
              }
            }
          `
        }} />
        {children}
      </body>
    </html>
  );
}
```

## Testing

- [ ] Theme switches smoothly (light ↔ dark ↔ system)
- [ ] Current selection highlighted in dropdown
- [ ] SSR works (disable JS, theme persists)
- [ ] Cookie set correctly (check DevTools → Application → Cookies)
- [ ] View Transitions work in Chrome/Edge
- [ ] Fallback works in Safari/Firefox
- [ ] Reduced motion preference respected
- [ ] Effect.log outputs visible in console
- [ ] Build passes: `bun run build`
- [ ] Lint passes: `bun run lint`

## Troubleshooting

### Theme Flash on Page Load

**Cause**: Theme not applied server-side.

**Fix**: Ensure layout is `async` and reads cookies:
```typescript
const cookieStore = await cookies();
const theme = cookieStore.get("theme")?.value || "dark";
return <html className={theme}>...</html>;
```

### "Cannot find module 'next/headers'" in Client

**Cause**: Client component importing server-only module.

**Fix**: Ensure client components only import from `settings-client.ts`.

### View Transitions Not Working

**Cause**: Browser doesn't support View Transitions API.

**Fix**: Already handled with fallback:
```typescript
if (document.startViewTransition) {
  // Use View Transitions
} else {
  // Direct update
}
```

### Transitions Too Slow/Fast

**Cause**: CSS transition duration.

**Fix**: Adjust duration in globals.css:
```css
transition: background-color 0.2s ease; /* faster */
```

## Reference Implementation

Working implementation: `@apps/mtlprog.xyz`

Key files:
- `/src/services/settings.ts` - Server Effect logic
- `/src/services/settings-client.ts` - Client Effect wrappers
- `/src/app/actions.ts` - Server Actions
- `/src/lib/runtime.ts` - Client runtime
- `/src/components/ThemeSelector.tsx` - Theme dropdown
- `/src/app/globals.css` - CSS transitions and theme variables
- `/src/app/layout.tsx` - SSR theme application

## Further Reading

- [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [Next.js 15 Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Effect-TS Documentation](https://effect.website/docs/introduction)
