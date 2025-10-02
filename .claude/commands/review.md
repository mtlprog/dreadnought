Perform comprehensive code review

Review checklist:

1. EFFECT-TS COMPLIANCE:
   - No async/await usage
   - All errors typed in Effect signatures
   - Proper pipe composition
   - Service layers implemented correctly

2. DESIGN SYSTEM:
   - Zero border-radius (except loaders)
   - Large, bold elements
   - High contrast colors
   - Monospace fonts for data

3. PROJECT STRUCTURE:
   - New features in /apps/ only
   - Packages not modified without tests
   - Proper imports (@dreadnought/*)

4. CODE QUALITY:
   - TypeScript strict mode compliance
   - No unused variables/imports
   - Proper error handling
   - Tests for new functionality

5. PERFORMANCE:
   - Effect.all with concurrency limits
   - Proper caching where needed
   - No blocking operations

6. SECURITY:
   - No secrets in code
   - Input validation with Schema
   - Safe Stellar operations

7. BUILD VERIFICATION (MANDATORY):
   - Run `bun run build` after review
   - Ensure build succeeds without errors
   - Report any TypeScript or ESLint errors
   - Verify all tests pass (if applicable)

Report issues with severity and suggested fixes.

IMPORTANT: After completing the review checklist, ALWAYS run `bun run build` to verify the build succeeds.
