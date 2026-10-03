import { existsSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import { TicConfigError } from '../../../exceptions/DomainException';
import type { ResolvedConfig } from '../BuildConfig';
import { ImportPaths } from './ImportPaths';
import { isSourceFile } from './scan';

/** tsconfig "No inputs were found": not an error here, the bundle then simply has no files. */
const NO_INPUTS = 18003;

/** What a bundle compiles: the bundle config read as a tsconfig, on top of the tsconfig it extends. */
export interface CompiledTsconfig {
  importPaths: ImportPaths;
  /** Absolute paths of the files compiled. */
  fileNames: string[];
  /**
   * Where the sources live, as tsc sees it: `rootDir`, else the longest common folder of
   * the non-declaration files compiled, else the config's folder.
   */
  rootDir: string;
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
 * The tsconfig a bundle config stands for: its `include`, `exclude` and the tsconfig part
 * of its `compilerOptions`, extending the tsconfig it names. The default tsconfig is left
 * out when absent; a config built from `tsconfig.json` alone is that tsconfig.
 *
 * @throws {TicConfigError} when the tsconfig the config names does not exist.
 */
function asTsconfig(config: ResolvedConfig): { config?: unknown; error?: ts.Diagnostic } {
  if (!existsSync(config.tsconfig.file)) {
    if (config.tsconfig.required) throw new TicConfigError(`tsconfig not found: ${config.tsconfig.file}`);
    return { config: config.overrides };
  }
  if (config.file === config.tsconfig.file) return ts.readConfigFile(config.file, ts.sys.readFile);
  return { config: { extends: config.tsconfig.file, ...config.overrides } };
}

/**
 * Compiles a bundle config as a tsconfig, following `extends`: the files it compiles
 * (`include` / `exclude`, as overridden), its `paths` aliases and import extension.
 *
 * @throws {TicConfigError} when a required tsconfig is missing, or the config or a tsconfig it extends is invalid.
 */
export function loadTsconfig(config: ResolvedConfig): CompiledTsconfig {
  const { config: json, error } = asTsconfig(config);
  // A config built from tsconfig.json alone is parsed as itself, which would make it extend itself.
  const configFileName = config.file === config.tsconfig.file ? config.file : undefined;
  const parsed = ts.parseJsonConfigFileContent(json ?? {}, ts.sys, config.dir, undefined, configFileName);
  const [fatal] = [error, ...parsed.errors].filter((d): d is ts.Diagnostic => !!d && d.code !== NO_INPUTS);
  if (fatal) {
    throw new TicConfigError(`${config.file}: ${ts.flattenDiagnosticMessageText(fatal.messageText, '\n')}`);
  }
  const fileNames = parsed.fileNames.map((file) => path.resolve(file));
  return {
    importPaths: ImportPaths.fromOptions(parsed.options, config.file, config.importExtension),
    fileNames,
    rootDir: parsed.options.rootDir ?? commonDir(fileNames.filter(isSourceFile)) ?? config.dir,
  };
}
