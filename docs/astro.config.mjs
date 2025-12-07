import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import spotlight from "@spotlightjs/astro";
import sentry from "@sentry/astro";

// https://astro.build/config
export default defineConfig({
  site: "https://igorbabkin.github.io",
  base: "/ts-ioc-container",
  integrations: [
    sitemap(),
    sentry({
      dsn: "", // Leave empty for local development only
      sourceMapsUploadOptions: {
        enabled: false, // Disable for local dev
      },
    }),
    spotlight(),
  ],
  vite: {
    logLevel: "warn",
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ["legacy-js-api"],
        },
      },
    },
    build: {
      target: "es2022",
    },
  },
});
