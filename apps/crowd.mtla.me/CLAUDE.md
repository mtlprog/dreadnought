# crowd.mtla.me - Crowdfunding Platform

Decentralized crowdfunding platform on Stellar blockchain for Montelibero community.

## 🎯 Project Overview

**Purpose**: Crowdfunding platform for Montelibero community projects using tokens on Stellar blockchain.

**Technology Stack**:
- Next.js 15.5.2 (App Router)
- Effect-TS for all async operations
- Stellar SDK for blockchain integration
- Pinata for IPFS metadata storage
- Commander.js for CLI
- Tailwind CSS for styling

**Parent Project**: Dreadnought Monorepo - follows all rules from `/CLAUDE.md`

## 🏗️ Architecture

### Stellar Blockchain Architecture

Projects are stored on Stellar blockchain through the following mechanisms:

#### 1. Project Metadata (IPFS)
```typescript
interface ProjectData {
  name: string;              // Project name
  code: string;              // Unique ticker (1-10 chars A-Z0-9)
  description: string;       // Short description
  fulldescription: string;   // Full description (base64 encoded)
  contact_account_id: string; // Coordinator Stellar address
  project_account_id: string; // Project Stellar address
  target_amount: string;     // Target amount
  deadline: string;          // Deadline (YYYY-MM-DD)
}
```

Metadata is uploaded to IPFS and the link is stored in `manageData` entry:
- **Key**: `ipfshash-P<CODE>` (e.g., `ipfshash-PMETAL`)
- **Value**: IPFS CID (e.g., `bafkreiabc123...`)

#### 2. Project Tokens

Two types of tokens are created for each project:

**P-token (Project Token)** - `P<CODE>`
- Represents project ownership
- Created as claimable balance with two claimants:
  - Issuer (STELLAR_ACCOUNT_ID)
  - Project account (project_account_id)
- Amount: 0.0000001 (minimum)

**C-token (Crowdfunding Token)** - `C<CODE>`
- Represents contribution to the project
- Listed for sale on Stellar DEX
- Exchange rate: 1:1 with MTLCrowd (or XLM)
- Amount: equals target_amount

#### 3. Trading Orders

Automatically creates sell order:
```typescript
Operation.manageSellOffer({
  selling: crowdfundingAsset,    // C<CODE>
  buying: mtlCrowdAsset,         // MTLCrowd
  amount: targetAmount,          // Target amount
  price: "1.0000000",           // 1:1 rate
  offerId: "0"                   // New offer
})
```

#### 4. Project Statuses

- **active**: Deadline not expired, fundraising active
- **completed**: Deadline expired, shows "FUNDING ENDED"
- **claimed**: (CLI) Claimable balance claimed
- **claimable**: (CLI) Claimable balance available

### Effect-TS Service Architecture

All services follow Effect-TS patterns:

```typescript
// Service Definition Pattern
export interface ServiceName {
  readonly method: (params) => Effect.Effect<Result, Error>
}

export const ServiceTag = Context.GenericTag<ServiceName>("@app/ServiceName")

export const ServiceLive = Layer.succeed(ServiceTag, {
  method: (params) => pipe(
    Effect.succeed(null),
    Effect.flatMap(operation),
    Effect.catchTag("ErrorTag", handleError)
  )
})
```

#### Core Services

1. **ProjectService** (`src/lib/stellar/project-service.ts`)
   - `createProjectTransaction()` - creates project transaction
   - Uses Stellar SDK to build transaction
   - Returns XDR for signing

2. **PinataService** (`src/cli/services/pinata.service.ts`)
   - `upload()` - uploads metadata to IPFS
   - Requires PINATA_TOKEN and PINATA_GROUP_ID
   - Returns IPFS CID

3. **EnvironmentService** (`src/cli/services/environment.service.ts`)
   - `getRequired()` - gets required env variables
   - `getOptional()` - gets optional env variables

4. **StellarService** (`src/lib/stellar/service.ts`)
   - Works with Stellar Horizon API
   - Loads accounts, balances, operations

5. **StellarCheckService** (`src/lib/stellar/check-service.ts`)
   - Checks project deadlines
   - Determines statuses

### CLI Architecture

CLI is built on Commander.js with Effect-TS integration:

```bash
bun run cli project new        # Create project
bun run cli project list       # List projects
bun run cli project check      # Check deadlines
bun run cli project update-nft # Update NFT metadata
```

**CLI Structure**:
```
src/cli/
├── index.ts              # Entry point, Commander setup
├── layers.ts            # Effect Layer composition
├── types.ts             # CLI error types
├── commands/
│   ├── create-project.ts   # Create project
│   ├── list-projects.ts    # List projects
│   ├── check-projects.ts   # Check projects
│   └── update-nft.ts       # Update NFT metadata
├── services/
│   ├── environment.service.ts  # Env variables
│   └── pinata.service.ts      # IPFS upload
└── utils/
    ├── validation.ts    # Data validation
    ├── errors.ts        # Error handling
    └── ipfs.ts          # IPFS utilities
```

**CLI Layer Composition**:
```typescript
export const AppLayer = Layer.mergeAll(
  EnvironmentServiceLive,
  PinataServiceLive,
  StellarServiceLive,
  StellarCheckServiceLive,
  ProjectServiceLive,
);
```

### Frontend Architecture

Next.js App Router with Server Components and Client Components:

```
src/app/
├── layout.tsx           # Root layout with i18n
├── page.tsx            # List all projects
├── [code]/
│   ├── page.tsx        # Project details
│   └── not-found.tsx   # 404 for project
└── api/
    ├── projects/
    │   ├── route.ts          # GET /api/projects
    │   └── [code]/route.ts   # GET /api/projects/:code
    ├── balance/route.ts      # GET /api/balance
    └── funding/route.ts      # POST /api/funding
```

## 🔧 Environment Variables

### Required

```bash
STELLAR_ACCOUNT_ID=G...    # Issuer account public key
STELLAR_NETWORK=testnet    # testnet | mainnet
STELLAR_COMM_ACCOUNT_ID=G... # Commission account
```

### Optional

```bash
STELLAR_CROWD_TOKEN=MTLCROWD:G... # Crowdfunding token
PINATA_TOKEN=...          # JWT for Pinata (CLI only)
PINATA_GROUP_ID=...       # Group ID in Pinata (CLI only)
```

### Getting config in code

```typescript
import { getStellarConfig } from "@/lib/stellar/config";

const program = pipe(
  getStellarConfig(),
  Effect.flatMap(config => {
    // config.publicKey
    // config.server (Horizon.Server)
    // config.networkPassphrase
    // config.mtlCrowdAsset
    // config.commissionAccountId
  })
);
```

## 📝 Types and Schemas

### ProjectData Schema

```typescript
import { ProjectDataSchema } from "@/lib/stellar/types";

// Validation with Effect-TS Schema
const validated = S.decodeUnknownSync(ProjectDataSchema)(data);

// Or via utility
import { validateProjectData } from "@/cli/utils/validation";
const result = validateProjectData(data); // Effect.Effect<ProjectData, ValidationError>
```

### Error Types

```typescript
// CLI errors
class ValidationError extends S.TaggedError<ValidationError>()("ValidationError", {
  field: S.String,
  message: S.String,
}) {}

class PinataError extends S.TaggedError<PinataError>()("PinataError", {
  cause: S.Unknown,
  operation: S.String,
}) {}

// Stellar errors
class StellarError extends S.TaggedError<StellarError>()("StellarError", {
  cause: S.Unknown,
  operation: S.String,
}) {}

class EnvironmentError extends S.TaggedError<EnvironmentError>()("EnvironmentError", {
  variable: S.String,
}) {}
```

## 🎨 UI/UX Guidelines

Follows Dreadnought Design System (see `/docs/guides/design-system.md`):

- **Retrofuturistic Brutalism** - angular forms, zero border-radius
- **High Contrast** - minimum 7:1 contrast ratio
- **Monospace for technical data** - addresses, codes, amounts
- **UPPERCASE for system messages**
- **Large touch targets** - minimum 48px

Color palette:
```css
--background: #000000;
--foreground: #ffffff;
--primary: #00ff00;  /* Matrix green */
--accent: #00ffff;   /* Cyan for links */
--danger: #ff0000;
```

## 🔄 Workflow Examples

### Creating project via CLI

```typescript
// 1. Interactive data input (prompts)
const projectData = yield* askQuestions(); // ProjectData

// 2. Upload to IPFS
const cid = yield* pipe(
  PinataServiceCli,
  Effect.flatMap(service => service.upload(projectData))
);

// 3. Create Stellar transaction
const xdr = yield* pipe(
  ProjectServiceTag,
  Effect.flatMap(service =>
    service.createProjectTransaction(
      projectData.code,
      cid,
      projectData.project_account_id,
      projectData.target_amount
    )
  )
);

// 4. Output XDR for signing
console.log(xdr); // User signs manually
```

### Updating NFT metadata

```typescript
// Command: bun run cli project update-nft

// 1. Input asset code
const assetCode = yield* askForAssetCode();

// 2. Fetch current data from IPFS
const currentData = yield* fetchProjectFromIPFS(assetCode);

// 3. Show current data and edit
const updatedData = yield* askForUpdatedData(currentData);

// 4. Check if target_amount changed
if (currentData.target_amount !== updatedData.target_amount) {
  // Find existing sell offer
  const existingOffer = yield* findActiveSellOffer(assetCode);

  // Calculate already sold amount
  const soldAmount = yield* calculateSoldAmount(assetCode);

  // Calculate remaining amount to sell
  const remainingAmount = parseFloat(updatedData.target_amount) - parseFloat(soldAmount);

  // Validate new target >= sold amount
  if (remainingAmount < 0) {
    throw new Error("Cannot reduce target below sold amount");
  }
}

// 5. Upload to IPFS
const newCid = yield* pipe(
  PinataServiceCli,
  Effect.flatMap(service => service.upload(updatedData))
);

// 6. Create update transaction
// - Updates IPFS hash (manageData)
// - If target changed: deletes old offer, creates new offer with remaining amount
const xdr = yield* createUpdateTransaction(assetCode, currentData, updatedData, newCid);

// 7. Output XDR
console.log(xdr);
```

## 🧪 Testing Strategy

Follows patterns from `/CLAUDE.md`:

```typescript
import { describe, test, expect } from "bun:test";
import { Effect, ManagedRuntime, pipe } from "effect";
import { PinataServiceLive } from "./pinata.service";

describe("PinataService", () => {
  test("should upload data to IPFS", async () => {
    const testRuntime = ManagedRuntime.make(PinataServiceLive);

    try {
      const program = pipe(
        PinataServiceCli,
        Effect.flatMap(service => service.upload(testProjectData))
      );

      const cid = await testRuntime.runPromise(program);
      expect(cid).toMatch(/^bafkrei[a-z0-9]+$/);
    } finally {
      await testRuntime.dispose();
    }
  });
});
```

**CRITICAL**:
- Always use `ManagedRuntime.make()`
- Always call `testRuntime.dispose()` in finally
- Create fresh runtime for each test

## 🚀 Development Workflow

### Running dev server

```bash
bun dev  # http://localhost:3000
```

### Working with CLI

```bash
# Create project
bun run cli project new

# List projects
bun run cli project list

# Check deadlines
bun run cli project check

# Update NFT metadata
bun run cli project update-nft
```

### Environment setup

```bash
# Testnet
export STELLAR_ACCOUNT_ID="GTEST..."
export STELLAR_NETWORK="testnet"
export STELLAR_COMM_ACCOUNT_ID="GCOMM..."
export PINATA_TOKEN="eyJ..."
export PINATA_GROUP_ID="01234..."

# Or via .env.local
cp .env.example .env.local
# Edit .env.local
```

## 📦 Package Dependencies

This app uses the following packages from the monorepo:
- No direct dependencies from /packages yet

Possible future dependencies:
- `@dreadnought/stellar-wallet-kit` - for wallet integration
- `@dreadnought/ui` - for shared UI components
- `@dreadnought/utils` - for utilities

## 🔐 Security

1. **Private keys**: NEVER stored in code or env
2. **Transaction signing**: Performed by user manually (CLI) or via Freighter (UI)
3. **API endpoints**: Read-only operations only
4. **IPFS data**: Public, immutable after upload

## 📋 Roadmap

### Implemented
- ✅ Create projects via CLI
- ✅ List projects (CLI and UI)
- ✅ Project details with progress
- ✅ Check deadlines
- ✅ IPFS integration
- ✅ Update NFT metadata via CLI

### In Development
- 🚧 Freighter integration for funding via UI
- 🚧 Project transaction history

### Planned
- 📝 Project administration
- 📝 Statistics and analytics
- 📝 Deadline notifications
- 📝 Multi-language support (i18n)

## 🐛 Known Issues

1. **Caching**: Data is cached for 5 minutes, changes may not be visible immediately
2. **Error handling**: Need to improve user-facing error messages
3. **Validation**: Need stricter validation for Stellar addresses and amounts

## 💡 Tips for AI

When working with this project:

1. **ALWAYS use Effect-TS** - no async/await functions
2. **Check existing services** - before implementing new functionality
3. **CLI commands** - always output XDR for manual signing, never sign automatically
4. **Validation** - use `validateProjectData()` for ProjectData
5. **IPFS upload** - only through PinataService
6. **Stellar operations** - always via Effect.tryPromise
7. **Testing** - ManagedRuntime.make() + dispose() in finally

## 📚 Related Documentation

- `/CLAUDE.md` - Core Dreadnought monorepo rules
- `/docs/guides/design-system.md` - Design system
- `/docs/guides/effect-ts-testing.md` - Testing with Effect-TS
- `README.md` - User-facing documentation

## 🔗 Useful Links

- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
- [Effect-TS Documentation](https://effect.website/)
- [Pinata IPFS Documentation](https://docs.pinata.cloud/)
- [Commander.js Documentation](https://github.com/tj/commander.js)
