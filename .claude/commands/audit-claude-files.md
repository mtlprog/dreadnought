# Audit and Optimize CLAUDE.md Files

Perform a comprehensive audit of all CLAUDE.md and CLAUDE.local.md files in the project hierarchy to ensure they follow best practices and maintain optimal size and structure.

## Instructions

### Phase 1: Discovery and Analysis
1. **Scan the entire project** for all CLAUDE.md and CLAUDE.local.md files
2. **Calculate token count** for each file (approximate using ~0.75 words per token)
3. **Create hierarchy map** showing the inheritance chain from root to subdirectories

### Phase 2: Size Optimization

#### Recommended Limits:
- **CLAUDE.md files**: Keep under 500-750 tokens (~375-560 words) for optimal performance
- **Documentation guides**: Maximum 1000-1500 tokens (~750-1125 words) per file
- **Critical rule**: Total context from all loaded CLAUDE.md files should not exceed 2000-3000 tokens

#### Actions for oversized files:
1. **If CLAUDE.md > 750 tokens**:
   - Extract detailed explanations to `./docs/guides/` relative to the file
   - Keep only essential rules and references in CLAUDE.md
   - Add links to extracted guides: `See ./docs/guides/[topic].md for details`
   
2. **If guide files > 1500 tokens**:
   - Split into logical sub-guides by topic
   - Create an index file linking to sub-guides
   - Ensure each sub-guide is self-contained and focused

### Phase 3: Duplicate Detection

1. **Identify duplicate rules** across the hierarchy:
   - Compare all CLAUDE.md files for similar instructions
   - Flag rules that appear in multiple files with >70% similarity
   
2. **For each duplicate found**:
   - If the rule applies to multiple subdirectories → ASK USER:
    ```
     Found duplicate rule: "[rule summary]"
     Appears in: [list of files]
 
     Options:
     1. Move to parent CLAUDE.md at [suggested location]
     2. Keep as-is (if context-specific variations exist)
     3. Consolidate and create specialized versions
 
     Which approach would you prefer?
    ```

3. **Merge strategy** (if user chooses consolidation):
   - Read all versions of the duplicate content
   - Create a unified, clear version that captures all important aspects
   - Place in the lowest common parent directory
   - Remove from child directories unless specialization is needed

### Phase 4: Structure Optimization

Apply these best practices:

1. **Content Organization**:
```markdown
   # Project: [Name]
   
   ## Critical Rules (MUST follow)
   - [Keep to 3-5 most important rules]
   
   ## Development
   - Build: `command`
   - Test: `command`
   - Deploy: `command`
   
   ## Architecture
   - [Brief patterns, link to ./docs/guides/architecture.md for details]
   
   ## See Also
   - ./docs/guides/[specific-topics].md
