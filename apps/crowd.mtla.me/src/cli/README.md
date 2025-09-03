# Crowd CLI

CLI tool for managing Montelibero Crowdsourcing Platform projects.

## Commands

### `project new`
Creates a new crowdfunding project by:
- Collecting project information through interactive prompts
- Uploading project data to IPFS via Pinata
- Generating Stellar transaction with project token (P-token), crowdfunding token (C-token), and sell offer

### `project list`
Lists all existing projects from Stellar blockchain data entries.

### `project check` ⭐ NEW
Checks project deadlines and processes expired projects by:

1. **Fetching all projects** from Stellar blockchain
2. **Checking deadlines** - identifies projects past their deadline date
3. **Calculating raised amounts** from claimable balances of C-tokens
4. **Processing expired projects**:
   - **Goal NOT reached**: Creates refund transaction
     - Claims all C-token claimable balances
     - Sends MTLCrowd back to supporters (1:1 ratio)
     - Cancels active sell offers for C-tokens
   - **Goal reached**: Creates funding transaction
     - Claims C-token balances up to target amount
     - Sends MTLCrowd to project account (direct payment if trustline exists, claimable balance otherwise)
     - Logs if collected amount exceeds target

## Architecture

The CLI has been refactored to use a clean modular structure with shared services:

```
cli/
├── commands/           # Command implementations
│   ├── create-project.ts
│   ├── list-projects.ts
│   └── check-projects.ts
├── services/           # CLI-specific services
│   ├── environment.service.ts
│   └── pinata.service.ts
├── utils/              # Utility functions
│   ├── validation.ts
│   ├── environment.ts
│   └── errors.ts
├── types.ts           # CLI error types
├── layers.ts          # Effect layers composition
└── index.ts           # Main CLI entry point

lib/stellar/           # Shared Stellar services
├── check-service.ts   # Project deadline checking
├── project-service.ts # Project creation
├── service.ts         # Project listing
├── config.ts          # Stellar configuration
├── errors.ts          # Stellar error types
└── utils.ts           # Stellar utilities
```

### Key Features

- **Modular Design**: Shared services in `lib/stellar/` used by both CLI and web app
- **Effect-TS Throughout**: All async operations use Effect for type-safe error handling
- **Per-Project Error Handling**: Check command continues processing other projects if one fails
- **Comprehensive Logging**: Debug logs for detailed information, info logs for summaries
- **Transaction Generation Only**: CLI generates XDR transactions for manual review and signing

## Usage

```bash
# Create new project
bun src/cli/index.ts project new

# List all projects
bun src/cli/index.ts project list

# Check deadlines and process expired projects
bun src/cli/index.ts project check
```

## Environment Variables

- `STELLAR_ACCOUNT_ID` - Required for all commands
- `STELLAR_NETWORK` - Optional, defaults to "testnet"
- `PINATA_TOKEN` - Required for project creation
- `PINATA_GROUP_ID` - Required for project creation

## Transaction Output

The `check` command generates XDR transactions that need to be manually reviewed and signed. Each transaction handles either:
- **Refunding supporters** when goal not reached
- **Funding project** when goal reached

The transactions are logged to console for manual processing.
