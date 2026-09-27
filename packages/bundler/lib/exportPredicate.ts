import { conventionalNames, findConventionalFile, loadPredicateFile } from './predicateFile';
import type { FilterPredicate } from './utils';

/** What an {@link ExportPredicate} decides on: one exported class of a parsed file. */
export interface ExportContext {
  /** The file's path relative to the config file, `/`-separated: `src/services/Logger.ts`. */
  filename: string;
  /** The name the class is exported under; `'default'` for a default export. */
  exportName: string;
  /** The declared class name; an anonymous default export is named after its file. */
  className: string;
  isDefault: boolean;
  /** Names of the class's decorators, renamed imports resolved (`register as reg` -> `'register'`). */
  decorators: string[];
  /** The file-name tags `byTags` reads: `Report.production.eu.ts` -> `['production', 'eu']`. */
  tags: string[];
}

/**
 * Decides, right after a file is parsed, whether one of its exported classes becomes a
 * registration. It runs on every exported, non-abstract class that passes `select`.
 *
 * @example
 * // tic.exports.ts, next to tic.config.json - picked up by convention
 * const filterExports: ExportPredicate = ({ exportName }) => !/(Stub|Mock|Fake)$/.test(exportName);
 * export default filterExports;
 */
export type ExportPredicate = FilterPredicate<ExportContext>;

/** Export predicate files looked up next to the config, in this order, when no bundle names one. */
export const EXPORTS_CONVENTION = conventionalNames('tic.exports');

/** The conventional export predicate file in `dir`, if there is one. */
export function findConventionalExportPredicate(dir: string): string | undefined {
  return findConventionalFile(dir, 'tic.exports');
}

/**
 * Loads an {@link ExportPredicate} file (see `loadPredicateFile` for formats and caching).
 *
 * @throws {TicConfigError} when the file is missing or does not export a function.
 */
export function loadExportPredicate(file: string): ExportPredicate {
  return loadPredicateFile<ExportPredicate>(file, 'ExportPredicate');
}
