Analyze the apps/ directory for duplicate and similar code patterns that could be refactored into shared libraries in packages/.

Follow these steps:
1. Scan all files in the apps/ directory
2. Identify common patterns, utilities, and components that appear in multiple apps
3. Group similar code by functionality (e.g., API clients, validation, UI components)
4. For each group of duplicates:
   - Estimate the amount of duplication (lines of code, number of occurrences)
   - Suggest a name and location for the shared library in packages/
   - Provide a refactoring plan with specific steps
5. Prioritize refactoring opportunities by:
   - Impact (how much code can be deduplicated)
   - Complexity (how easy it is to extract)
   - Stability (how likely the code is to change)

Output a detailed report with:
- Summary of found duplications
- Proposed library structure in packages/
- Step-by-step refactoring plan
- Estimated time and effort for each refactoring

Use $ARGUMENTS to focus on specific file types or patterns if provided.
