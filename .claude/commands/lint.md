# Lint Command

Automatically runs the linter and fixes all errors until none remain.

## Description
This command will:
1. Run `bun run lint` in the project root to check for errors
2. If errors are found, analyze and fix them one by one
3. Re-run the linter to verify fixes
4. Repeat until all lint errors are resolved
5. Report final status

## Usage
```
/lint
```

## Implementation Strategy
- Uses `bun run lint` to detect issues
- Analyzes each error type and applies appropriate fixes:
  - Unused imports/variables: Remove them
  - Missing await: Add proper async handling
  - Type errors: Fix type annotations
  - Style issues: Apply formatting fixes
- Runs up to 5 iterations to prevent infinite loops
- Provides detailed progress reports

## Expected Behavior
- Automatically fixes common ESLint/TypeScript errors
- Maintains code functionality while improving quality
- Reports what was fixed in each iteration
- Warns if manual intervention is needed

## Example Output
```
🔍 Running lint check (iteration 1/5)...
Found 4 errors:
- Unused variable 'PortfolioServiceLive' in fund-structure-service.ts
- Missing await in use-fund-data.ts
- Triple slash reference in next-env.d.ts

✅ Fixed unused import in fund-structure-service.ts
✅ Added void operator for floating promise in use-fund-data.ts
⚠️  Cannot auto-fix triple slash reference (requires manual fix)

🔍 Running lint check (iteration 2/5)...
Found 1 error remaining...
```