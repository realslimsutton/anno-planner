import * as path from "node:path";
import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";
import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const restrictEnvAccess = defineConfig(
  { ignores: ["**/env.ts", "src/paraglide/**"] },
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "Use `import { env } from '@/env'` instead to ensure validated types.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          name: "process",
          importNames: ["env"],
          message:
            "Use `import { env } from '@/env'` instead to ensure validated types.",
        },
      ],
    },
  },
);

/** @type {Awaited<import('typescript-eslint').Config>} */
export default defineConfig(
  includeIgnoreFile(path.join(import.meta.dirname, "./.gitignore")),
  {
    ignores: ["**/*.config.*"],
  },
  pluginQuery.configs["flat/recommended"],
  pluginRouter.configs["flat/recommended"],
  reactHooks.configs.flat["recommended-latest"],
  restrictEnvAccess,
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      import: importPlugin,
      react: reactPlugin,
    },
    rules: {
      ...reactPlugin.configs["jsx-runtime"]?.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-misused-promises": [
        2,
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        {
          allowConstantLoopConditions: true,
        },
      ],
      "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/only-throw-error": ["off"],
    },
    settings: {
      react: { version: "detect" },
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    languageOptions: { parserOptions: { projectService: true } },
  },
);
