import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://igorbabkin.github.io",
  base: "/ts-ioc-container",
  integrations: [sitemap(), react()],
  vite: {
    build: {
      // Use esnext to avoid ES2024 warnings
      target: "esnext",
    },
    logLevel: "warn", // Reduce log verbosity
  },
});
