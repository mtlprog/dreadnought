# Crowdfunding Platform Workflows

Detailed workflows for the crowd.mtla.me decentralized crowdfunding platform.

## Project Lifecycle Overview

Projects on the platform go through several states with blockchain and IPFS data synchronization.

### Project States

- **active** - Fundraising open, deadline not passed
- **completed** - Closed successfully (funded or deadline reached)
- **canceled** - Closed without reaching goal
- **claimed** (CLI) - P-token claimable balance has been claimed
- **claimable** (CLI) - P-token available to claim

## Token Architecture

Each project uses two token types:

### P-token (Project NFT)
- **Code**: `P<CODE>` (e.g., PMTL)
- **Purpose**: Project ownership NFT
- **Distribution**: Single claimable balance for project owner
- **Metadata**: Stored in IPFS, CID in `manageData` entry `ipfshash-P<CODE>`

### C-token (Crowdfunding Token)
- **Code**: `C<CODE>` (e.g., CMTL)
- **Purpose**: Sold on DEX during fundraising
- **Price**: 1:1 with MTLCrowd base token
- **Trading**: Available on Stellar DEX

## Workflow 1: Creating a New Project

### Step 1: Prepare Project Data

```typescript
interface ProjectMetadata {
  title: string;
  description: string;
  goalAmount: string;          // e.g., "10000"
  deadline: string;             // ISO date string
  category: string;
  imageUrl?: string;
}
```

### Step 2: Upload Metadata to IPFS

**CLI Command**:
```bash
bun run cli project new
```

**Process**:
1. Prompt for project details (title, description, goal, deadline)
2. Upload metadata to Pinata IPFS
3. Receive IPFS CID
4. Generate transaction XDR

**Effect-TS Implementation**:
```typescript
const createProjectProgram = pipe(
  Effect.all({
    pinata: PinataService,
    project: ProjectService,
  }),
  Effect.flatMap(({ pinata, project }) =>
    pipe(
      pinata.upload(metadata),
      Effect.map((cid) => ({ cid, metadata })),
      Effect.flatMap(({ cid }) =>
        project.createProjectTransaction({
          code: projectCode,
          ipfsCid: cid,
          goalAmount: metadata.goalAmount,
          deadline: metadata.deadline,
        })
      )
    )
  )
);
```

### Step 3: Sign and Submit Transaction

**Transaction Operations**:
1. Create P-token (Project NFT)
2. Create C-token (Crowdfunding token)
3. Add `manageData` entry: `ipfshash-P<CODE>` = IPFS CID
4. Create claimable balance with P-token for owner
5. Create liquidity pool or DEX offer for C-token

**Manual Signing** (CLI outputs XDR):
```bash
# User signs with Freighter or stellar-cli
stellar tx sign <XDR> --source <ISSUER_SECRET>
stellar tx submit <SIGNED_XDR>
```

**Result**: Project is now **active** and visible on the platform.

## Workflow 2: Funding Metrics (Active Projects)

### Data Source: Blockchain

**CRITICAL**: Active projects calculate metrics from blockchain in real-time.

**Implementation** (`src/lib/stellar/utils.ts:203-230`):
```typescript
export const getCurrentFundingMetrics = (
  projectData: ProjectData | ProjectDataWithResults
): FundingMetrics => {
  // Check if data has finalized funding_status (from IPFS)
  if ("funding_status" in projectData && projectData.funding_status) {
    // Project closed - use IPFS data
    return {
      currentAmount: projectData.current_amount ?? "0",
      contributorsCount: projectData.contributors_count ?? 0,
      fundingStatus: projectData.funding_status,
    };
  }

  // Active project - calculate from blockchain
  return calculateFromBlockchain(projectData);
};
```

### Funding Calculation Methods

1. **DEX Trades** - Sum all C-token sales
2. **Claimable Balances** - Check for contributor claimable balances
3. **Direct Transfers** - Account for direct C-token transfers

**Important**: Never duplicate this logic in CLI or frontend - always use `getCurrentFundingMetrics()`.

## Workflow 3: Closing a Project

### Critical: Preserve Funding Data

**PROBLEM**: When project closes, blockchain data may be cleared (offers removed, balances claimed).

**SOLUTION**: Snapshot final state to IPFS before clearing blockchain.

### Step 1: Fetch Current Funding Data

```typescript
const program = pipe(
  StellarService,
  Effect.flatMap((stellar) =>
    stellar.getProject(projectCode)
  ),
  Effect.map((project) => ({
    ...project,
    current_amount: calculateFinalAmount(project),
    contributors_count: calculateContributors(project),
    funding_status: project.currentAmount >= project.goalAmount
      ? "successful" as const
      : "failed" as const
  }))
);
```

### Step 2: Update IPFS with Final State

**CLI Command**:
```bash
bun run cli project update-nft
```

**Process**:
1. Fetch current IPFS data
2. Get blockchain funding metrics
3. Add `funding_status`, `current_amount`, `contributors_count` fields
4. Preview JSON changes
5. Ask for confirmation
6. Upload updated data to IPFS (new CID)
7. Generate transaction to update `manageData` entry

**Code Flow** (`src/cli/commands/update-project-nft.ts`):
```typescript
pipe(
  // 1. Load current IPFS data
  loadProjectFromIPFS(projectCode),

  // 2. Get funding metrics from blockchain
  Effect.flatMap((currentData) =>
    pipe(
      getFundingMetricsFromBlockchain(projectCode),
      Effect.map((metrics) => ({
        ...currentData,
        current_amount: metrics.currentAmount,
        contributors_count: metrics.contributorsCount,
        funding_status: metrics.fundingStatus,
      }))
    )
  ),

  // 3. Show preview
  Effect.tap((updatedData) =>
    Effect.sync(() => {
      console.log("Updated NFT data:");
      console.log(JSON.stringify(updatedData, null, 2));
    })
  ),

  // 4. Confirm
  Effect.flatMap((updatedData) =>
    askForConfirmation().pipe(
      Effect.flatMap((confirmed) =>
        confirmed
          ? uploadToIPFSAndUpdateManageData(updatedData)
          : Effect.fail(new CancelledError())
      )
    )
  )
);
```

### Step 3: Update ManageData Entry

**Transaction**:
```typescript
const tx = new TransactionBuilder(account, { fee: BASE_FEE })
  .addOperation(
    Operation.manageData({
      name: `ipfshash-P${projectCode}`,
      value: newIpfsCid,
    })
  )
  .setTimeout(30)
  .build();
```

**Result**: IPFS now contains final funding data, safe to clear blockchain.

## Workflow 4: Displaying Closed Projects

### Data Source: IPFS (not blockchain)

**Frontend Implementation** (`page.tsx`):
```typescript
const project = await getProject(projectCode);

// getCurrentFundingMetrics() detects funding_status field
const metrics = getCurrentFundingMetrics(project);

// If project has funding_status, metrics come from IPFS
// Otherwise, calculated from blockchain
```

**Type Safety**:
```typescript
type ProjectData = {
  title: string;
  description: string;
  goal_amount: string;
  deadline: string;
  // ... base fields
};

type ProjectDataWithResults = ProjectData & {
  current_amount: string;
  contributors_count: number;
  funding_status: "successful" | "failed";
};

// Union type for getProject() return
type ProjectResponse = ProjectData | ProjectDataWithResults;
```

### Rendering Logic

```tsx
function ProjectPage({ project }: { project: ProjectResponse }) {
  const metrics = getCurrentFundingMetrics(project);

  const isClosed = "funding_status" in project;
  const isSuccessful = isClosed && project.funding_status === "successful";

  return (
    <div>
      <h1>{project.title}</h1>
      <p>Goal: {project.goal_amount} MTLCrowd</p>
      <p>Raised: {metrics.currentAmount} MTLCrowd</p>
      <p>Contributors: {metrics.contributorsCount}</p>

      {isClosed && (
        <Badge variant={isSuccessful ? "success" : "error"}>
          {project.funding_status.toUpperCase()}
        </Badge>
      )}
    </div>
  );
}
```

## Workflow 5: Claiming P-token (Owner)

### Check Claimable Status

**CLI Command**:
```bash
bun run cli project check <PROJECT_CODE>
```

**Output**:
```
Project: PMTL
Status: claimable
Claimable Balance ID: 000000...
Claimant: GOWNER...
```

### Claim P-token

**Process**:
1. Find claimable balance for P-token
2. Generate claim transaction
3. Sign with owner's key
4. Submit to network

**Transaction**:
```typescript
const tx = new TransactionBuilder(account, { fee: BASE_FEE })
  .addOperation(
    Operation.claimClaimableBalance({
      balanceId: claimableBalanceId,
    })
  )
  .setTimeout(30)
  .build();
```

## Workflow 6: Frontend Caching

### getProject() with Cache

**File**: `src/lib/projects.ts`

```typescript
const projectCache = new Map<string, {
  data: ProjectData | ProjectDataWithResults;
  timestamp: number;
}>();

const CACHE_TTL = 60_000; // 1 minute

export const getProject = (code: string): ProjectResponse => {
  const cached = projectCache.get(code);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const program = pipe(
    StellarService,
    Effect.flatMap((stellar) => stellar.getProject(code)),
    Effect.tap((data) =>
      Effect.sync(() => {
        projectCache.set(code, { data, timestamp: now });
      })
    )
  );

  return Effect.runPromise(program);
};
```

**Important**:
- Cache prevents duplicate IPFS fetches
- TTL refreshes data every minute
- Used in `page.tsx` and other components

## Common Patterns

### Error Handling

```typescript
pipe(
  riskyOperation(),
  Effect.catchTag("IPFSError", (error) =>
    Effect.log(`IPFS error: ${error.message}`).pipe(
      Effect.flatMap(() => fallbackOperation())
    )
  ),
  Effect.catchTag("StellarError", (error) =>
    Effect.fail(new ApplicationError({ cause: error }))
  )
);
```

### User Confirmations

```typescript
const askForConfirmation = () =>
  Effect.tryPromise({
    try: async () => {
      const answers = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmed",
          message: "Continue with this action?",
          default: false,
        },
      ]);
      return answers.confirmed;
    },
    catch: (error) => new InteractionError({ cause: error }),
  });
```

### XDR Output Pattern

```typescript
// Never auto-submit transactions
pipe(
  buildTransaction(params),
  Effect.map((tx) => tx.toXDR()),
  Effect.tap((xdr) =>
    Effect.sync(() => {
      console.log("\nTransaction XDR:");
      console.log(xdr);
      console.log("\nSign and submit manually with stellar-cli or Freighter");
    })
  )
);
```

## Security Considerations

1. **Private Keys**: NEVER in code or env files
2. **Transaction Signing**: Always manual (CLI or Freighter)
3. **API Endpoints**: Read-only, no mutations
4. **IPFS Data**: Public and immutable
5. **Validation**: Schema validation with `@effect/schema`

## Troubleshooting

### Issue: Closed projects show zero funding

**Cause**: `getCurrentFundingMetrics()` not used, or IPFS not updated before closing

**Solution**:
1. Run `bun run cli project update-nft` to snapshot data
2. Use `getCurrentFundingMetrics()` in all display logic

### Issue: Duplicate caching in components

**Cause**: Multiple components calling Stellar/IPFS directly

**Solution**: Use `getProject()` from `@/lib/projects`, not custom fetch

### Issue: exactOptionalPropertyTypes errors

**Cause**: Assigning `undefined` to optional fields

**Solution**:
```typescript
// ❌ WRONG
{ ...obj, field: condition ? value : undefined }

// ✅ CORRECT
{ ...obj, ...(condition ? { field: value } : {}) }
```

## See Also

- **[Funding Metrics Architecture](/apps/crowd.mtla.me/docs/guides/funding-metrics.md)** - Detailed metrics guide
- **[Effect-TS Patterns](/docs/guides/effect-ts-patterns.md)** - Core Effect-TS patterns
- **[Stellar Integration](/docs/guides/stellar-integration.md)** - Stellar SDK integration
- **[TypeScript Config](/docs/guides/typescript-config.md)** - Type system guide
