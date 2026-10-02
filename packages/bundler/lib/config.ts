import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { TicConfigError } from './errors';
import { globToRegExp } from './glob';

/**
 * Which files a bundle reads and parses: the first, cheap stage of selection,
 * decided by path alone. The candidates are what the extended tsconfig compiles,
 * or the folders in `paths` when given — they override the tsconfig's file set,
 * as a child tsconfig's `include` overrides its parent's. A candidate is parsed
 * when it matches one of `include` and none of `exclude`. Globs are relative to
 * the config file and `/`-separated. With a file naming convention
 * (`*.service.ts`), `include` keeps the bundler from reading anything else.
 */
export interface FileSelector {
  /**
   * Folders to scan instead of the tsconfig's file set: relative to the config file,
   * or tsconfig `paths` aliases. Required when there is no tsconfig to extend.
   */
  paths?: (string | PathConfig)[];
  /** Globs a file must match one of, e.g. `**\/*.service.ts`. Default: every source file. */
  include?: string[];
  /** Globs of files never read. Replaces {@link DEFAULT_EXCLUDE} when given. */
  exclude?: string[];
}

/** A {@link FileSelector} with its defaults filled in and its globs compiled. */
export interface ResolvedFileSelector {
  /** `undefined`: the extended tsconfig's file set. */
  paths?: Required<PathConfig>[];
  include?: RegExp[];
  exclude: RegExp[];
}

/** Which exports of a file count: both kinds, only named exports, or only the default export. */
export type ExportKind = 'any' | 'named' | 'default';

/**
 * Which classes of a parsed file are registered: the second stage of selection,
 * run on the files {@link FileSelector} let through. A class is selected when
 * it is exported, not abstract, and meets every criterion set here; an empty
 * rule selects every exported class.
 */
export interface ClassSelector {
  /** Default `any`. */
  export?: ExportKind;
  /**
   * The class must carry one of these decorators, recognised by name (`register`, or a
   * composed one). Default {@link DEFAULT_DECORATORS}; `[]` requires none.
   */
  decorators?: string[];
  /** A glob the class name must match, e.g. `*Service`. An anonymous default export is named after its file. */
  name?: string;
  /**
   * Class names to drop after selection, e.g. one test double sitting next to the
   * real registration in the same file.
   */
  excludeClasses?: string[];
  /** A glob the class name must NOT match, e.g. `*Mock`. An anonymous default export is named after its file. */
  excludeName?: string;
}

/** A {@link ClassSelector} with its defaults filled in and its globs compiled. */
export interface ResolvedClassSelector {
  export: ExportKind;
  decorators?: string[];
  name?: RegExp;
  excludeClasses?: string[];
  excludeName?: RegExp;
}

export interface PathConfig {
  /** A folder relative to the config file (`./src/services`) or a tsconfig `paths` alias (`@app/services`). */
  path: string;
  /** Scan sub-folders too. Default `true`. */
  recursive?: boolean;
}

/**
 * The shape of `*.bundle.json`: one bundle, built on one tsconfig. A project that
 * needs several bundles keeps one config file per bundle.
 */
export interface BundleConfig {
  $schema?: string;
  /**
   * The generated file, relative to the config file. Default `<root>/<name>.bundle.ts`:
   * `<root>` is the tsconfig's `rootDir`, else the common folder of the files it compiles.
   * Required when there is no tsconfig to extend.
   */
  output?: string;
  /**
   * The bundle's name: letters, digits, `-` and `_`, starting with a letter. Default: the
   * config file's stem (`production.bundle.json` -> `production`), else {@link DEFAULT_BUNDLE_NAME}.
   * It names the default output (`production.bundle.ts`) and the generated class,
   * an `IContainerModule` (`ProductionBundle`, see {@link toClassName}).
   */
  name?: string;
  /** Tags associated with the bundle. */
  tags?: string[];
  /**
   * The tsconfig the bundle builds on, like a tsconfig's own `extends`: the source of
   * its file set, `paths` aliases and import extension. Relative to the config file.
   * Default `./tsconfig.json`, which may be absent; a tsconfig named here must exist.
   */
  extends?: string;
  /** Extension of generated imports. Inferred from the tsconfig's `moduleResolution` when omitted. */
  importExtension?: string;
  /** Which files are parsed. Default: what the tsconfig compiles, minus {@link DEFAULT_EXCLUDE}. */
  files?: FileSelector;
  /** Which classes of a parsed file are registered. Default: every exported class. */
  classes?: ClassSelector;
}

/** A config file is named `<name>.bundle.json`, e.g. `app.bundle.json`, `production.bundle.json`. */
export const CONFIG_FILE_SUFFIX = '.bundle.json';
export const DEFAULT_EXTENDS = './tsconfig.json';
/** The bundle name when the config file gives none, e.g. building from `tsconfig.json` alone. */
export const DEFAULT_BUNDLE_NAME = 'base';
/** What `classes.decorators` requires when omitted: the library's own `@register`. */
export const DEFAULT_DECORATORS = ['register'];
export const DEFAULT_EXCLUDE = [
  '**/*.spec.ts',
  '**/*.test.ts',
  '**/*.spec.tsx',
  '**/*.test.tsx',
  '**/__tests__/**',
  '**/node_modules/**',
];

/** A {@link BundleConfig} whose defaults are filled in and whose paths are absolute. */
export interface ResolvedConfig {
  /** The config file itself. */
  file: string;
  dir: string;
  /** `undefined`: derived from the tsconfig at build time (see {@link BundleConfig.output}). */
  output?: string;
  /** The bundle name: `production` for `production.bundle.json`. */
  name: string;
  /** The generated class: `ProductionBundle`. */
  className: string;
  tags: string[];
  /** The extended tsconfig; `required` when the config names it, so it must exist. */
  tsconfig: { file: string; required: boolean };
  importExtension?: string;
  files: ResolvedFileSelector;
  classes: ResolvedClassSelector;
  /** Non-fatal problems found while resolving, e.g. a `files.exclude` that drops a default test glob. */
  warnings: string[];
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isNonEmptyString);
const isBundleName = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z][\w-]*$/.test(value);

const fail = (field: string, expected: string): never => {
  throw new TicConfigError(`${field}: expected ${expected}`);
};

/**
 * @throws {TicConfigError} when a path entry is neither a non-empty string nor an object with a `path`.
 */
function toPath(value: unknown, field: string): Required<PathConfig> {
  if (isNonEmptyString(value)) return { path: value, recursive: true };
  if (!isObject(value)) return fail(field, 'a string or an object with "path"');
  if (!isNonEmptyString(value.path)) return fail(`${field}.path`, 'a non-empty string');
  if (value.recursive !== undefined && typeof value.recursive !== 'boolean')
    return fail(`${field}.recursive`, 'a boolean');
  return { path: value.path, recursive: value.recursive ?? true };
}

const FILE_SELECTOR_FIELDS = new Set(['paths', 'include', 'exclude']);

/**
 * @throws {TicConfigError} when the rule is not an object, has an unknown field, or a field has the wrong type.
 */
function toFileSelector(value: unknown, field: string): ResolvedFileSelector {
  if (value === undefined) return { exclude: DEFAULT_EXCLUDE.map(globToRegExp) };
  if (!isObject(value)) return fail(field, 'an object');
  const unknown = Object.keys(value).find((key) => !FILE_SELECTOR_FIELDS.has(key));
  if (unknown) throw new TicConfigError(`${field}.${unknown}: unknown field`);
  const { paths, include, exclude } = value;
  if (paths !== undefined && !(Array.isArray(paths) && paths.length > 0)) {
    return fail(`${field}.paths`, 'a non-empty array');
  }
  if (include !== undefined && !(isStringArray(include) && include.length > 0)) {
    return fail(`${field}.include`, 'a non-empty array of strings');
  }
  if (exclude !== undefined && !isStringArray(exclude)) return fail(`${field}.exclude`, 'an array of strings');
  return {
    paths: paths?.map((entry, i) => toPath(entry, `${field}.paths[${i}]`)),
    include: include?.map(globToRegExp),
    exclude: (exclude ?? DEFAULT_EXCLUDE).map(globToRegExp),
  };
}

const CLASS_SELECTOR_FIELDS = new Set(['export', 'decorators', 'name', 'excludeClasses', 'excludeName']);

/**
 * @throws {TicConfigError} when the rule is not an object, has an unknown field, or a field has the wrong type.
 */
function toClassSelector(value: unknown, field: string): ResolvedClassSelector {
  if (value === undefined) return { export: 'any', decorators: DEFAULT_DECORATORS };
  if (!isObject(value)) return fail(field, 'an object');
  const unknown = Object.keys(value).find((key) => !CLASS_SELECTOR_FIELDS.has(key));
  if (unknown) throw new TicConfigError(`${field}.${unknown}: unknown field`);
  const { export: kind, decorators, name, excludeClasses, excludeName } = value;
  if (kind !== undefined && kind !== 'any' && kind !== 'named' && kind !== 'default') {
    return fail(`${field}.export`, '"any", "named" or "default"');
  }
  if (decorators !== undefined && !isStringArray(decorators)) return fail(`${field}.decorators`, 'an array of strings');
  if (name !== undefined && !isNonEmptyString(name)) return fail(`${field}.name`, 'a non-empty string');
  if (excludeClasses !== undefined && !(isStringArray(excludeClasses) && excludeClasses.length > 0)) {
    return fail(`${field}.excludeClasses`, 'a non-empty array of strings');
  }
  if (excludeName !== undefined && !isNonEmptyString(excludeName)) {
    return fail(`${field}.excludeName`, 'a non-empty string');
  }
  return {
    export: kind ?? 'any',
    // `[]` is the explicit opt-out: no decorator required.
    decorators: decorators === undefined ? DEFAULT_DECORATORS : decorators.length > 0 ? decorators : undefined,
    name: name === undefined ? undefined : globToRegExp(name),
    excludeClasses,
    excludeName: excludeName === undefined ? undefined : globToRegExp(excludeName),
  };
}

/**
 * Warns when an explicit, non-empty `files.exclude` omits one of the {@link DEFAULT_EXCLUDE}
 * globs, since that silently drops test files (or `node_modules`) from the scan.
 * An empty `exclude` is a deliberate opt-out and does not warn.
 */
function excludeWarnings(files: unknown): string[] {
  if (!isObject(files)) return [];
  const exclude = files.exclude;
  if (!isStringArray(exclude) || exclude.length === 0) return [];
  const missing = DEFAULT_EXCLUDE.filter((glob) => !exclude.includes(glob));
  if (missing.length === 0) return [];
  return [
    `files.exclude replaces the default excludes and omits ${missing.map((glob) => `"${glob}"`).join(', ')}; ` +
      `add them back`,
  ];
}

const CONFIG_FIELDS = new Set(['$schema', 'output', 'name', 'tags', 'extends', 'importExtension', 'files', 'classes']);

/**
 * Validates parsed `*.bundle.json` content and resolves its paths against `file`'s directory.
 *
 * @throws {TicConfigError} when the content does not match the config shape; the message names the field.
 */
export function resolveConfig(content: unknown, file: string): ResolvedConfig {
  const dir = path.dirname(file);
  if (!isObject(content)) return fail('config', 'a JSON object');
  const unknown = Object.keys(content).find((key) => !CONFIG_FIELDS.has(key));
  if (unknown) throw new TicConfigError(`${unknown}: unknown field`);
  const { output, name, tags, extends: tsconfig, importExtension, files, classes } = content;
  if (output !== undefined && !isNonEmptyString(output)) return fail('output', 'a non-empty string');
  if (name !== undefined && !isBundleName(name)) {
    return fail('name', 'letters, digits, "-" or "_", starting with a letter');
  }
  const bundleName = name ?? configStem(file) ?? DEFAULT_BUNDLE_NAME;
  if (tags !== undefined && !isStringArray(tags)) return fail('tags', 'an array of strings');
  if (tsconfig !== undefined && !isNonEmptyString(tsconfig)) return fail('extends', 'a non-empty string');
  if (importExtension !== undefined && typeof importExtension !== 'string') return fail('importExtension', 'a string');
  return {
    file,
    dir,
    output: output === undefined ? undefined : path.resolve(dir, output),
    name: bundleName,
    className: toClassName(bundleName),
    tags: tags ?? [],
    tsconfig: { file: path.resolve(dir, tsconfig ?? DEFAULT_EXTENDS), required: tsconfig !== undefined },
    importExtension,
    files: toFileSelector(files, 'files'),
    classes: toClassSelector(classes, 'classes'),
    warnings: excludeWarnings(files),
  };
}

/** `production.bundle.json` -> `production`; `undefined` for any other file name, e.g. `tsconfig.json`. */
function configStem(file: string): string | undefined {
  const base = path.basename(file);
  const stem = base.endsWith(CONFIG_FILE_SUFFIX) ? base.slice(0, -CONFIG_FILE_SUFFIX.length) : '';
  return isBundleName(stem) ? stem : undefined;
}

/** The generated class for a bundle name: `production` -> `ProductionBundle`, `my-app_v2` -> `MyAppV2Bundle`. */
export function toClassName(name: string): string {
  const words = name.split(/[-_]+/).filter(Boolean);
  return `${words.map((word) => word[0].toUpperCase() + word.slice(1)).join('')}Bundle`;
}

/**
 * The root of the package `dir` belongs to: the nearest folder, `dir` or above, with a
 * `package.json` — the project root in a single-package project, the package in a
 * monorepo. `dir` itself when no folder above has one.
 */
export function findPackageRoot(dir: string): string {
  const start = path.resolve(dir);
  for (let current = start; ; current = path.dirname(current)) {
    if (existsSync(path.join(current, 'package.json'))) return current;
    if (path.dirname(current) === current) return start;
  }
}

/** The `*.bundle.json` configs in `dir` (not its sub-folders), sorted by name. */
export function findConfigFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(CONFIG_FILE_SUFFIX))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Reads and validates a `*.bundle.json`.
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
