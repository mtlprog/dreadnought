# Packages

This directory contains reusable packages for the Dreadnought monorepo.

## Package Structure

Each package follows the pattern:
```
packages/
├── package-name/
│   ├── package.json
│   ├── src/
│   │   └── index.ts
│   ├── README.md
│   └── (tests)
```

## Available Packages

### @dreadnought/ui

**Purpose**: Retrofuturistic UI component library based on shadcn/ui
**Key Features**: Functional Brutalism design, React components, zero border-radius
**Dependencies**: `@dreadnought/utils`, `@radix-ui/react-*`, `class-variance-authority`, `react`
**Used By**: `crowd.mtla.me`, `stat.mtlf.me`

**Exports**:
- `Button` - Brutalist button component with variants
- `Card` - Card container with Header, Title, Description, Content, Footer
- `Dialog` - Modal dialog with Radix UI primitives
- `DropdownMenu` - Dropdown menu with multiple item types
- `Footer` - Configurable footer with sections and links
- `Input` - Styled input component
- `Label` - Form label component
- `Progress` - Progress bar component
- `Tooltip` - Tooltip with Radix UI primitives

**Example**:
```typescript
import { Button, Card, CardHeader, CardTitle, CardContent, Footer } from "@dreadnought/ui";

<Card>
  <CardHeader>
    <CardTitle>Project Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Button variant="destructive">Delete</Button>
  </CardContent>
</Card>

<Footer
  title="App"
  description="Description"
  sections={[{ title: "Links", links: [{href: "/", label: "Home"}] }]}
/>
```

See `packages/ui/README.md` for full documentation.

---

### @dreadnought/utils

**Purpose**: Common utility functions for the monorepo
**Key Features**: Tailwind class merger, number formatting, pure functions
**Dependencies**: `clsx`, `tailwind-merge`
**Used By**: `crowd.mtla.me`, `stat.mtlf.me`, `@dreadnought/ui`

**Exports**:
- `cn()` - Combines and merges Tailwind CSS class names
- `formatNumber()` - Formats numbers with thin space separators

**Example**:
```typescript
import { cn, formatNumber } from "@dreadnought/utils";

const classes = cn("px-2 py-1", isActive && "bg-primary");
const formatted = formatNumber(1234567.89, 2); // "1 234 567.89"
```

See `packages/utils/README.md` for full documentation.

---

### @dreadnought/theme

**Purpose**: Theme management with Effect-TS integration
**Key Features**: ThemeSelector component, Effect runtime helpers, View Transitions API
**Dependencies**: `effect`, `lucide-react`, `react`
**Used By**: `crowd.mtla.me`, `mtlprog.xyz`

**Exports**:
- `ThemeSelector` - Dropdown theme switcher component (Light/Dark/System)
- `getThemeEffect()` - Get current theme from server
- `setThemeEffect()` - Set theme using server action
- `runClientEffect()` - Run Effect in client components
- `ServerActionError` - Error class for server action failures

**Example**:
```typescript
import { ThemeSelector, getThemeEffect, runClientEffect } from "@dreadnought/theme";

// Use component
<ThemeSelector />

// Use services
const theme = await runClientEffect(getThemeEffect());
```

See `packages/theme/README.md` for full documentation.

---

### @dreadnought/hooks

**Purpose**: React hooks with Effect-TS integration
**Key Features**: Persistent state with localStorage, Effect-TS error handling
**Dependencies**: `effect`, `react`
**Used By**: `crowd.mtla.me`

**Exports**:
- `useLocalStorage()` - Syncs state with localStorage using Effect-TS

**Example**:
```typescript
import { useLocalStorage } from "@dreadnought/hooks";

const [theme, setTheme] = useLocalStorage<string>("theme", "dark");
setTheme("light");
```

See `packages/hooks/README.md` for full documentation.

---

### @dreadnought/stellar-core

**Purpose**: Core Stellar blockchain utilities
**Key Features**: Network configuration, error types, API wrappers
**Dependencies**: `@stellar/stellar-sdk`, `effect`, `@effect/schema`
**Used By**: `crowd.mtla.me`, `stat.mtlf.me`

**Exports**:
- `getStellarConfig()` - Get network configuration (testnet/mainnet)
- `loadAccount()` - Load account from Horizon API
- `fetchOrderbook()` - Fetch orderbook for asset pair
- `getClaimableBalances()` - Get claimable balances for account
- Error types: `StellarError`, `EnvironmentError`, `TokenPriceError`

**Example**:
```typescript
import { getStellarConfig, loadAccount } from "@dreadnought/stellar-core";
import { Effect, pipe } from "effect";

const program = pipe(
  getStellarConfig(),
  Effect.flatMap((config) => loadAccount(config.server, "GABC..."))
);
```

See `packages/stellar-core/README.md` for full documentation.

---

### @dreadnought/stellar-utils

**Purpose**: Utility functions for Stellar assets and accounts
**Key Features**: Asset parsing/formatting, account validation, type conversions
**Dependencies**: `@stellar/stellar-sdk`
**Used By**: `crowd.mtla.me`, `stat.mtlf.me`, `@dreadnought/stellar-portfolio`

**Exports**:
- `createAsset()` - Create Stellar SDK Asset from AssetInfo
- `parseAssetString()` - Parse "CODE:ISSUER" format
- `formatAssetDisplay()` - Format asset for display
- `assetToInfo()` - Convert Asset to AssetInfo
- `isValidStellarAccountId()` - Validate account ID format
- `truncateAccountId()` - Truncate for display
- `formatAccountIdForDisplay()` - Format with validation options

**Example**:
```typescript
import { parseAssetString, truncateAccountId } from "@dreadnought/stellar-utils";

const asset = parseAssetString("EURMTL:GABC...");
const shortId = truncateAccountId("GACKTN5DA...");
```

See `packages/stellar-utils/README.md` for full documentation.

---

### @dreadnought/stellar-portfolio

**Purpose**: Portfolio management service for Stellar accounts
**Key Features**: Effect-TS service, balance parsing, token filtering
**Dependencies**: `@dreadnought/stellar-core`, `@dreadnought/stellar-utils`, `effect`, `@effect/schema`
**Used By**: `stat.mtlf.me`

**Exports**:
- `PortfolioService` - Service interface
- `PortfolioServiceTag` - Context tag for DI
- `PortfolioServiceLive` - Live service implementation
- `AccountPortfolio` - Portfolio data type
- `TokenBalance` - Token balance type

**Example**:
```typescript
import { PortfolioServiceLive, PortfolioServiceTag } from "@dreadnought/stellar-portfolio";
import { Effect, pipe } from "effect";

const program = pipe(
  PortfolioServiceTag,
  Effect.flatMap((service) => service.getAccountPortfolio("GABC..."))
);

await Effect.runPromise(Effect.provide(program, PortfolioServiceLive));
```

See `packages/stellar-portfolio/README.md` for full documentation.

---

## Using React Components from Packages

When using React components with Tailwind CSS from packages like `@dreadnought/ui`, you **MUST** configure Tailwind to scan package source files.

### Tailwind CSS v4 Setup (Next.js 15+)

The `@dreadnought/ui` package exports a `styles.css` file that contains the `@source` directive for scanning UI components.

**In your app's `globals.css`:**

```css
@import "tailwindcss";
@import "@dreadnought/ui/styles.css";

@source "../src";

@variant dark (&:where(.dark, .dark *));

:root {
  /* Light theme variables... */
}

.dark {
  /* Dark theme variables... */
}
```

**Why this is needed**:
1. Tailwind CSS v4 by default only scans files in your app directory
2. `@dreadnought/ui/styles.css` tells Tailwind to scan the UI package
3. `@source "../src"` scans your app's local components (e.g., mode-toggle.tsx)
4. `@variant dark` enables `dark:` utility classes for theme switching

**Theme Switching Setup:**

If using `next-themes` for dark mode, configure it to use `class` attribute (not `data-theme`):

```typescript
// components/theme-provider.tsx
<NextThemesProvider
  attribute="class"      // IMPORTANT: use "class" not "data-theme"
  defaultTheme="system"
  enableSystem
  {...props}
>
```

**How it works**: The `packages/ui/styles.css` file contains `@source "./src"`, which tells Tailwind to scan the UI package source directory. Combined with your app's `@source "../src"` and `@variant dark`, this ensures all Tailwind classes (including `dark:` variants) work correctly across both package components and app components.

### Tailwind CSS v3 Setup

For apps using Tailwind CSS v3, configure `tailwind.config.js`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}", // Add package sources
  ],
  // ... other config
};

export default config;
```

### Troubleshooting

**Problem**: Components from `@dreadnought/ui` appear unstyled, missing layout or spacing.

**Solution**: Check that:
1. Your `globals.css` includes `@source "../../packages/ui/src"` (Tailwind v4)
2. OR your `tailwind.config` includes package paths in `content` array (Tailwind v3)
3. Dev server has been restarted after configuration changes

**Example**: Using `Footer` component:

```typescript
import { Footer } from "@dreadnought/ui";

// ❌ WRONG - Will be unstyled without proper Tailwind configuration
<Footer title="App" sections={[...]} />

// ✅ CORRECT - With @source directive in globals.css
// Classes like grid-cols-3, gap-12, text-2xl will work
<Footer title="App" sections={[...]} />
```

---

## Creating New Packages

Only create packages when:
1. Code is proven in an app
2. Reuse is needed across multiple apps
3. Explicit request from development team

Follow the naming convention: `@dreadnought/package-name`

### Package Checklist

- ✅ Use Effect-TS for all async operations
- ✅ Include comprehensive README.md
- ✅ Write tests with ManagedRuntime pattern
- ✅ Use peerDependencies for effect and @effect/schema
- ✅ Export all types and interfaces
- ✅ Follow strict TypeScript configuration
- ✅ Document Tailwind CSS setup for React components (if applicable)