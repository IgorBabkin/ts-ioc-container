#!/usr/bin/env node
// Shared build pipeline for a package's cjm/esm/typings output, invoked from
// each package's own package.json (cwd = that package's directory, so the
// outDir and tsconfig.production.json below resolve relative to the caller).
//
// Usage: node <path-to-this-file> <cjm|esm|types>

import { rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postbuildExtensions = path.join(__dirname, 'postbuild-extensions.mjs');

const FORMATS = {
  cjm: { outDir: 'cjm', tscArgs: ['--module', 'CommonJS'] },
  esm: { outDir: 'esm', tscArgs: [], postbuildArgs: ['--esm'] },
  types: { outDir: 'typings', tscArgs: ['--emitDeclarationOnly', '--declaration'], postbuildArgs: [] },
};

const [, , format] = process.argv;
const config = FORMATS[format];
if (!config) {
  console.error(`Usage: node build.mjs <${Object.keys(FORMATS).join('|')}>`);
  process.exit(1);
}

rmSync(config.outDir, { recursive: true, force: true });
execFileSync('tsc', ['-p', 'tsconfig.production.json', '--outDir', config.outDir, ...config.tscArgs], {
  stdio: 'inherit',
});

if (config.postbuildArgs) {
  execFileSync('node', [postbuildExtensions, config.outDir, ...config.postbuildArgs], { stdio: 'inherit' });
}
