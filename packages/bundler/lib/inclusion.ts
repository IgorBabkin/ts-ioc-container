import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { TicConfigError } from './errors';

/** What an {@link InclusionPredicate} decides on. */
export interface InclusionContext {
  /** The file's path relative to the config file, `/`-separated: `src/services/Logger.ts`. */
  filename: string;
}

/**
 * Decides whether a scanned file takes part in code generation. A file takes
 * part only when it matches no `exclude` glob and the predicate returns `true`.
 *
 * @example
 * // tic.include.ts, next to tic.config.json - picked up by convention
 * const include: InclusionPredicate = ({ filename }) => !filename.includes('/legacy/');
 * export default include;
 */
export type InclusionPredicate = (context: InclusionContext) => boolean;

/**
 * An {@link InclusionPredicate} over a file's tags, the dot-separated parts of its name between
 * the base name and the extension. Wrap it with {@link byTags} to use it anywhere an
 * `InclusionPredicate` goes.
 *
 * @example
 * // StripeGateway.production.ts joins production only; Shared.ts joins every environment
 * const ENVS = ['development', 'production', 'test'];
 * export default byTags((tags) => tags.filter((t) => ENVS.includes(t)).every((t) => t === process.env.TIC_ENV));
 */
export type TagInclusionPredicate = (tags: string[], context: InclusionContext) => boolean;

/** `src/Report.production.eu.ts` -> `['production', 'eu']`; `src/Shared.ts` -> `[]`. */
export function fileTags(filename: string): string[] {
  return filename
    .slice(filename.lastIndexOf('/') + 1)
    .split('.')
    .slice(1, -1);
}

/** Wraps a {@link TagInclusionPredicate} into the {@link InclusionPredicate} the bundler calls. */
export function byTags(predicate: TagInclusionPredicate): InclusionPredicate {
  return (context) => predicate(fileTags(context.filename), context);
}

/** Predicate files looked up next to the config, in this order, when no bundle names one. */
export const INCLUSION_CONVENTION = [
  'tic.include.cjs',
  'tic.include.js',
  'tic.include.mjs',
  'tic.include.ts',
  'tic.include.cts',
  'tic.include.mts',
];

/** The conventional predicate file in `dir`, if there is one. */
export function findConventionalPredicate(dir: string): string | undefined {
  return INCLUSION_CONVENTION.map((name) => path.join(dir, name)).find((file) => existsSync(file));
}

/**
 * Loads a predicate file synchronously with `require` - `.cjs` / `.js`, ES bundles
 * (Node 22.12+) and `.ts` (Node with type stripping). Its default export, or
 * `bundle.exports` itself, is the predicate. Like any `require`d bundle it is loaded
 * once per process, so a predicate that depends on the environment should read it
 * when called, not when loaded.
 *
 * @throws {TicConfigError} when the file is missing or does not export a function.
 */
export function loadInclusionPredicate(file: string): InclusionPredicate {
  if (!existsSync(file)) throw new TicConfigError(`predicate file not found: ${file}`);
  const loaded: unknown = createRequire(file)(file);
  const predicate = typeof loaded === 'function' ? loaded : (loaded as { default?: unknown } | undefined)?.default;
  if (typeof predicate !== 'function') {
    throw new TicConfigError(`${file} must export an InclusionPredicate function (default export or bundle.exports)`);
  }
  return predicate as InclusionPredicate;
}
