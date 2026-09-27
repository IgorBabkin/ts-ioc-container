import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { TicConfigError } from './errors';

/** Which exported classes of a namespace become registrations. */
export type Select = 'decorated' | 'exported';

export interface NamespaceConfig {
  /** A folder relative to the config file (`./src/services`) or a tsconfig `paths` alias (`@app/services`). */
  path: string;
  /** Scan sub-folders too. Default `true`. */
  recursive?: boolean;
}

export interface ModuleConfig {
  /** The generated file, relative to the config file. */
  output: string;
  /** Name of the exported `IContainerModule`. Default `ContainerModule`. */
  name?: string;
  namespaces: (string | NamespaceConfig)[];
  /** Default `decorated`. */
  select?: Select;
  /** Decorator names that mark a class as a registration under `select: "decorated"`. Default `["register"]`. */
  decorators?: string[];
  /** Globs, relative to the config file, of files never scanned. Replaces {@link DEFAULT_EXCLUDE} when given. */
  exclude?: string[];
}

/** The shape of `tic.config.json`. */
export interface TicConfig {
  $schema?: string;
  /** Relative to the config file. Default `tsconfig.json`, which may be absent. */
  tsconfig?: string;
  /** Extension of generated imports. Inferred from the tsconfig's `moduleResolution` when omitted. */
  importExtension?: string;
  modules: ModuleConfig[];
}

export const DEFAULT_CONFIG_FILE = 'tic.config.json';
export const DEFAULT_MODULE_NAME = 'ContainerModule';
export const DEFAULT_DECORATORS = ['register'];
export const DEFAULT_EXCLUDE = [
  '**/*.spec.ts',
  '**/*.test.ts',
  '**/*.spec.tsx',
  '**/*.test.tsx',
  '**/__tests__/**',
  '**/node_modules/**',
];

/** A config whose defaults are filled in and whose paths are absolute. */
export interface ResolvedConfig {
  file: string;
  dir: string;
  tsconfig: { file: string; required: boolean };
  importExtension?: string;
  modules: ResolvedModule[];
}

export interface ResolvedModule {
  output: string;
  name: string;
  namespaces: Required<NamespaceConfig>[];
  select: Select;
  decorators: string[];
  exclude: string[];
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isNonEmptyString);
const isIdentifier = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z_$][\w$]*$/.test(value);

const fail = (field: string, expected: string): never => {
  throw new TicConfigError(`${field}: expected ${expected}`);
};

/**
 * @throws {TicConfigError} when a namespace entry is neither a non-empty string nor an object with a `path`.
 */
function toNamespace(value: unknown, field: string): Required<NamespaceConfig> {
  if (isNonEmptyString(value)) return { path: value, recursive: true };
  if (!isObject(value)) return fail(field, 'a string or an object with "path"');
  if (!isNonEmptyString(value.path)) return fail(`${field}.path`, 'a non-empty string');
  if (value.recursive !== undefined && typeof value.recursive !== 'boolean')
    return fail(`${field}.recursive`, 'a boolean');
  return { path: value.path, recursive: value.recursive ?? true };
}

/**
 * @throws {TicConfigError} when a module field is missing or has the wrong type.
 */
function toModule(value: unknown, field: string, dir: string): ResolvedModule {
  if (!isObject(value)) return fail(field, 'an object');
  const { output, name, namespaces, select, decorators, exclude } = value;
  if (!isNonEmptyString(output)) return fail(`${field}.output`, 'a non-empty string');
  if (name !== undefined && !isIdentifier(name)) return fail(`${field}.name`, 'a valid identifier');
  if (!Array.isArray(namespaces) || namespaces.length === 0) return fail(`${field}.namespaces`, 'a non-empty array');
  if (select !== undefined && select !== 'decorated' && select !== 'exported') {
    return fail(`${field}.select`, '"decorated" or "exported"');
  }
  if (decorators !== undefined && !(isStringArray(decorators) && decorators.length > 0)) {
    return fail(`${field}.decorators`, 'a non-empty array of strings');
  }
  if (exclude !== undefined && !isStringArray(exclude)) return fail(`${field}.exclude`, 'an array of strings');
  return {
    output: path.resolve(dir, output),
    name: name ?? DEFAULT_MODULE_NAME,
    namespaces: namespaces.map((ns, i) => toNamespace(ns, `${field}.namespaces[${i}]`)),
    select: select ?? 'decorated',
    decorators: decorators ?? DEFAULT_DECORATORS,
    exclude: exclude ?? DEFAULT_EXCLUDE,
  };
}

/**
 * Validates parsed `tic.config.json` content and resolves its paths against `file`'s directory.
 *
 * @throws {TicConfigError} when the content does not match the config shape; the message names the field.
 */
export function resolveConfig(content: unknown, file: string): ResolvedConfig {
  const dir = path.dirname(file);
  if (!isObject(content)) return fail('config', 'a JSON object');
  const { tsconfig, importExtension, modules } = content;
  if (tsconfig !== undefined && !isNonEmptyString(tsconfig)) return fail('tsconfig', 'a non-empty string');
  if (importExtension !== undefined && typeof importExtension !== 'string') return fail('importExtension', 'a string');
  if (!Array.isArray(modules) || modules.length === 0) return fail('modules', 'a non-empty array');
  return {
    file,
    dir,
    tsconfig: { file: path.resolve(dir, tsconfig ?? 'tsconfig.json'), required: tsconfig !== undefined },
    importExtension,
    modules: modules.map((m, i) => toModule(m, `modules[${i}]`, dir)),
  };
}

/**
 * Reads and validates a `tic.config.json`.
 *
 * @throws {TicConfigError} when the file is missing, is not valid JSON, or does not match the config shape.
 */
export function loadConfig(file: string): ResolvedConfig {
  if (!existsSync(file)) throw new TicConfigError(`config file not found: ${file}`);
  let content: unknown;
  try {
    content = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new TicConfigError(`${file} is not valid JSON: ${(e as Error).message}`);
  }
  return resolveConfig(content, file);
}
