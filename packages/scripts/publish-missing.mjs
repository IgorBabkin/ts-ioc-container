#!/usr/bin/env node
// Publishes any non-private workspace package whose current `package.json`
// version is not yet on the registry, skipping versions that are already
// published.
//
// `monorepo-semantic-release package-manager publish` publishes every released
// package unconditionally and aborts on the first failure, so a release that
// fails partway through cannot be resumed: the already-published packages make
// the retry fail and the rest never publish. This script is the repair path —
// run it after a build to push only what is missing.
//
// Usage: node packages/scripts/publish-missing.mjs [--dry-run] [<package-dir>...]
// With no arguments every non-private workspace package is considered.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const readManifest = (dir) => JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));

// Only the `packages/*` shape this repo uses; enough to discover what to publish
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

function isPublished(name, version) {
  try {
    execFileSync('npm', ['view', `${name}@${version}`, 'version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targets = args.filter((arg) => arg !== '--dry-run');
const packageDirs = targets.length > 0 ? targets.map((dir) => path.resolve(dir)) : discoverPackageDirs();

const failures = [];
for (const dir of packageDirs) {
  const manifest = readManifest(dir);
  const relativeDir = path.relative(repoRoot, dir) || '.';

  if (isPublished(manifest.name, manifest.version)) {
    console.log(`SKIP  ${manifest.name}@${manifest.version} (${relativeDir}): already on the registry`);
    continue;
  }

  console.log(`${dryRun ? 'WOULD PUBLISH' : 'PUBLISH'} ${manifest.name}@${manifest.version} (${relativeDir})`);
  if (dryRun) continue;
  try {
    execFileSync('pnpm', ['publish', '--no-git-checks'], { cwd: dir, stdio: 'inherit' });
  } catch {
    failures.push(`${manifest.name}@${manifest.version} (${relativeDir})`);
  }
}

if (failures.length > 0) {
  console.error('\nFailed to publish:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
