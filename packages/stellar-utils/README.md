# @dreadnought/stellar-utils

Utility functions for working with Stellar assets and account IDs in the Dreadnought monorepo.

## Purpose

Provides helper functions for:
- Asset parsing and formatting
- Account ID validation and truncation
- Type conversions between Stellar SDK and custom types

## Installation

```bash
bun add @dreadnought/stellar-utils
```

## Usage

### Asset Utilities

```typescript
import {
  type AssetInfo,
  createAsset,
  parseAssetString,
  formatAssetDisplay,
  assetToInfo,
} from "@dreadnought/stellar-utils";

// Parse asset string
const asset = parseAssetString("EURMTL:GABC...");
// { code: "EURMTL", issuer: "GABC...", type: "credit_alphanum4" }

// Create Stellar SDK Asset
const sdkAsset = createAsset(asset);

// Format for display
formatAssetDisplay(asset); // "EURMTL"
formatAssetDisplay(asset, true); // "EURMTL (GA...XYZ)"

// Convert SDK Asset to AssetInfo
const assetInfo = assetToInfo(sdkAsset);
```

### Account Utilities

```typescript
import {
  isValidStellarAccountId,
  truncateAccountId,
  formatAccountIdForDisplay,
} from "@dreadnought/stellar-utils";

const accountId = "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V";

// Validate account ID format
isValidStellarAccountId(accountId); // true

// Truncate for display
truncateAccountId(accountId); // "GA...X2UK7V"
truncateAccountId(accountId, 4, 4); // "GACK...UK7V"

// Format with options
formatAccountIdForDisplay(accountId); // "GA...X2UK7V"
formatAccountIdForDisplay(accountId, { truncate: false }); // full ID
formatAccountIdForDisplay("invalid", { validate: true }); // "Invalid account ID"
```

## API Reference

### Asset Functions

**`createAsset(assetInfo: AssetInfo): Asset`**
- Creates Stellar SDK Asset from AssetInfo

**`parseAssetString(assetString: string): AssetInfo`**
- Parses "CODE:ISSUER" or "XLM" format
- Throws error on invalid format

**`formatAssetDisplay(assetInfo: AssetInfo, showIssuer?: boolean): string`**
- Formats asset for display
- Optionally includes truncated issuer

**`assetToInfo(asset: Asset): AssetInfo`**
- Converts Stellar SDK Asset to AssetInfo

### Account Functions

**`isValidStellarAccountId(accountId: string): boolean`**
- Validates Stellar account ID format (G followed by 55 base32 characters)

**`truncateAccountId(accountId: string, prefixLength?: number, suffixLength?: number): string`**
- Truncates account ID for display
- Default: 2 prefix + 6 suffix characters

**`formatAccountIdForDisplay(accountId: string, options?): string`**
- Formats account ID with validation and truncation options
- Options: `validate`, `truncate`, `prefixLength`, `suffixLength`

## Types

### AssetInfo

```typescript
interface AssetInfo {
  readonly code: string;
  readonly issuer: string;
  readonly type: "native" | "credit_alphanum4" | "credit_alphanum12";
}
```

## Dependencies

- `@stellar/stellar-sdk` - Stellar SDK for Asset types

## Used By

- `@dreadnought/stellar-portfolio` - Portfolio services
- `apps/crowd.mtla.me` - Crowdfunding platform
- `apps/stat.mtlf.me` - Fund statistics dashboard

## Testing

```bash
bun test
```

All 24 tests pass covering:
- Asset parsing (native, alphanum4, alphanum12)
- Asset formatting with/without issuer
- Account ID validation
- Account ID truncation with various parameters
- Format options (validate, truncate)
