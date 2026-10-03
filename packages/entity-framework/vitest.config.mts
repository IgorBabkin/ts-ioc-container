import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { decoratorMetadata: true, legacyDecorator: true },
        target: 'es2022',
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/?(*.)+(spec|test).+(ts)'],
    coverage: {
      provider: 'v8',
      exclude: ['node_modules/**', '__tests__/**', 'cjm/**', 'esm/**', 'typings/**'],
    },
  },
});
