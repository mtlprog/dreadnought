Initialize new app: $ARGUMENTS

Create new app in monorepo:

1. Create directory: /apps/$ARGUMENTS
2. Initialize Next.js app with TypeScript
3. Configure for monorepo:
   ```json
   {
     "name": "@dreadnought-apps/$ARGUMENTS",
     "dependencies": {
       "@dreadnought/ui": "workspace:*",
       "@dreadnought/config": "workspace:*",
       "@dreadnought/utils": "workspace:*",
       "effect": "latest"
     }
   }
    ```
4. Setup Effect runtime:
    ```typescript
    // lib/layers.ts
    import { Layer } from "effect"

    export const AppLayers = Layer.mergeAll(
      ConfigLayer,
      // Add other layers
    )
    ```

5. Create layout with retrofuturistic design
6. Setup Tailwind with custom colors
7. Add test setup
8. Configure build scripts

Remember: Keep app thin, use packages for logic!
