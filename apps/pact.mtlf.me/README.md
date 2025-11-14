# pact.mtlf.me - Stellar Contract Viewer

View and explore contracts stored on Stellar blockchain via IPFS, following the Litemint/SEP-0039 standard.

## Features

- **Account Selection**: Choose from preset accounts or enter custom Stellar account ID
- **Multi-Contract Support**: Displays all contracts from `ipfshash` and `ipfshash-<ASSET_CODE>` data entries
- **IPFS Integration**: Fetches contract metadata and markdown documents from IPFS
- **Markdown Rendering**: Renders contract documents with full markdown support
- **Effect-TS First**: All async operations use Effect-TS patterns
- **Retrofuturistic Design**: Functional brutalism UI from @dreadnought/ui

## How It Works

1. **Account DATA Entries**: Fetches Stellar account data via Horizon API
2. **IPFS CID Discovery**: Looks for `ipfshash` and `ipfshash-<ASSET_CODE>` keys
3. **Metadata Fetch**: Retrieves JSON metadata from IPFS (name, description, url)
4. **Markdown Fetch**: If `url` field exists, fetches and renders markdown document
5. **Display**: Shows contract details with markdown formatting

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun dev

# Build for production
bun build

# Lint
bun lint
```

## Environment Variables

```bash
STELLAR_NETWORK=mainnet  # or testnet
```

## Tech Stack

- **Framework**: Next.js 15.5.2
- **Effect-TS**: All services and error handling
- **Stellar SDK**: Account data fetching via Horizon
- **IPFS**: ipfs.io gateway for metadata and documents
- **UI**: @dreadnought/ui (retrofuturistic design system)
- **Markdown**: react-markdown with rehype-raw and remark-gfm

## Contract Metadata Standard (SEP-0039/Litemint)

Contracts must have IPFS metadata in this format:

```json
{
  "name": "Contract Name",
  "description": "Contract description",
  "url": "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

The `url` field should contain an IPFS CID pointing to a markdown document.

## Architecture

### Services

- **HorizonService** (`src/lib/services/horizon-service.ts`): Fetches account DATA entries from Stellar
- **IPFSService** (`src/lib/services/ipfs-service.ts`): Fetches metadata and markdown from IPFS

### Components

- **AccountSelector**: Preset accounts + custom input
- **AssetSelector**: Multi-contract dropdown (if multiple assets)
- **ContractDisplay**: Metadata + markdown rendering

### Error Handling

All errors use Effect-TS tagged errors:
- `HorizonError`: Stellar API failures
- `IPFSError`: IPFS fetch failures
- `ValidationError`: Schema validation failures

## Preset Accounts

Default account: `GAYYQCPTA52PUTTDDNFDX5FRPHQVTL5L7EJ7AZ7GBT5G36JTIAUMPDOC`

Add more presets in `src/types/index.ts`.

## Future Enhancements

- [ ] Contract search/filtering
- [ ] Historical contract versions
- [ ] Contract signing/verification
- [ ] Export contract as PDF
- [ ] Multi-language support (i18n)
