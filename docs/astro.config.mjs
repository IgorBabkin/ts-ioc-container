import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://igorbabkin.github.io",
  base: "/ts-ioc-container",
  integrations: [sitemap()],
  vite: {
    build: {
      // Use esnext to avoid ES2024 warnings
      target: "esnext",
    },
    esbuild: {
      // Explicitly set esbuild target to avoid ES2024 warnings
      target: "es2022",
      // Override tsconfig to prevent reading ES2024 from root tsconfig.json
      tsconfigRaw: {
        compilerOptions: {
          target: "ES2022",
        },
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        // Set target for dependency optimization to avoid ES2024 warnings
        target: "es2022",
        // Override tsconfig to prevent reading ES2024 from root tsconfig.json
        tsconfigRaw: {
          compilerOptions: {
            target: "ES2022",
          },
        },
      },
    },
    logLevel: "warn", // Reduce log verbosity
    css: {
      preprocessorOptions: {
        scss: {
          // Silence legacy JS API deprecation warnings
          // See: https://sass-lang.com/documentation/breaking-changes/legacy-js-api/
          silenceDeprecations: ["legacy-js-api"],
        },
        sass: {
          // Silence legacy JS API deprecation warnings
          // See: https://sass-lang.com/documentation/breaking-changes/legacy-js-api/
          silenceDeprecations: ["legacy-js-api"],
        },
      },
    },
  },
});
