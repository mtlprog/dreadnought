# pact.mtlf.me - Stellar Contract Viewer

View and explore contracts stored on Stellar blockchain via IPFS, following the Litemint/SEP-0039 NFT metadata standard.

**Parent**: `/CLAUDE.md` - Monorepo-wide guidelines, Effect-TS patterns, design system, testing

## Overview

**Purpose**: Display contracts stored in Stellar account DATA entries with IPFS metadata

**Key Features**:
- Account selection (preset + custom input)
- Multi-contract support (`ipfshash` and `ipfshash-<ASSET_CODE>`)
- IPFS metadata fetching (SEP-0039 standard)
- Markdown contract document rendering
- Effect-TS services for all async operations
- Retrofuturistic UI from @dreadnought/ui

**Tech Stack**: Next.js 15.5.2, Effect-TS, Stellar SDK 12.3.0, IPFS (ipfs.io), Tailwind CSS 4, react-markdown

## Architecture

### Services (Effect-TS)

**HorizonService** (`src/lib/services/horizon-service.ts`):
- Fetches account DATA entries from Stellar Horizon API
- Decodes base64 values from `data_attr`
- Returns `Map<string, string>` of all data entries

**IPFSService** (`src/lib/services/ipfs-service.ts`):
- Fetches JSON metadata from IPFS gateway (ipfs.io)
- Fetches markdown documents from IPFS
- Validates metadata against SEP-0039 schema

### Components

**AccountSelector** (`src/components/account-selector.tsx`):
- Dropdown with preset accounts
- "Custom Account ID" option with text input
- Validates Stellar account ID format (56 chars, starts with G)

**AssetSelector** (`src/components/asset-selector.tsx`):
- Shows dropdown when multiple contracts exist
- Shows static display for single contract
- Displays `ASSET_CODE - name` format

**ContractDisplay** (`src/components/contract-display.tsx`):
- Displays contract name and description
- Renders markdown document (if `url` field exists in metadata)
- Uses react-markdown with rehype-raw and remark-gfm
- Same styling as crowd.mtla.me markdown rendering

## Contract Discovery Flow

1. User selects/enters Stellar account ID
2. **HorizonService** fetches all DATA entries from account
3. Find entries matching:
   - `ipfshash` (generic contract)
   - `ipfshash-<ASSET_CODE>` (asset-specific contracts)
4. For each IPFS CID found:
   - **IPFSService** fetches metadata JSON
   - If `metadata.url` exists → fetch markdown document
5. Display contracts in UI (selector if multiple, auto-select if single)
6. Render selected contract with markdown

## SEP-0039 Metadata Standard

Litemint/SEP-0039 standard for NFT metadata on Stellar:

**Data Entry Keys**:
- `ipfshash` - Generic contract CID
- `ipfshash-<ASSET_CODE>` - Asset-specific contract CID

**Metadata JSON Structure** (stored in IPFS):
```typescript
{
  name: string,           // Contract name
  description: string,    // Contract description
  url?: string            // IPFS CID of markdown document (optional)
}
```

**Example**:
```json
{
  "name": "Token Sale Agreement",
  "description": "Terms and conditions for USDC/MTL token sale",
  "url": "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

## Error Handling

**Tagged Errors** (Effect-TS):
- `HorizonError` - Stellar Horizon API failures
- `IPFSError` - IPFS gateway failures
- `ValidationError` - Schema validation failures

**Error Display**:
- Inline error messages in bordered card
- Red destructive border
- Monospace font for error details

## Configuration

### Environment Variables

```bash
STELLAR_NETWORK=mainnet  # or testnet
```

### Preset Accounts

Defined in `src/types/index.ts`:

```typescript
export const PRESET_ACCOUNTS = [
  {
    id: "GAYYQCPTA52PUTTDDNFDX5FRPHQVTL5L7EJ7AZ7GBT5G36JTIAUMPDOC",
    label: "Default Account",
  },
] as const;
```

Add more presets by extending this array.

## Development

```bash
bun install          # Install dependencies
bun dev             # Start dev server (http://localhost:3000)
bun build           # Production build
bun lint            # ESLint
```

## Testing

Follow `/docs/guides/effect-ts-testing.md` for service testing:

```typescript
test("should fetch contracts", async () => {
  const testRuntime = ManagedRuntime.make(
    Layer.mergeAll(HorizonServiceLive, IPFSServiceLive)
  );
  try {
    const result = await testRuntime.runPromise(program);
    expect(result).toBeDefined();
  } finally {
    await testRuntime.dispose();
  }
});
```

## Key Patterns

### Effect-TS Service Usage

```typescript
const program = pipe(
  HorizonServiceTag,
  Effect.flatMap((service) => service.getAccountDataEntries(accountId)),
  Effect.flatMap((dataMap) => {
    // Process data entries
    return Effect.succeed(result);
  }),
  Effect.provide(AppLayer),
);

const result = await appRuntime.runPromise(program);
```

### Concurrency

```typescript
Effect.all(
  contracts.map((contract) => fetchData(contract)),
  { concurrency: 3 }
);
```

### Optional Markdown Fetch

```typescript
if (metadata.url) {
  const urlCid = metadata.url;
  return pipe(
    IPFSServiceTag,
    Effect.flatMap((ipfsService) => ipfsService.fetchMarkdown(urlCid)),
    Effect.map((markdown) => ({ ...contract, markdown })),
    Effect.catchAll(() => Effect.succeed({ ...contract, markdown: null })),
  );
}
```

## UI/UX

**Design System**: Functional Brutalism (see `/docs/guides/design-system.md`)

**Key Elements**:
- Zero border-radius (except loaders)
- 2px borders everywhere
- Monospace font for all text
- UPPERCASE for headings
- High contrast (7:1 minimum)
- Theme switching (Light/Dark/System)

## Common Issues

1. **No contracts found** - Check account has `ipfshash` or `ipfshash-<ASSET_CODE>` data entries
2. **IPFS timeout** - ipfs.io gateway can be slow, consider using Cloudflare IPFS gateway
3. **Invalid CID** - Ensure data entry values are valid IPFS content identifiers
4. **Missing markdown** - If `url` field is missing, no document will be displayed

## Future Enhancements

- [ ] Add more IPFS gateways (Cloudflare, Pinata)
- [ ] Cache IPFS responses (localStorage)
- [ ] Contract search/filtering
- [ ] Export contract as PDF
- [ ] Historical contract versions
- [ ] Contract signing/verification
- [ ] Multi-language support (i18n)
- [ ] SEP-0007 deep linking

## Documentation

### Monorepo Guides
- **[Effect-TS Patterns](/docs/guides/effect-ts-patterns.md)** - Core Effect-TS patterns
- **[Effect-TS Testing](/docs/guides/effect-ts-testing.md)** - ManagedRuntime testing
- **[Stellar Integration](/docs/guides/stellar-integration.md)** - Stellar SDK usage
- **[Design System](/docs/guides/design-system.md)** - Retrofuturistic UI/UX

### External Resources
- **[SEP-0039](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0039.md)** - NFT metadata standard
- **[Litemint NFT Best Practices](https://medium.com/stellar-community/best-practices-for-creating-nfts-on-stellar-5c91e53e9eb9)** - Litemint implementation guide
- **[Stellar Horizon API](https://developers.stellar.org/api)** - Account data endpoints
