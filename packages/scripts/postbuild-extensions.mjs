#!/usr/bin/env node
// Post-processes a build output directory so it is resolvable under Node's
// native ESM/`node16` rules: relative specifiers get an explicit `.js`
// extension. When run against the ESM output it also drops a
// `package.json` marking the folder as ESM (`"type": "module"`).
//
// Source stays extensionless (moduleResolution: Node); only the emitted
// artifact is rewritten, so tests and type-checking are unaffected.
//
// Usage: node scripts/postbuild-extensions.mjs <dir> [--esm]

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const [, , targetArg, ...flags] = process.argv;
if (!targetArg) {
  console.error('Usage: node scripts/postbuild-extensions.mjs <dir> [--esm]');
  process.exit(1);
}
const targetDir = resolve(targetArg);
const isEsm = flags.includes('--esm');

// Rewrites `from '<relative>'` and `import('<relative>')` specifiers that do
// not already carry an extension. Every relative specifier in this codebase
// points at a sibling file (no directory/index imports), so a flat `.js`
// suffix is correct.
const rewrite = (code) =>
  code
    .replace(/(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g, (m, pre, spec, post) =>
      /\.[cm]?js$/.test(spec) ? m : `${pre}${spec}.js${post}`,
    )
    .replace(/(import\(\s*['"])(\.\.?\/[^'"]+?)(['"]\s*\))/g, (m, pre, spec, post) =>
      /\.[cm]?js$/.test(spec) ? m : `${pre}${spec}.js${post}`,
    );

const walk = async (dir) => {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map(async (entry) => {
      const full = join(dir, entry);
      const info = await stat(full);
      if (info.isDirectory()) return walk(full);
      if (/\.(js|d\.ts)$/.test(entry)) {
        const original = await readFile(full, 'utf8');
        const updated = rewrite(original);
        if (updated !== original) await writeFile(full, updated);
      }
    }),
  );
};

await walk(targetDir);

if (isEsm) {
  await writeFile(join(targetDir, 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`);
}
