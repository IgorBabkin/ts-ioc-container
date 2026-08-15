import eslintPluginAstro from "eslint-plugin-astro";
import tsParser from "@typescript-eslint/parser";

export default [
  // Apply recommended config from eslint-plugin-astro
  // This automatically configures the parser and rules for .astro files
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
    },
  },
  {
    ignores: ["dist/**", ".astro/**"],
  },
];
