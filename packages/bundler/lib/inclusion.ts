import { conventionalNames, findConventionalFile, loadPredicateFile } from './predicateFile';
import type { FilterPredicate } from './utils';

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
export type InclusionPredicate = FilterPredicate<InclusionContext>;

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
export const INCLUSION_CONVENTION = conventionalNames('tic.include');

/** The conventional inclusion predicate file in `dir`, if there is one. */
export function findConventionalPredicate(dir: string): string | undefined {
  return findConventionalFile(dir, 'tic.include');
}

/**
 * Loads an {@link InclusionPredicate} file (see `loadPredicateFile` for formats and caching).
 *
 * @throws {TicConfigError} when the file is missing or does not export a function.
 */
export function loadInclusionPredicate(file: string): InclusionPredicate {
  return loadPredicateFile<InclusionPredicate>(file, 'InclusionPredicate');
}
