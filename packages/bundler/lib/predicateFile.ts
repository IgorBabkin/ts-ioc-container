import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { TicConfigError } from './errors';
import type { FilterPredicate } from './utils';

const EXTENSIONS = ['cjs', 'js', 'mjs', 'ts', 'cts', 'mts'];

/** `tic.include` -> `tic.include.cjs`, `tic.include.js`, ... in lookup order. */
export const conventionalNames = (base: string): string[] => EXTENSIONS.map((ext) => `${base}.${ext}`);

/** The first conventional file for `base` that exists in `dir`, if any. */
export function findConventionalFile(dir: string, base: string): string | undefined {
  return conventionalNames(base)
    .map((name) => path.join(dir, name))
    .find((file) => existsSync(file));
}

/**
 * Loads a predicate file synchronously with `require` - `.cjs` / `.js`, ES modules
 * (Node 22.12+) and `.ts` (Node with type stripping). Its default export, or
 * `module.exports` itself, is the predicate. Like any `require`d module it is loaded
 * once per process, so a predicate that depends on the environment should read it
 * when called, not when loaded.
 *
 * @throws {TicConfigError} when the file is missing or does not export a function.
 */
export function loadPredicateFile<T extends FilterPredicate<never>>(file: string, typeName: string): T {
  if (!existsSync(file)) throw new TicConfigError(`predicate file not found: ${file}`);
  const loaded: unknown = createRequire(file)(file);
  const predicate = typeof loaded === 'function' ? loaded : (loaded as { default?: unknown } | undefined)?.default;
  if (typeof predicate !== 'function') {
    throw new TicConfigError(`${file} must export an ${typeName} function (default export or module.exports)`);
  }
  return predicate as T;
}
