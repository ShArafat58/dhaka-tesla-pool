// ESLint flat config shared by the whole monorepo.
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  // Generated and third-party output is never linted.
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/coverage/**"],
  },

  // Recommended rule sets for JavaScript and TypeScript.
  js.configs.recommended,
  tseslint.configs.recommended,

  // Project-wide rules.
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Unused code is an error; prefix with "_" when it is intentional.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Type-only imports are erased at build time and stay explicit.
      "@typescript-eslint/consistent-type-imports": "error",
      // No console noise: the API logs through a structured logger instead.
      "no-console": "error",
    },
  },

  // Must stay last: turns off rules that would fight with Prettier formatting.
  prettier,
);
