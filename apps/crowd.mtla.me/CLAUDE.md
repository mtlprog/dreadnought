# crowd.mtla.me - Crowdfunding Platform

Decentralized crowdfunding platform on Stellar blockchain for Montelibero community.

**Parent Project**: Dreadnought Monorepo - follows all rules from `/CLAUDE.md`

## 🎯 Project Overview

**Technology Stack**:
- Next.js 15.5.2 (App Router), Effect-TS, Stellar SDK, Pinata IPFS, Commander.js CLI, Tailwind CSS

## 🏗️ Architecture

### Stellar Blockchain Integration

Projects use two token types:
- **P-token** (`P<CODE>`) - Project NFT, claimable balance for ownership
- **C-token** (`C<CODE>`) - Crowdfunding token, sold on DEX at 1:1 with MTLCrowd

Metadata stored in IPFS, CID in `manageData` entry: `ipfshash-P<CODE>`

### Project Lifecycle & Funding Metrics

**CRITICAL CONCEPT**: Closed projects have blockchain data cleared but IPFS preserves final state.

**Data Source Priority** (see `/docs/guides/funding-metrics.md`):
```
IF project has funding_status in IPFS:
  → Use IPFS finalized data (closed projects)
ELSE:
  → Calculate from blockchain (active projects)
```

**Implementation**: `getCurrentFundingMetrics()` in `src/lib/stellar/utils.ts:203-230`

**Key Learning**: Always use centralized function - never duplicate metrics logic in CLI/frontend.

### Project Statuses

- **active** - Fundraising open, deadline not passed
- **completed** - Closed successfully (funded or deadline passed)
- **canceled** - Closed without reaching goal
- **claimed** (CLI) - P-token claimable balance claimed
- **claimable** (CLI) - P-token available to claim

### Effect-TS Services

All use Effect patterns (see `/CLAUDE.md`). Main services:
- **StellarService** - `getProjects()`, `getProject()` (uses `getCurrentFundingMetrics()`)
- **ProjectService** - `createProjectTransaction()` (builds XDR)
- **PinataService** - `upload()` (IPFS)
- **StellarCheckService** - deadline checks

### CLI & Frontend

**CLI**: `bun run cli project <new|list|check|update-nft>`
**Frontend**: `page.tsx` uses `getProject()` from `@/lib/projects` (1min cache)

## 🔧 Environment Variables

### Required
```bash
STELLAR_ACCOUNT_ID=G...         # Issuer account
STELLAR_NETWORK=testnet|mainnet # Network
STELLAR_COMM_ACCOUNT_ID=G...    # Commission account
```

### Optional
```bash
STELLAR_CROWD_TOKEN=MTLCROWD:G... # Crowdfunding asset
PINATA_TOKEN=...                  # IPFS upload (CLI)
PINATA_GROUP_ID=...               # IPFS group (CLI)
```

## 📝 Types

**ProjectData** - base fields (always present)
**ProjectDataWithResults** - extends with funding fields (closed projects only)

Error types: `StellarError`, `ValidationError`, `PinataError` (tagged errors via `@effect/schema`)

## 🔄 Key Workflows

### Closing Project & Preserving Funding Data

**Command**: `bun run cli project update-nft`

**Critical Steps**:
1. Fetch current data from IPFS
2. Get funding data from blockchain (trades/claimable balances)
3. Add funding fields to project data
4. Show JSON preview & confirm
5. Upload to IPFS with new CID
6. Update `manageData` entry

**Result**: IPFS contains final state, blockchain can be cleared safely.

### Displaying Closed Projects

**Flow**:
1. Frontend calls `getProject(code)`
2. Service loads IPFS data
3. `getCurrentFundingMetrics()` detects `funding_status` field
4. Returns IPFS data (not zeros from blockchain)

See `/docs/guides/funding-metrics.md` for detailed architecture.

## 🎨 UI/UX Guidelines

Follows Dreadnought Design System (see `/docs/guides/design-system.md`):
- Retrofuturistic Brutalism, zero border-radius
- High contrast (7:1 minimum), monospace for technical data
- UPPERCASE for system messages, large touch targets (48px min)

## 🧪 Testing

Use `ManagedRuntime.make()` + `dispose()` in finally. See `/docs/guides/effect-ts-testing.md`.

## 🚀 Development

```bash
bun dev                        # Start dev server
bun run cli project <command>  # Run CLI
bun run build                  # Production build
bun run lint                   # Lint code
```

## 🔐 Security

1. Private keys NEVER in code/env
2. Transaction signing by user (manual CLI / Freighter UI)
3. API endpoints read-only
4. IPFS data public, immutable

## 💡 Tips for AI

1. **ALWAYS use Effect-TS** - no async/await
2. **Funding metrics** - use `getCurrentFundingMetrics()`, never duplicate logic
3. **Caching** - use `getProject()` from `@/lib/projects`, avoid duplicate fetch
4. **CLI commands** - output XDR, never auto-sign
5. **IPFS upload** - only via PinataService
6. **Testing** - `ManagedRuntime.make()` + `dispose()` in finally
7. **Types** - distinguish `ProjectData` vs `ProjectDataWithResults`

## 📚 Documentation

### Main Guides
- `/CLAUDE.md` - Core Dreadnought monorepo rules (parent)
- `/docs/guides/funding-metrics.md` - **NEW** Funding metrics architecture
- `/docs/guides/design-system.md` - UI/UX design system
- `/docs/guides/effect-ts-testing.md` - Testing patterns

### External Links
- [Stellar SDK](https://stellar.github.io/js-stellar-sdk/)
- [Effect-TS](https://effect.website/)
- [Pinata IPFS](https://docs.pinata.cloud/)

## 🐛 Common Issues

1. **Closed projects show zero** - use `getCurrentFundingMetrics()` (IPFS-first). See `/docs/guides/funding-metrics.md`
2. **Duplicate caching** - use `getProject()` from `@/lib/projects`, not custom fetch
3. **Optional field errors** - use conditional spread: `{ ...(condition ? { field: value } : {}) }`

## 📋 Working Notes

**Recent Changes (2025-10-03)**:
- ✅ Centralized funding metrics in `getCurrentFundingMetrics()`
- ✅ Fixed closed projects showing zero data
- ✅ Removed duplicate caching in `page.tsx`
- ✅ Added comprehensive funding-metrics.md guide
- ✅ Type safety with `ProjectData | ProjectDataWithResults` union
- ✅ IPFS upload confirmation with JSON preview
