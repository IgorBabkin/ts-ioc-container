import eslintPluginAstro from "eslint-plugin-astro";

export default [
  // Apply recommended config from eslint-plugin-astro
  // This automatically configures the parser and rules for .astro files
  ...eslintPluginAstro.configs.recommended,
  {
    ignores: ["dist/**", ".astro/**"],
  },
];
