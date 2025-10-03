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
      "src/cli/**",
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
