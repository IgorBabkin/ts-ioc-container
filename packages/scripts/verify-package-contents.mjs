#!/usr/bin/env node
// Fails the release if a publishable package's tarball would be missing the
// build output its package.json `files` field promises.
//
// `pnpm publish` packs whatever is on disk and reports success even when every
// `files` glob matches nothing — that is how ts-ioc-container@56.1.0 reached
// npm containing only package.json, README.md and LICENSE. Run this between
// restoring the build artifacts and publishing so a broken tarball fails the
// pipeline instead of the registry.
//
// Usage: node packages/scripts/verify-package-contents.mjs [<package-dir>...]
// With no arguments every non-private workspace package is checked.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const readManifest = (dir) => JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));

// Only the `packages/*` shape this repo uses; enough to discover what to check
// without pulling in a glob dependency.
function discoverPackageDirs() {
  const { workspaces = [] } = readManifest(repoRoot);
  return workspaces
    .filter((pattern) => pattern.endsWith('/*'))
    .flatMap((pattern) => {
      const parent = path.join(repoRoot, pattern.slice(0, -2));
      return readdirSync(parent, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(parent, entry.name));
    })
    .filter((dir) => !readManifest(dir).private);
}

// `cjm/**/*` -> `cjm`, `typings/index.d.ts` -> `typings/index.d.ts`: the leading
// glob-free part of the entry, which a packed path must start with for the entry
// to have matched anything.
function literalPrefix(entry) {
  const segments = [];
  for (const segment of entry.replace(/^\.\//, '').split('/')) {
    if (/[*?[\]{}!]/.test(segment)) break;
    segments.push(segment);
  }
  return segments.join('/');
}

function packedPaths(dir) {
  const output = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return JSON.parse(output).flatMap((tarball) => tarball.files.map((file) => file.path));
}

const targets = process.argv.slice(2);
const packageDirs = targets.length > 0 ? targets.map((dir) => path.resolve(dir)) : discoverPackageDirs();

const failures = [];
for (const dir of packageDirs) {
  const manifest = readManifest(dir);
  const relativeDir = path.relative(repoRoot, dir) || '.';
  const entries = manifest.files ?? [];
  if (entries.length === 0) {
    console.log(`SKIP  ${manifest.name} (${relativeDir}): no "files" field`);
    continue;
  }

  const paths = packedPaths(dir);
  const unmatched = entries.filter((entry) => {
    const prefix = literalPrefix(entry);
    if (prefix === '') return false; // a fully-globbed entry we cannot check literally
    return !paths.some((packed) => packed === prefix || packed.startsWith(`${prefix}/`));
  });

  if (unmatched.length > 0) {
    failures.push(`${manifest.name} (${relativeDir}): "files" entries matched nothing: ${unmatched.join(', ')}`);
    continue;
  }
  console.log(`OK    ${manifest.name} (${relativeDir}): ${paths.length} files`);
}

if (failures.length > 0) {
  console.error('\nRefusing to publish — build output is missing from the package tarball:');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nThe build runs in a separate job: check that the build-artifacts action');
  console.error('restored packages/<pkg>/{cjm,esm,typings} before this step.');
  process.exit(1);
}
