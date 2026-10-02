import { existsSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import { TicConfigError } from './errors';
import { ImportPaths } from './ImportPaths';
import { isSourceFile } from './scan';

/** tsconfig "No inputs were found": not an error here, the bundle then simply has no files. */
const NO_INPUTS = 18003;

/** What a bundle takes from the tsconfig it extends. */
export interface ExtendedTsconfig {
  importPaths: ImportPaths;
  /** Absolute paths of the files the tsconfig compiles; `undefined` when there is no tsconfig. */
  fileNames?: string[];
  /**
   * Where the sources live, as tsc sees it: `rootDir`, else the longest common folder of
   * the non-declaration files it compiles, else the tsconfig's folder. `undefined` when
   * there is no tsconfig.
   */
  rootDir?: string;
}

/** The longest common folder of `files`, or `undefined` for none. */
function commonDir(files: string[]): string | undefined {
  if (files.length === 0) return undefined;
  const [first, ...rest] = files.map((file) => path.dirname(file).split(path.sep));
  let length = first.length;
  for (const parts of rest) {
    let i = 0;
    while (i < length && i < parts.length && parts[i] === first[i]) i++;
    length = i;
  }
  return first.slice(0, length).join(path.sep) || path.sep;
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
  const fileNames = parsed.fileNames.map((file) => path.resolve(file));
  return {
    importPaths: ImportPaths.fromOptions(parsed.options, tsconfig.file, importExtension),
    fileNames,
    rootDir: parsed.options.rootDir ?? commonDir(fileNames.filter(isSourceFile)) ?? path.dirname(tsconfig.file),
  };
}
