import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import next from "@next/eslint-plugin-next";
import react from "@eslint-react/eslint-plugin";
import hooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y-x";
import { importX } from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";
import globals from "globals";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "dist/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "output/**",
    "next-env.d.ts",
    "public/**",
  ]),
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "import-x": importX },
    rules: { "import-x/no-anonymous-default-export": "error" },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      react.configs["recommended-typescript"],
      react.configs["disable-experimental"],
      hooks.configs.flat.recommended,
    ],
    plugins: { "@next/next": next, "jsx-a11y-x": a11y },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
      ...a11y.configs.recommended.rules,
      "@eslint-react/no-missing-component-display-name": "error",
      // Keep Meta's Hooks and Compiler checks authoritative instead of reporting duplicates.
      ...Object.fromEntries(
        Object.keys(hooks.configs.flat.recommended.rules)
          .map((name) => [name.replace("react-hooks/", "@eslint-react/"), "off"])
          .filter(([name]) => name.slice("@eslint-react/".length) in react.rules),
      ),
    },
    settings: { "jsx-a11y-x": { components: { Image: "img" } } },
  },
  prettier,
]);
