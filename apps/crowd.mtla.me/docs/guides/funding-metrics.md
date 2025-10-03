# Funding Metrics Architecture

Guide to centralized funding metrics calculation for crowd.mtla.me

## 🎯 Problem Solved

**Issue**: Closed projects showed zero funding data because blockchain was cleared (claimable balances claimed, tokens clawed back), but finalized data existed in IPFS.

**Solution**: Centralized `getCurrentFundingMetrics()` function with IPFS-first priority logic.

## 🏗️ Architecture

### Data Sources Priority

```
IF project has funding_status in IPFS:
  → Use IPFS data (source of truth for closed projects)
ELSE:
  → Calculate from blockchain (for active projects)
```

### Implementation Location

**Single Source of Truth**: `src/lib/stellar/utils.ts:203-230`

```typescript
export const getCurrentFundingMetrics = (
  projectData: Readonly<ProjectData | ProjectDataWithResults>,
  claimableBalances: Readonly<readonly Horizon.ServerApi.ClaimableBalanceRecord[]>,
  assetCode: Readonly<string>,
  stellarAccountId: Readonly<string>,
): { readonly amount: string; readonly supporters: number } => {
  // Check if project has finalized funding data in IPFS
  const hasIPFSFundingData = "funding_status" in projectData
    && projectData.funding_status !== undefined
    && "funded_amount" in projectData
    && projectData.funded_amount !== undefined
    && "supporters_count" in projectData
    && projectData.supporters_count !== undefined;

  if (hasIPFSFundingData) {
    // Closed project - use IPFS as source of truth
    return {
      amount: projectData.funded_amount,
      supporters: projectData.supporters_count,
    };
  }

  // Active project - calculate from blockchain
  return {
    amount: calculateRaisedAmount(claimableBalances, assetCode, stellarAccountId),
    supporters: countUniqueSupporters(claimableBalances, assetCode, stellarAccountId),
  };
};
```

## 📊 Data Flow

### Active Projects
1. **Blockchain** → claimable balances exist
2. **calculateRaisedAmount()** → sum C-token amounts in claimable balances
3. **countUniqueSupporters()** → count unique sponsor addresses
4. **Result** → real-time blockchain data

### Closed Projects
1. **IPFS** → contains `funding_status`, `funded_amount`, `supporters_count`
2. **Direct read** → no calculation needed
3. **Result** → finalized historical data (persists after blockchain cleanup)

## 🔄 Project Lifecycle

### 1. Active Fundraising
- **C-tokens** sold on DEX → creates trades
- **Buyers** create claimable balances for issuer
- **Metrics** calculated from blockchain in real-time

### 2. Project Closes (Success or Cancel)
- **CLI command** `update-nft` adds funding data to IPFS:
  - `funded_amount`: total raised
  - `supporters_count`: unique supporters
  - `funding_status`: "completed" | "canceled"
  - `supporters`: array of contributions
  - `remaining_amount`: unsold amount

### 3. Blockchain Cleanup
- **Claimable balances** claimed by issuer
- **C-tokens** clawed back
- **P-tokens** distributed or burned
- **Blockchain** shows zero data

### 4. Historical Display
- **Frontend** uses `getCurrentFundingMetrics()`
- **Detects** `funding_status` in IPFS
- **Shows** finalized data from IPFS (not zeros from blockchain)

## 🔧 Usage

### In Service Layer

**File**: `src/lib/stellar/service.ts`

```typescript
// Get funding metrics (IPFS priority for closed projects)
const metrics = getCurrentFundingMetrics(
  projectData,
  claimableBalances,
  projectEntry.code,
  config.publicKey,
);

const projectInfo: ProjectInfo = {
  // ... other fields
  current_amount: metrics.amount,
  supporters_count: metrics.supporters,
  status: determineStatus(projectData, metrics),
};
```

### In CLI

**File**: `src/cli/commands/update-nft.ts`

When closing project, add funding data to IPFS:

```typescript
const fundingData = yield* getCurrentFundingData(assetCode, targetAmount);

const updatedData: ProjectDataWithResults = {
  ...currentData,
  funded_amount: fundingData.funded_amount,
  supporters_count: fundingData.supporters_count,
  funding_status: fundingData.funding_status,
  supporters: fundingData.supporters,
  remaining_amount: fundingData.remaining_amount,
};

// Upload to IPFS
const newCid = yield* uploadToIPFS(updatedData);
```

## 📁 Related Files

### Core Logic
- `src/lib/stellar/utils.ts` - `getCurrentFundingMetrics()`
- `src/lib/stellar/service.ts` - uses in `getProject()` and `getProjects()`

### CLI Tools
- `src/cli/commands/update-nft.ts` - adds funding data to closed projects
- `src/cli/utils/funding-history.ts` - fetches historical data from trades

### Types
- `src/lib/stellar/types.ts` - `ProjectData` vs `ProjectDataWithResults`

### Frontend
- `src/app/[code]/page.tsx` - project details page
- `src/lib/projects.ts` - cached data fetching

## ⚠️ Important Notes

### DRY Principle
**CRITICAL**: Logic exists in ONE place only (`getCurrentFundingMetrics()`).

❌ **DO NOT** duplicate this logic in:
- CLI commands
- Frontend components
- API routes
- Other services

✅ **ALWAYS** import and use `getCurrentFundingMetrics()` from `utils.ts`

### Type Safety

The function accepts union type to handle both cases:

```typescript
projectData: Readonly<ProjectData | ProjectDataWithResults>
```

TypeScript narrowing via runtime checks ensures type safety:
- `"funding_status" in projectData` - checks property exists
- `projectData.funding_status !== undefined` - checks value exists
- Both conditions required for proper type narrowing

### Caching Consideration

**Issue Found**: `page.tsx` was doing duplicate fetch with separate cache.

**Solution**: Use `getProject()` from `@/lib/projects` which already has caching (1 minute).

```typescript
// ❌ WRONG - duplicate caching
const response = await fetch(`/api/projects/${code}`, {
  next: { revalidate: 300 }
});

// ✅ CORRECT - single cache layer
import { getProject } from "@/lib/projects";
const project = await getProject(code);
```

## 🧪 Testing

When writing tests for metrics:

```typescript
test("closed project uses IPFS data", async () => {
  const projectData: ProjectDataWithResults = {
    ...baseData,
    funding_status: "completed",
    funded_amount: "1000",
    supporters_count: 10,
  };

  const metrics = getCurrentFundingMetrics(
    projectData,
    [], // empty claimable balances (blockchain cleared)
    "TEST",
    issuerAccount,
  );

  expect(metrics.amount).toBe("1000");
  expect(metrics.supporters).toBe(10);
});

test("active project calculates from blockchain", async () => {
  const projectData: ProjectData = {
    ...baseData,
    // no funding_status
  };

  const metrics = getCurrentFundingMetrics(
    projectData,
    mockClaimableBalances,
    "TEST",
    issuerAccount,
  );

  // Should calculate from claimable balances
  expect(metrics.amount).toBe(calculateRaisedAmount(...));
  expect(metrics.supporters).toBe(countUniqueSupporters(...));
});
```

## 🔍 Debugging

If funding data shows zeros:

1. **Check IPFS data**: Visit `https://ipfs.io/ipfs/{cid}`
   - Look for `funding_status` field
   - Verify `funded_amount` and `supporters_count` exist

2. **Check function input**:
   - Is `projectData` type `ProjectDataWithResults`?
   - Are optional fields actually present?

3. **Check cache**:
   - Clear `.next` folder
   - Restart dev server
   - Force refresh browser (Cmd+Shift+R)

4. **Check API response**:
   ```bash
   curl http://localhost:3000/api/projects/PROJECTCODE | jq .data
   ```

## 📈 Future Improvements

Potential enhancements:

1. **Cache IPFS data** - reduce IPFS calls for closed projects
2. **Validation** - add Schema validation for funding fields
3. **Migration tool** - backfill funding data for old projects
4. **Analytics** - track metrics history over time
