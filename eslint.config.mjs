import js from "@eslint/js"
import tseslint from "@typescript-eslint/eslint-plugin"
import tsparser from "@typescript-eslint/parser"
import effectPlugin from "@effect/eslint-plugin"

export default [
  // Ignore patterns first
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".next/**",
      "coverage/**",
      "*.min.js",
      "bun.lock",
      "eslint.config.mjs",
      "**/.next/**",
      "**/node_modules/**",
    ],
  },

  // Base configuration for all files
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./tsconfig.json", "./apps/*/tsconfig.json"],
      },
      globals: {
        // Node.js globals
        process: "readonly",
        Buffer: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        
        // Browser globals
        document: "readonly",
        window: "readonly",
        fetch: "readonly",
        
        // HTML element types
        HTMLElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLParagraphElement: "readonly",
        HTMLHeadingElement: "readonly",
        
        // React types
        React: "readonly",
        JSX: "readonly",
      },
    },
  },

  // Base JavaScript rules
  js.configs.recommended,

  // TypeScript rules
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslint,
      "@effect": effectPlugin,
    },
    rules: {
      // TypeScript strict rules
      ...tseslint.configs.strict.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/prefer-readonly-parameter-types": ["error", {
        "checkParameterProperties": false,
        "ignoreInferredTypes": true,
        "treatMethodsAsReadonly": true
      }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",

      // Effect-TS specific rules
      "@effect/dprint": "error",
      "@effect/no-import-from-barrel-package": "error",

      // Additional TypeScript rules beneficial for Effect-TS
      "@typescript-eslint/consistent-type-imports": ["error", { 
        "prefer": "type-imports",
        "disallowTypeAnnotations": false 
      }],
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/strict-boolean-expressions": ["error", {
        "allowString": false,
        "allowNumber": false,
        "allowNullableObject": false,
        "allowNullableBoolean": false,
        "allowNullableString": false,
        "allowNullableNumber": false,
        "allowAny": false
      }],
      "@typescript-eslint/switch-exhaustiveness-check": "error",

      // General code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
      "prefer-spread": "error",
      "prefer-rest-params": "error",
      "prefer-arrow-callback": "error",
      "arrow-spacing": "error",
      "no-duplicate-imports": "error",
    },
  },

  // Configuration for CLI files
  {
    files: ["**/cli/**/*.{ts,tsx}", "**/src/cli/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/prefer-readonly-parameter-types": "off",
      "no-console": ["warn", { allow: ["warn", "error", "table"] }],
    },
  },

  // Configuration for UI components and React patterns
  {
    files: ["**/components/**/*.{ts,tsx}", "**/app/**/*.{ts,tsx}", "**/lib/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/prefer-readonly-parameter-types": "off",
    },
  },

  // Configuration for test files
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/test/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/prefer-readonly-parameter-types": "off",
      "no-console": "off",
    },
  },

  // Configuration for configuration files
  {
    files: ["*.config.{js,mjs,ts}", "*.config.*.{js,mjs,ts}"],
    languageOptions: {
      parser: null,
      parserOptions: {}
    },
    rules: {
      "@typescript-eslint/prefer-readonly-parameter-types": "off",
      // Effect rules are not applicable for config files
    },
  },


]
