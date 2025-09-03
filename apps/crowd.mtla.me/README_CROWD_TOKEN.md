# MTLCrowd Token Configuration

## Overview

The MTLCrowd platform now supports configurable crowd token through environment variables. This allows using different tokens for crowdfunding operations while maintaining the same operational account.

## Environment Variables

### `STELLAR_CROWD_TOKEN` (optional)

Format: `<token_code>-<issuer_account_id>`

**Example:**
```bash
STELLAR_CROWD_TOKEN="CustomCrowd-GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

**Fallback behavior:**
- If not set or empty, defaults to `MTLCrowd` issued by `STELLAR_ACCOUNT_ID`
- If malformed, application will fail with `EnvironmentError`

### `STELLAR_ACCOUNT_ID` (required)

The main account for all operations (creating projects, managing transactions).

**Example:**
```bash
STELLAR_ACCOUNT_ID="GAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

## Usage Examples

### Default Configuration (MTLCrowd)
```bash
STELLAR_ACCOUNT_ID="GA123...ABC"
# STELLAR_CROWD_TOKEN not set - uses MTLCrowd issued by GA123...ABC
```

### Custom Token Configuration
```bash
STELLAR_ACCOUNT_ID="GA123...ABC"
STELLAR_CROWD_TOKEN="MYCROWD-GB456...DEF"
# Uses MYCROWD token issued by GB456...DEF for crowdfunding
# All operations still performed by GA123...ABC
```

## Implementation Details

### Files Modified

1. **`src/lib/stellar/config.ts`**
   - Added `mtlCrowdAsset` to `StellarConfig` interface
   - Updated `getStellarConfig()` to parse crowd token

2. **`src/lib/stellar/crowd-token.ts`** (new)
   - `parseCrowdToken()` function for parsing environment variable
   - Handles fallback to default MTLCrowd token

3. **Updated Services:**
   - `balance-service.ts` - Uses configurable asset for balance checks
   - `project-service.ts` - Uses configurable asset for project creation
   - `funding-service.ts` - Uses configurable asset for funding transactions
   - `check-service.ts` - Uses configurable asset for project checking and funding

4. **`src/cli/types.ts`**
   - Updated `CliError` type to include Stellar errors

### Key Features

- **Backward Compatible**: Existing setups continue working without changes
- **Type Safe**: Full TypeScript support with proper error handling
- **Effect-TS Integration**: Uses Effect for error handling and composition
- **Validation**: Proper format validation with descriptive error messages

## Error Handling

The system will throw `EnvironmentError` in these cases:
- Invalid format (not `code-account_id`)
- Empty code or account_id parts
- Invalid Stellar asset creation

## Testing

Build the project to verify configuration:
```bash
bun run build
```

The build process validates all configurations and reports any issues.
