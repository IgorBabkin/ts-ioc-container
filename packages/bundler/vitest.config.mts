import path from 'node:path';
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
  resolve: {
    // Mirrors the `@app/*` paths alias of the fixture project, so the e2e spec can
    // import the module `tic build` generated for it exactly as that project would.
    alias: [{ find: /^@app\/(.*)$/, replacement: path.resolve(__dirname, '__tests__/fixtures/app/src/$1') }],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/?(*.)+(spec|test).ts'],
    coverage: {
      provider: 'v8',
      exclude: ['node_modules/**', '__tests__/**', 'cjm/**', 'typings/**'],
    },
  },
});
