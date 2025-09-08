Analyze existing packages for: $ARGUMENTS

Perform comprehensive package analysis:

1. Read /packages/README.md for overview
2. For each relevant package:
   - Identify main functionality
   - List exported services and components
   - Note Effect layers available
   - Check for relevant utilities
   
3. Create reuse plan:
   - Which packages can be used as-is
   - What needs to be extended
   - Any missing functionality

Output format:
## Package Analysis
### @dreadnought/[package-name]
- **Purpose**: [description]
- **Relevant exports**: [list]
- **Reuse potential**: [high/medium/low]
- **Usage example**: [code snippet]

Focus on maximizing code reuse over creating new implementations.
