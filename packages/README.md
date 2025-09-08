# Packages

This directory contains reusable packages for the Dreadnought monorepo.

## Package Structure

Each package follows the pattern:
```
packages/
├── package-name/
│   ├── package.json
│   ├── src/
│   │   └── index.ts
│   └── README.md
```

## Available Packages

*No packages created yet. All development is currently in `/apps/crowd.mtla.me/`*

## Creating New Packages

Only create packages when:
1. Code is proven in an app
2. Reuse is needed across multiple apps
3. Explicit request from development team

Follow the naming convention: `@dreadnought/package-name`