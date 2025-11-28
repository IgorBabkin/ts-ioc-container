import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://igorbabkin.github.io',
  base: '/ts-ioc-container',
  integrations: [sitemap()],
});
