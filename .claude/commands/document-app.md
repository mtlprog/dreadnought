---
description: Generate comprehensive CLAUDE.md documentation for a dApp in /apps
---

Generate comprehensive documentation for the specified app following the Dreadnought documentation standards.

## Instructions

**Target**: apps/{APP_NAME}/

**User will provide**: The app folder name (e.g., "stat.mtlf.me", "crowd.mtla.me")

## Documentation Tasks

### Phase 1: Analysis (MANDATORY)

Before writing ANY documentation, you MUST:

1. **Analyze project structure**:
   - Read package.json for dependencies and scripts
   - List all source files (src/**/*.ts, src/**/*.tsx)
   - Identify key directories (components, services, lib, hooks, etc.)

2. **Review services and architecture**:
   - Identify all Effect-TS services and their interfaces
   - Map out service dependencies and Layer composition
   - Document error types and handling patterns
   - Review API routes (if any)

3. **Review UI components**:
   - Identify main page components
   - Document key UI patterns and design elements
   - Note any custom hooks or utilities

4. **Check existing documentation**:
   - Look for README.md, existing CLAUDE.md, or other docs
   - Check for related documentation in /docs

### Phase 2: Documentation Generation

Create the following files:

1. **apps/{APP_NAME}/CLAUDE.md** (main documentation):
   - Overview (Purpose, Key Features, Tech Stack)
   - **Documentation Maintenance section** (⚠️ IMPORTANT reminder)
   - Project Structure (directory tree)
   - Core Services (with Effect-TS patterns)
   - UI Components (key components and patterns)
   - Configuration (environment variables, network settings)
   - CLI Tools (if applicable)
   - Error Types (all custom error classes)
   - Testing (test files and patterns)
   - Development Workflow (commands, environment setup)
   - Common Issues (troubleshooting)
   - Future Enhancements (TODOs)
   - Related Documentation (links to guides and parent docs)

2. **apps/{APP_NAME}/docs/guides/** (if CLAUDE.md exceeds 200 lines):
   - Extract complex topics into separate guide files
   - Examples: service-specific guides, algorithm explanations, integration patterns
   - Update CLAUDE.md with links: "📘 Full Guide: See `docs/guides/[topic].md`"

### Documentation Standards

**Follow these requirements**:

1. **Language**: English (for technical documentation)

2. **Structure**:
   - Start with Documentation Maintenance warning
   - Keep CLAUDE.md under 200 lines if possible
   - Extract detailed sections to separate guides
   - Use clear hierarchical headings (##, ###)

3. **Code Examples**:
   - Use Effect-TS patterns from /CLAUDE.md
   - Show proper service composition
   - Include error handling examples
   - Demonstrate ManagedRuntime testing patterns

4. **Cross-references**:
   - Link to /CLAUDE.md for monorepo guidelines
   - Link to /packages/README.md for reusable packages
   - Link to /docs/guides/* for design system, testing, etc.
   - Link to detailed app-specific guides

5. **Don't Duplicate**:
   - Don't repeat information from /CLAUDE.md
   - Reference parent documentation instead
   - Focus on app-specific implementation details

6. **Service Documentation Pattern**:
   ```markdown
   ### ServiceName (src/path/to/service.ts)

   Brief description.

   ```typescript
   interface ServiceName {
     readonly method: (...) => Effect.Effect<Result, Error>
   }
   ```

   **Key Features**:
   - Feature 1
   - Feature 2

   **Implementation Notes**:
   - Note 1
   - Note 2

   **Example Usage**:
   ```typescript
   // Example code
   ```

   **📘 Full Guide**: See `docs/guides/service-name.md` (if complex)
   ```

7. **File References**:
   - Always include file paths: `src/lib/services/example.ts:42`
   - Use exact line numbers when referencing specific code
   - Link to actual files, not hypothetical examples

### Quality Checklist

Before finishing, verify:

- ✅ Documentation Maintenance section is prominent
- ✅ All services are documented with interfaces
- ✅ Error types are listed with their schemas
- ✅ CLI commands are documented (if applicable)
- ✅ Environment variables are documented
- ✅ Testing patterns are shown
- ✅ Common issues have solutions
- ✅ Links to parent docs are correct
- ✅ No duplication of /CLAUDE.md content
- ✅ CLAUDE.md is under 200 lines OR complex topics extracted to guides
- ✅ All guide files are referenced from CLAUDE.md

### Output Format

After analysis, create:

1. `apps/{APP_NAME}/CLAUDE.md`
2. `apps/{APP_NAME}/docs/guides/[topic].md` (if needed)

**Notify user**:
```
Created documentation for apps/{APP_NAME}/:
- CLAUDE.md ({X} lines)
- docs/guides/[topic1].md (if created)
- docs/guides/[topic2].md (if created)

Documentation follows Dreadnought standards and includes:
✓ Documentation maintenance reminder
✓ Architecture overview
✓ Service interfaces
✓ Configuration guide
✓ Development workflow
✓ Links to detailed guides (if needed)
```

## Example Usage

**User**: `/document-app stat.mtlf.me`

**You**: [Analyze apps/stat.mtlf.me] → [Generate CLAUDE.md] → [Create guides if >200 lines] → [Report completion]

## Important Notes

- **Always** analyze before writing
- **Always** include Documentation Maintenance section
- **Never** duplicate /CLAUDE.md content
- **Always** use TodoWrite to track progress
- **Always** extract complex topics to separate guides if CLAUDE.md > 200 lines
- **Always** use Effect-TS patterns from /CLAUDE.md
- **Always** include file paths and line numbers for references
