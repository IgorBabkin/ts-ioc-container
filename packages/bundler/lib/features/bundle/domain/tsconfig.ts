import { existsSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import { TicConfigError } from '../../../exceptions/DomainException';
import { ImportPaths } from './ImportPaths';

/** tsconfig "No inputs were found": irrelevant here, a bundle never takes files from its tsconfig. */
const NO_INPUTS = 18003;

/**
 * Reads a bundle's tsconfig, following its own `extends`, for its `paths` aliases. Nothing else
 * is taken from it — which files it compiles plays no part in a bundle, and imports are
 * written with `importExtension` as given.
 *
 * @throws {TicConfigError} when the tsconfig is missing or cannot be parsed.
 */
export function loadImportPaths(tsconfig: string, importExtension: string): ImportPaths {
  if (!existsSync(tsconfig)) throw new TicConfigError(`tsconfig not found: ${tsconfig}`);

  const { config, error } = ts.readConfigFile(tsconfig, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(tsconfig), undefined, tsconfig);
  const [fatal] = [error, ...parsed.errors].filter((d): d is ts.Diagnostic => !!d && d.code !== NO_INPUTS);
  if (fatal) {
    throw new TicConfigError(`${tsconfig}: ${ts.flattenDiagnosticMessageText(fatal.messageText, '\n')}`);
  }
  return ImportPaths.fromOptions(parsed.options, tsconfig, importExtension);
}
