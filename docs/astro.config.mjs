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
    logLevel: "warn", // Reduce log verbosity
  },
});
