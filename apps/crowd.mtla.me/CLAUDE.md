# crowd.mtla.me - Crowdfunding Platform

Decentralized crowdfunding on Stellar blockchain for Montelibero community.

**Parent**: `/CLAUDE.md` - Monorepo guidelines, Effect-TS patterns, design system, testing

## Overview

**Tech Stack**: Next.js 15.5.2, Effect-TS, Stellar SDK, Pinata IPFS, Commander.js, Tailwind CSS

**Token Architecture**:
- **P-token** (`P<CODE>`) - Project NFT, claimable balance for ownership
- **C-token** (`C<CODE>`) - Crowdfunding token, sold on DEX at 1:1 with MTLCrowd
- **Metadata**: IPFS, CID in `manageData` entry `ipfshash-P<CODE>`

## Project States

- **active** - Fundraising open, deadline not passed
- **completed** - Closed successfully (funded or deadline passed)
- **canceled** - Closed without reaching goal
- **claimed/claimable** (CLI) - P-token status

## Critical Concept: Funding Metrics

**Data Source Priority**:
```
IF project has funding_status in IPFS:
  → Use IPFS finalized data (closed projects)
ELSE:
  → Calculate from blockchain (active projects)
```

**Implementation**: `getCurrentFundingMetrics()` in `src/lib/stellar/utils.ts:203-230`

**NEVER duplicate this logic** - always use centralized function.

## Effect-TS Services

- **StellarService** - `getProjects()`, `getProject()` (uses `getCurrentFundingMetrics()`)
- **ProjectService** - `createProjectTransaction()` (builds XDR)
- **PinataService** - `upload()` (IPFS)
- **StellarCheckService** - Deadline checks

All follow `/docs/guides/effect-ts-patterns.md`.

## CLI & Frontend

**CLI**: `bun run cli project <new|list|check|update-nft>`
**Frontend**: `page.tsx` uses `getProject()` from `@/lib/projects` (1min cache)

## Environment Variables

### Required
```bash
STELLAR_ACCOUNT_ID=G...         # Issuer
STELLAR_NETWORK=testnet|mainnet
STELLAR_COMM_ACCOUNT_ID=G...    # Commission
```

### Optional
```bash
STELLAR_CROWD_TOKEN=MTLCROWD:G...
PINATA_TOKEN=...
PINATA_GROUP_ID=...
```

## Types

```typescript
// Base data (always present)
type ProjectData = {
  title: string;
  description: string;
  goal_amount: string;
  deadline: string;
  // ...
};

// Extended with funding (closed projects)
type ProjectDataWithResults = ProjectData & {
  current_amount: string;
  contributors_count: number;
  funding_status: "successful" | "failed";
};
```

**Error types**: `StellarError`, `ValidationError`, `PinataError` (tagged via `@effect/schema`)

## Key Workflows

### 1. Creating Project
1. CLI prompts for details
2. Upload to IPFS → get CID
3. Generate XDR (create P/C tokens, manageData, claimable balance)
4. User signs manually

### 2. Closing Project (Preserve Data!)
**Command**: `bun run cli project update-nft`

**Steps**:
1. Fetch current IPFS data
2. Get funding metrics from blockchain
3. Add `funding_status`, `current_amount`, `contributors_count`
4. Preview JSON, confirm
5. Upload to IPFS (new CID)
6. Update `manageData` entry

**Result**: IPFS has final state, blockchain can be cleared.

### 3. Displaying Closed Projects
1. Frontend calls `getProject(code)`
2. `getCurrentFundingMetrics()` detects `funding_status` field
3. Returns IPFS data (not blockchain zeros)

**📘 Full guide**: `docs/guides/workflows.md`

## Development

```bash
bun dev                        # Dev server
bun run cli project <command>  # CLI
bun run build                  # Production build
bun run lint                   # Linter
```

## Testing

Use ManagedRuntime pattern (see `/docs/guides/effect-ts-testing.md`):

```typescript
test("test", async () => {
  const testRuntime = ManagedRuntime.make(ServiceLive);
  try {
    const result = await testRuntime.runPromise(program);
    expect(result).toBe(expected);
  } finally {
    await testRuntime.dispose();
  }
});
```

## Security

1. Private keys NEVER in code/env
2. User signs transactions (CLI / Freighter)
3. API endpoints read-only
4. IPFS data public, immutable

## Tips for AI

1. **ALWAYS use Effect-TS** - no async/await
2. **Funding metrics** - use `getCurrentFundingMetrics()`, never duplicate
3. **Caching** - use `getProject()` from `@/lib/projects`
4. **CLI commands** - output XDR, never auto-sign
5. **IPFS upload** - only via PinataService
6. **Testing** - ManagedRuntime + dispose() in finally
7. **Types** - distinguish `ProjectData` vs `ProjectDataWithResults`

## Documentation

### App Guides
- **[Workflows](/apps/crowd.mtla.me/docs/guides/workflows.md)** - Detailed workflows
- **[Funding Metrics](/apps/crowd.mtla.me/docs/guides/funding-metrics.md)** - Metrics architecture

### Monorepo Guides
- **[Effect-TS Patterns](/docs/guides/effect-ts-patterns.md)** - Core patterns
- **[Stellar Integration](/docs/guides/stellar-integration.md)** - Stellar SDK
- **[Design System](/docs/guides/design-system.md)** - UI/UX
- **[Effect-TS Testing](/docs/guides/effect-ts-testing.md)** - Testing patterns

## Common Issues

1. **Closed projects show zero** - Use `getCurrentFundingMetrics()` (see `/docs/guides/funding-metrics.md`)
2. **Duplicate caching** - Use `getProject()` from `@/lib/projects`
3. **Optional field errors** - Use conditional spread: `{ ...(condition ? { field: value } : {}) }`
