# UI Components Guide

Complete documentation for React components in stat.mtlf.me, following the Dreadnought retrofuturistic design system.

## FundStructureTable

Main table component displaying fund structure with nested accounts.

**File**: `src/components/portfolio/fund-structure-table.tsx`

### Features

- **Sticky table headers** - Headers remain visible while scrolling
- **Account type indicators** - Visual badges (ISSUER/SUBFOND/OPERATIONAL)
- **Color-coded sections** - Account borders with cyber-green
- **Price tooltips** - Show orderbook bid/ask or path finding details
- **XLM + Token rows** - XLM balance row followed by token rows per account
- **Aggregated totals** - Footer with fund-wide summaries

### Props

```typescript
interface FundStructureTableProps {
  data: FundStructureData;
  className?: string;
}

interface FundStructureData {
  accounts: AccountWithPortfolio[];
  totals: {
    totalValueInEURMTL: number;
    totalValueInXLM: number;
    liquidTokensCount: number;
    illiquidTokensCount: number;
  };
}
```

### Component Structure

```tsx
export function FundStructureTable({ data }: FundStructureTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        {/* Sticky header */}
        <thead className="sticky top-0 bg-black">
          <tr>
            <th>ACCOUNT</th>
            <th>ASSET</th>
            <th>BALANCE</th>
            <th>PRICE (EURMTL)</th>
            <th>PRICE (XLM)</th>
            <th>VALUE (EURMTL)</th>
            <th>VALUE (XLM)</th>
          </tr>
        </thead>

        <tbody>
          {data.accounts.map((account) => (
            <React.Fragment key={account.id}>
              {/* Account header row */}
              <tr className="border-t-2 border-cyber-green">
                <td colSpan={7}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{account.name}</span>
                    <Badge type={account.type} />
                  </div>
                  <StellarAccount accountId={account.id} />
                </td>
              </tr>

              {/* XLM balance row */}
              <tr>
                <td></td>
                <td><StellarAsset assetCode="XLM" /></td>
                <td className="font-mono">{account.xlmBalance}</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td className="font-mono text-electric-cyan">
                  {account.xlmBalance}
                </td>
              </tr>

              {/* Token rows */}
              {account.tokens.map((token) => (
                <TokenRow key={`${token.asset.code}-${token.asset.issuer}`} token={token} />
              ))}
            </React.Fragment>
          ))}
        </tbody>

        {/* Totals footer */}
        <tfoot className="sticky bottom-0 bg-black border-t-2 border-cyber-green">
          <tr className="font-bold">
            <td colSpan={5}>TOTAL FUND VALUE</td>
            <td className="text-warning-amber">{data.totals.totalValueInEURMTL}</td>
            <td className="text-warning-amber">{data.totals.totalValueInXLM}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
```

### TokenRow Component

```tsx
function TokenRow({ token }: { token: TokenPriceWithBalance }) {
  return (
    <tr>
      <td></td>
      <td>
        <StellarAsset
          assetCode={token.asset.code}
          assetIssuer={token.asset.issuer}
        />
      </td>
      <td className="font-mono">{formatNumber(token.balance)}</td>
      <td>
        {token.priceInEURMTL ? (
          <PriceTooltip price={token.priceInEURMTL} details={token.priceDetails}>
            <span className="font-mono">{formatNumber(token.priceInEURMTL)}</span>
          </PriceTooltip>
        ) : (
          <span className="text-steel-gray">—</span>
        )}
      </td>
      <td>
        {token.priceInXLM ? (
          <span className="font-mono">{formatNumber(token.priceInXLM)}</span>
        ) : (
          <span className="text-steel-gray">—</span>
        )}
      </td>
      <td className="text-electric-cyan font-mono">
        {token.valueInEURMTL ? formatNumber(token.valueInEURMTL) : "—"}
      </td>
      <td className="text-electric-cyan font-mono">
        {token.valueInXLM ? formatNumber(token.valueInXLM) : "—"}
      </td>
    </tr>
  );
}
```

### Price Tooltips

Tooltips show price calculation details:

**Orderbook tooltip**:
```tsx
<Tooltip>
  <TooltipTrigger>{price}</TooltipTrigger>
  <TooltipContent>
    <div className="text-xs">
      <div>Source: Orderbook</div>
      <div>BID: {details.bid}</div>
      <div>ASK: {details.ask}</div>
      <div>MID: {price}</div>
    </div>
  </TooltipContent>
</Tooltip>
```

**Path finding tooltip**:
```tsx
<Tooltip>
  <TooltipTrigger>{price}</TooltipTrigger>
  <TooltipContent>
    <div className="text-xs">
      <div>Source: Path Finding</div>
      <div>Hops: {details.hops.length}</div>
      {details.hops.map((hop, i) => (
        <div key={i}>
          {i + 1}. {hop.from} → {hop.to} ({hop.rate})
        </div>
      ))}
    </div>
  </TooltipContent>
</Tooltip>
```

### Color Scheme

```typescript
const colors = {
  "cyber-green": "#00ff41",      // Account borders, headers
  "electric-cyan": "#00d9ff",    // Value columns
  "warning-amber": "#ffb700",    // Total values, indicators
  "steel-gray": "#718096",       // Labels, secondary text
  black: "#000000",              // Background
  white: "#ffffff",              // Primary text
};
```

## StellarAsset

Component for displaying Stellar asset codes with optional issuer.

**File**: `src/components/ui/stellar-asset.tsx`

### Props

```typescript
interface StellarAssetProps {
  assetCode: string;
  assetIssuer?: string;
  className?: string;
}
```

### Implementation

```tsx
export function StellarAsset({ assetCode, assetIssuer, className }: StellarAssetProps) {
  if (!assetIssuer) {
    // Native asset (XLM)
    return (
      <span className={cn("font-mono text-sm uppercase", className)}>
        {assetCode}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="font-mono text-sm uppercase">{assetCode}</span>
      <Tooltip>
        <TooltipTrigger>
          <Info className="h-3 w-3 text-steel-gray" />
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-mono">Issuer:</div>
            <div className="font-mono text-steel-gray">
              {assetIssuer.slice(0, 8)}...{assetIssuer.slice(-8)}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
```

### Usage

```tsx
// XLM (native)
<StellarAsset assetCode="XLM" />

// Custom asset with issuer
<StellarAsset
  assetCode="EURMTL"
  assetIssuer="GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V"
/>
```

## StellarAccount

Component for displaying Stellar account IDs with truncation and copy-to-clipboard.

**File**: `src/components/ui/stellar-account.tsx`

### Props

```typescript
interface StellarAccountProps {
  accountId: string;
  className?: string;
  showCopy?: boolean;
}
```

### Implementation

```tsx
export function StellarAccount({
  accountId,
  className,
  showCopy = true,
}: StellarAccountProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(accountId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-mono text-xs text-steel-gray">
        {accountId.slice(0, 8)}...{accountId.slice(-8)}
      </span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="text-steel-gray hover:text-cyber-green transition-colors"
          title="Copy account ID"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  );
}
```

### Usage

```tsx
<StellarAccount accountId="GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V" />

<StellarAccount
  accountId="GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V"
  showCopy={false}
/>
```

## PortfolioClient

Client wrapper component for fund data fetching with progress indicators.

**File**: `src/components/portfolio/portfolio-client.tsx`

### Implementation

```tsx
"use client";

import { useFundData } from "@/hooks/use-fund-data";
import { FundStructureTable } from "./fund-structure-table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorDisplay } from "@/components/ui/error-display";

export function PortfolioClient() {
  const { data, isLoading, error, progress } = useFundData();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner />
        <div className="mt-4 text-steel-gray">
          Loading fund data... {progress}%
        </div>
        <div className="w-64 h-1 bg-steel-gray/20 mt-2">
          <div
            className="h-full bg-cyber-green transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  if (!data) {
    return null;
  }

  return <FundStructureTable data={data} />;
}
```

### useFundData Hook

**File**: `src/hooks/use-fund-data.ts`

```typescript
export function useFundData() {
  const [state, setState] = useState<UseFundDataState>({
    data: null,
    isLoading: true,
    error: null,
    progress: 10,
  });

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const program = pipe(
      FundDataClient,
      Effect.flatMap((client) => client.fetchFundStructure()),
      Effect.provide(FundDataClientLive),

      // Simulate progress
      Effect.race(
        Effect.all([
          Effect.sleep("500 millis").pipe(
            Effect.flatMap(() =>
              Effect.sync(() => {
                if (isMounted.current) {
                  setState((prev) => ({
                    ...prev,
                    progress: Math.min(prev.progress + Math.random() * 20, 90),
                  }));
                }
              })
            ),
            Effect.repeat(Schedule.spaced("500 millis"))
          ),
        ])
      ),

      // Handle result
      Effect.tap((data) =>
        Effect.sync(() => {
          if (isMounted.current) {
            setState({ data, isLoading: true, error: null, progress: 95 });
            setTimeout(() => {
              if (isMounted.current) {
                setState({ data, isLoading: false, error: null, progress: 100 });
              }
            }, 300);
          }
        })
      ),

      // Handle errors
      Effect.catchAll((error) =>
        Effect.sync(() => {
          if (isMounted.current) {
            setState({
              data: null,
              isLoading: false,
              error: error.message,
              progress: 0,
            });
          }
        })
      )
    );

    Effect.runPromise(program);

    return () => {
      isMounted.current = false;
    };
  }, []);

  return state;
}
```

## LoadingSpinner

Retrofuturistic loading spinner component.

**File**: `src/components/ui/loading-spinner.tsx`

```tsx
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={cn("animate-spin", sizeClasses[size])}>
      <div className="h-full w-full border-2 border-cyber-green border-t-transparent rounded-sm" />
    </div>
  );
}
```

**Note**: Uses `rounded-sm` (2px) instead of full circle for retrofuturistic aesthetic.

## ErrorDisplay

Error display component with retry functionality.

**File**: `src/components/ui/error-display.tsx`

```tsx
interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <AlertCircle className="h-12 w-12 text-warning-amber mb-4" />
      <h3 className="text-lg font-bold uppercase mb-2">ERROR</h3>
      <p className="text-steel-gray mb-4 max-w-md">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-cyber-green text-black font-bold uppercase hover:bg-cyber-green/80 transition-colors"
        >
          RETRY
        </button>
      )}
    </div>
  );
}
```

## Footer

Application footer with links and credits.

**File**: `src/components/layout/footer.tsx`

```tsx
export function Footer() {
  return (
    <footer className="border-t border-steel-gray/20 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-cyber-green uppercase font-bold mb-4">
              Montelibero Fund
            </h3>
            <p className="text-steel-gray text-sm">
              Decentralized mutual fund on Stellar blockchain
            </p>
          </div>

          <div>
            <h3 className="text-cyber-green uppercase font-bold mb-4">Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/docs" className="text-steel-gray hover:text-cyber-green">
                  Documentation
                </a>
              </li>
              <li>
                <a href="/api" className="text-steel-gray hover:text-cyber-green">
                  API
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-cyber-green uppercase font-bold mb-4">Built With</h3>
            <ul className="space-y-2 text-sm text-steel-gray">
              <li>Next.js 15</li>
              <li>Effect-TS</li>
              <li>Stellar SDK</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-steel-gray/20 mt-8 pt-8 text-center text-steel-gray text-sm">
          <p>Powered by Dreadnought Platform</p>
        </div>
      </div>
    </footer>
  );
}
```

## Design System Components

All components follow the Dreadnought design system:

### Typography

```tsx
// Headings - UPPERCASE, bold
<h1 className="text-4xl font-bold uppercase">TITLE</h1>
<h2 className="text-2xl font-bold uppercase text-cyber-green">SECTION</h2>

// Body text
<p className="text-base">Regular text</p>
<p className="text-steel-gray">Secondary text</p>

// Monospace for data
<span className="font-mono">1,234.56</span>
<span className="font-mono text-electric-cyan">EURMTL</span>
```

### Buttons

```tsx
// Primary
<button className="px-6 py-3 bg-cyber-green text-black font-bold uppercase hover:bg-cyber-green/80 transition-colors">
  ACTION
</button>

// Secondary
<button className="px-6 py-3 border-2 border-cyber-green text-cyber-green font-bold uppercase hover:bg-cyber-green hover:text-black transition-colors">
  SECONDARY
</button>

// Danger
<button className="px-6 py-3 bg-warning-amber text-black font-bold uppercase hover:bg-warning-amber/80 transition-colors">
  WARNING
</button>
```

### Cards/Panels

```tsx
<div className="border-2 border-cyber-green bg-black p-6">
  <h3 className="text-cyber-green uppercase font-bold mb-4">PANEL TITLE</h3>
  <div className="text-steel-gray">Panel content</div>
</div>
```

## Responsive Design

All components use mobile-first responsive design:

```tsx
// Mobile: stack vertically, desktop: grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* ... */}
</div>

// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="block md:hidden">Mobile only</div>
```

## Accessibility

- ✅ Minimum 7:1 contrast ratio
- ✅ 48px touch targets
- ✅ Keyboard navigation support
- ✅ ARIA labels where needed
- ✅ Focus indicators

```tsx
// Focus styles
<button className="focus:outline-none focus:ring-2 focus:ring-cyber-green focus:ring-offset-2 focus:ring-offset-black">
  BUTTON
</button>
```

## See Also

- **[Design System](/docs/guides/design-system.md)** - Complete design system documentation
- **[Services Guide](/apps/stat.mtlf.me/docs/guides/services.md)** - Service implementations
- **[CLI Usage](/apps/stat.mtlf.me/docs/guides/cli-usage.md)** - CLI commands
- **[shadcn/ui](https://ui.shadcn.com/)** - Base component library
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility framework
