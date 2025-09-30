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

4. **CRITICAL: Setup configuration inheritance**

   a. Create `tsconfig.json` that extends root config:
   ```json
   {
     "extends": "../../tsconfig.json",
     "compilerOptions": {
       "jsx": "preserve",
       "incremental": true,
       "plugins": [{ "name": "next" }],
       "paths": {
         "@/*": ["./src/*"]
       }
     },
     "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
     "exclude": ["node_modules"]
   }
   ```

   b. Create `eslint.config.mjs` that extends root config:
   ```javascript
   import rootConfig from "../../eslint.config.mjs";
   import { dirname } from "path";
   import { fileURLToPath } from "url";
   import { FlatCompat } from "@eslint/eslintrc";

   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);

   const compat = new FlatCompat({
     baseDirectory: __dirname,
   });

   const eslintConfig = [
     ...rootConfig,
     ...compat.extends("next/core-web-vitals", "next/typescript"),
     {
       ignores: [
         "node_modules/**",
         ".next/**",
         "out/**",
         "build/**",
         "next-env.d.ts",
       ],
     },
     {
       // Disable strict formatting rules for React/Next.js components
       rules: {
         "@effect/dprint": "off",
       },
     },
   ];

   export default eslintConfig;
   ```

   c. Add required devDependencies to package.json:
   ```json
   {
     "devDependencies": {
       "@eslint/eslintrc": "^3",
       "eslint": "^9",
       "eslint-config-next": "15.1.4"
     }
   }
   ```

   **IMPORTANT**: This setup inherits all Effect-TS rules from monorepo root while adding Next.js specific rules.

5. Setup Effect runtime:
    ```typescript
    // lib/layers.ts
    import { Layer } from "effect"

    export const AppLayers = Layer.mergeAll(
      ConfigLayer,
      // Add other layers
    )
    ```

6. Create layout with retrofuturistic design
7. Setup Tailwind with custom colors
8. Add test setup
9. Configure build scripts

Remember: Keep app thin, use packages for logic!
