import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import betterTailwind from "eslint-plugin-better-tailwindcss";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

const FEATURE_SLICES = ["settings", "onboarding", "feedback", "changelog", "commands", "palette"];

const ROOT = dirname(fileURLToPath(import.meta.url));

const WIDGET_SLICES = readdirSync(join(ROOT, "src/widgets"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "core")
  .map((entry) => entry.name);

function boundaryRule(ownSlice) {
  return [
    "error",
    {
      patterns: [
        {
          group: WIDGET_SLICES.filter((slice) => slice !== ownSlice).map(
            (slice) => `@/widgets/${slice}/*`,
          ),
          message: "Import a widget through its index.ts, not its internals (PROJECT_RULES §3).",
        },
        {
          group: FEATURE_SLICES.filter((slice) => slice !== ownSlice).map(
            (slice) => `@/${slice}/*`,
          ),
          message: "Import a feature through its index.ts, not its internals (PROJECT_RULES §3).",
        },
      ],
    },
  ];
}

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "no-empty": "error",
      "no-restricted-imports": boundaryRule(null),
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'TSAsExpression:not([typeAnnotation.type="TSUnknownKeyword"]) > AwaitExpression > CallExpression > MemberExpression[property.name="json"]',
          message:
            "Validate the response instead of casting it — use parseResponse() with a zod schema (PROJECT_RULES §10).",
        },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "better-tailwindcss": betterTailwind },
    settings: {
      "better-tailwindcss": { entryPoint: "src/styles/globals.css" },
    },
    rules: {
      "better-tailwindcss/enforce-consistent-line-wrapping": [
        "error",
        { printWidth: 100, preferSingleLine: true, strictness: "loose" },
      ],
    },
  },
  ...[...FEATURE_SLICES, ...WIDGET_SLICES].map((slice) => ({
    files: [
      FEATURE_SLICES.includes(slice)
        ? `src/${slice}/**/*.{ts,tsx}`
        : `src/widgets/${slice}/**/*.{ts,tsx}`,
    ],
    rules: { "no-restricted-imports": boundaryRule(slice) },
  })),
  {
    files: ["**/*.test.{ts,tsx}", "src/test/**/*.ts"],
    languageOptions: {
      globals: globals.vitest,
    },
  },
  {
    files: ["vite.config.ts", "eslint.config.js", "scripts/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
);
