import { existsSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import { TicConfigError } from '../../../exceptions/DomainException';
import { ImportPaths } from './ImportPaths';

/** tsconfig "No inputs were found": irrelevant here, a bundle never takes files from its tsconfig. */
const NO_INPUTS = 18003;

/**
 * Reads a bundle's tsconfig, following its own `extends`: its `paths` aliases and the
 * import extension its `moduleResolution` needs; `importExtension` overrides the latter.
 * Nothing else is taken from it — which files it compiles plays no part in a bundle.
 * An absent tsconfig that was not named explicitly yields no aliases.
 *
 * @throws {TicConfigError} when a required tsconfig is missing or cannot be parsed.
 */
export function loadImportPaths(tsconfig: { file: string; required: boolean }, importExtension?: string): ImportPaths {
  if (!existsSync(tsconfig.file)) {
    if (tsconfig.required) throw new TicConfigError(`tsconfig not found: ${tsconfig.file}`);
    return new ImportPaths([], importExtension ?? '');
  }

  const { config, error } = ts.readConfigFile(tsconfig.file, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(tsconfig.file), undefined, tsconfig.file);
  const [fatal] = [error, ...parsed.errors].filter((d): d is ts.Diagnostic => !!d && d.code !== NO_INPUTS);
  if (fatal) {
    throw new TicConfigError(`${tsconfig.file}: ${ts.flattenDiagnosticMessageText(fatal.messageText, '\n')}`);
  }
  return ImportPaths.fromOptions(parsed.options, tsconfig.file, importExtension);
}
