import { existsSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import { TicConfigError } from './errors';
import { ImportPaths } from './ImportPaths';

/** tsconfig "No inputs were found": not an error here, the bundle then simply has no files. */
const NO_INPUTS = 18003;

/** What a bundle takes from the tsconfig it extends. */
export interface ExtendedTsconfig {
  importPaths: ImportPaths;
  /** Absolute paths of the files the tsconfig compiles; `undefined` when there is no tsconfig. */
  fileNames?: string[];
}

/**
 * Reads the tsconfig a bundle extends, following its own `extends`: its `paths` aliases,
 * import extension and file set (`files` / `include` / `exclude`). An absent tsconfig that
 * was not named explicitly yields no aliases and no file set.
 *
 * @throws {TicConfigError} when a required tsconfig is missing or cannot be parsed.
 */
export function loadTsconfig(
  tsconfig: { file: string; required: boolean },
  importExtension?: string,
): ExtendedTsconfig {
  if (!existsSync(tsconfig.file)) {
    if (tsconfig.required) throw new TicConfigError(`tsconfig not found: ${tsconfig.file}`);
    return { importPaths: new ImportPaths([], importExtension ?? '') };
  }

  const { config, error } = ts.readConfigFile(tsconfig.file, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(tsconfig.file), undefined, tsconfig.file);
  const [fatal] = [error, ...parsed.errors].filter((d): d is ts.Diagnostic => !!d && d.code !== NO_INPUTS);
  if (fatal) {
    throw new TicConfigError(`${tsconfig.file}: ${ts.flattenDiagnosticMessageText(fatal.messageText, '\n')}`);
  }
  return {
    importPaths: ImportPaths.fromOptions(parsed.options, tsconfig.file, importExtension),
    fileNames: parsed.fileNames.map((file) => path.resolve(file)),
  };
}
