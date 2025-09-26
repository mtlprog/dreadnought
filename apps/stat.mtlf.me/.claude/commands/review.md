# Code Review Command

This command performs a comprehensive code review after any changes.

## Review Checklist (MANDATORY)

### 1. Linting (CRITICAL) - **RUN FROM PROJECT ROOT**
```bash
# ALWAYS FROM DREADNOUGHT ROOT DIRECTORY:
cd /Users/xdefrag/Code/panarchynow/dreadnought
bun run lint --fix
```
- MUST run from project root (not from apps/stat.mtlf.me)
- Root eslint.config.mjs has Effect-TS rules and proper monorepo setup
- MUST run without errors
- Auto-fix all fixable issues
- Manually review remaining issues

### 2. Type Checking (CRITICAL) - **RUN FROM PROJECT ROOT**
```bash
# ALWAYS FROM DREADNOUGHT ROOT DIRECTORY:
cd /Users/xdefrag/Code/panarchynow/dreadnought
bun run typecheck
```
- MUST pass without TypeScript errors across ALL apps
- Fix all type issues before proceeding

### 3. Tests (CRITICAL) - **RUN FROM PROJECT ROOT**
```bash
# ALWAYS FROM DREADNOUGHT ROOT DIRECTORY:
cd /Users/xdefrag/Code/panarchynow/dreadnought
bun test
```
- MUST run without failures across ALL packages and apps
- All existing tests must pass
- New functionality should have tests

### 4. Build Verification (REQUIRED) - **RUN FROM PROJECT ROOT**
```bash
# ALWAYS FROM DREADNOUGHT ROOT DIRECTORY:
cd /Users/xdefrag/Code/panarchynow/dreadnought
bun run build
```
- Verify production build works for ALL apps
- Check for build warnings across monorepo

## Review Standards

**NO REVIEW IS COMPLETE WITHOUT:**
1. ✅ Linter passing (`bun run lint --fix` FROM ROOT)
2. ✅ TypeScript checking passing (`bun run typecheck` FROM ROOT)
3. ✅ Tests passing (`bun test` FROM ROOT)
4. ✅ Build verification (`bun run build` FROM ROOT)

## 🚨 CRITICAL RULE: ZERO TOLERANCE FOR FAILURES

**IF LINTER OR TESTS FAIL - CODE IS NOT READY FOR COMMIT**

- ❌ **Linter failures**: Must be fixed regardless of whether they relate to your changes
- ❌ **Test failures**: Must be fixed regardless of whether they relate to your changes
- ❌ **TypeScript errors**: Must be fixed regardless of whether they relate to your changes
- ❌ **Build failures**: Must be fixed regardless of whether they relate to your changes

### Why Fix Unrelated Issues?

1. **Monorepo Health**: One broken build affects everyone
2. **CI/CD Pipeline**: Failing checks block deployments
3. **Code Quality**: Accumulated technical debt hurts productivity
4. **Team Standards**: Maintains high engineering standards

### What This Means:

- If you touch ANY file in the monorepo and linter fails on OTHER files - fix them
- If existing tests are broken - fix them before your changes
- If TypeScript errors exist anywhere - address them
- **No exceptions, no excuses, no "it's not my code"**

**REMEMBER: You are responsible for the ENTIRE codebase health, not just your changes!**

## If Tests Are Not Configured

If `bun test` fails or tests are not set up:
1. Configure Bun test framework
2. Add basic test structure
3. Write tests for new functionality
4. Ensure ManagedRuntime pattern is followed

## Common Issues to Check

- [ ] No unused imports (TypeScript will catch these)
- [ ] No console.log statements (use Effect.log)
- [ ] Proper Error handling with Effect
- [ ] Effect-TS patterns followed correctly
- [ ] No async/await usage (Effect only)
- [ ] Proper resource disposal in tests

## Review Process

1. **Pre-commit**: Always run this review before any commit
2. **Post-changes**: After any code modifications
3. **CI Integration**: These checks should be part of CI/CD

## Directory Navigation

**CRITICAL**: ALL commands must be run from monorepo root:
- **ALL COMMANDS**: ALWAYS from project root `/Users/xdefrag/Code/panarchynow/dreadnought`
- **Monorepo-wide operations**: `bun run lint`, `bun test`, `bun run build`, `bun run typecheck`
- **NO app-specific navigation**: Commands handle multiple apps automatically

## 🔄 Action Plan When Checks Fail

### Step 1: Identify the Problem
```bash
cd /Users/xdefrag/Code/panarchynow/dreadnought
bun run lint --fix  # See what fails
```

### Step 2: Fix ALL Issues
- **Don't cherry-pick**: Fix everything that's broken
- **Don't ignore**: Every error must be addressed
- **Don't defer**: Fix now, not later

### Step 3: Re-run ALL Checks
```bash
# Run full verification cycle FROM ROOT
cd /Users/xdefrag/Code/panarchynow/dreadnought
bun run lint --fix
bun run typecheck
bun test
bun run build
```

### Step 4: Only Then Proceed
- All checks green ✅ → Ready for commit
- Any check red ❌ → Back to Step 2

**REMEMBER: You own the ENTIRE codebase health, not just your changes!**