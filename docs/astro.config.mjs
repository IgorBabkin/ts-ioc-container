import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import spotlight from "@spotlightjs/astro";
import sentry from "@sentry/astro";
import mdx from "@astrojs/mdx";
import remarkHeadingId from "remark-heading-id";

// https://astro.build/config
export default defineConfig({
  site: "https://igorbabkin.github.io",
  base: "/ts-ioc-container",
  integrations: [
    mdx({
      remarkPlugins: [remarkHeadingId],
    }),
    sitemap(),
    sentry({
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
    optimizeDeps: {
      esbuildOptions: {
        target: "es2022",
      },
    },
    esbuild: {
      target: "es2022",
    },
  },
});
