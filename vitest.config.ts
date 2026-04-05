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
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/?(*.)+(spec|test).+(ts)'],
    coverage: {
      provider: 'v8',
      exclude: [
        'node_modules/**',
        '__tests__/**',
        'lib/container/AutoMockedContainer.ts',
        'cjm/**',
        'esm/**',
        'typings/**',
        'scripts/**',
      ],
    },
  },
});
