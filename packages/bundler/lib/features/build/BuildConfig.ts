import path from 'node:path';
import { z } from 'zod';
import { TicConfigError } from '../../exceptions/DomainException';
import { globToRegExp } from './domain/glob';

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

const BUNDLE_NAME = /^[A-Za-z][\w-]*$/;

// Each schema carries the message a config author reads, so a failed parse names
// the field and what it expected: `classes.export: expected "any", "named" or "default"`.
const expected = (what: string) => ({ error: `expected ${what}` });
const nonEmptyString = () => z.string(expected('a non-empty string')).min(1, expected('a non-empty string'));
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

/**
 * A list of non-empty strings, validated as one value so a bad element is reported at the
 * list (`tags: expected an array of strings`), as the config author wrote it. Its JSON
 * Schema shape is attached as metadata, since a custom check has none of its own.
 */
const strings = (what: string, minItems: number) =>
  z
    .custom<string[]>(
      (value) => Array.isArray(value) && value.length >= minItems && value.every(isNonEmptyString),
      expected(what),
    )
    .meta({ type: 'array', items: { type: 'string', minLength: 1 }, ...(minItems > 0 && { minItems }) });
const stringList = () => strings('an array of strings', 0);
const nonEmptyStringList = () => strings('a non-empty array of strings', 1);

const PATH_SCHEMA = z.union(
  [
    nonEmptyString(),
    z.object(
      {
        path: nonEmptyString(),
        recursive: z.boolean(expected('a boolean')).default(true),
      },
      expected('a string or an object with "path"'),
    ),
  ],
  expected('a string or an object with "path"'),
);

const FILES_SCHEMA = z
  .strictObject(
    {
      paths: z
        .array(PATH_SCHEMA, expected('a non-empty array'))
        .min(1, expected('a non-empty array'))
        .optional()
        .describe(
          "Folders to scan instead of the extended tsconfig's file set: paths relative to this file (./src/services) or tsconfig paths aliases (@app/services). Required when there is no tsconfig to extend.",
        ),
      include: nonEmptyStringList()
        .optional()
        .describe(
          'Globs a file must match one of, e.g. ["**/*.service.ts", "**/*.repository.ts"]. Default: every source file.',
        ),
      exclude: stringList()
        .default(DEFAULT_EXCLUDE)
        .describe(
          'Globs of files never read. Replaces the default when given. A non-empty list that omits a default glob makes `tic build` warn.',
        ),
    },
    expected('an object'),
  )
  .describe(
    'Which files this bundle reads and parses — decided by path alone, before parsing. The candidates are what the extended tsconfig compiles, or the folders in `paths` when given. A candidate is parsed when it matches one of `include` and none of `exclude`. Globs are relative to this file. With a file naming convention, `include` keeps every other file unread.',
  );

const CLASSES_SCHEMA = z
  .strictObject(
    {
      export: z
        .enum(['any', 'named', 'default'], expected('"any", "named" or "default"'))
        .default('any')
        .describe('Which exports count.'),
      decorators: stringList()
        .default(DEFAULT_DECORATORS)
        .describe(
          'The class must carry one of these decorators, recognised by name (e.g. "register", or a composed decorator). Default ["register"]; [] requires none.',
        ),
      name: nonEmptyString()
        .optional()
        .describe(
          'Glob the class name must match, e.g. "*Service". An anonymous default export is named after its file.',
        ),
      excludeClasses: nonEmptyStringList()
        .optional()
        .describe(
          'Class names to drop after selection, e.g. one test double sitting next to the real registration in the same file.',
        ),
      excludeName: nonEmptyString()
        .optional()
        .describe(
          'Glob the class name must NOT match, e.g. "*Mock". An anonymous default export is named after its file.',
        ),
    },
    expected('an object'),
  )
  .describe(
    'Which classes of a parsed file are registered. A class is selected when it is exported, not abstract, and meets every criterion set here; by default that is every exported class decorated with @register.',
  );

/**
 * One `*.bundle.json` / `*.bundle.yaml`. The published `tic.schema.json` is generated
 * from it (`ticConfigJsonSchema`), so the schema editors validate against cannot drift
 * from what `tic build` accepts.
 */
export const BUNDLE_CONFIG_SCHEMA = z.strictObject(
  {
    $schema: z.string().optional(),
    output: nonEmptyString()
      .optional()
      .describe(
        "The bundle file (convention: *.bundle.ts). Default `<root>/<name>.bundle.ts`: <root> is the tsconfig's rootDir, else the common folder of the files it compiles. Required when there is no tsconfig to extend.",
      ),
    name: z
      .string(expected('letters, digits, "-" or "_", starting with a letter'))
      .regex(BUNDLE_NAME, expected('letters, digits, "-" or "_", starting with a letter'))
      .optional()
      .describe(
        'The bundle\'s name: letters, digits, "-" and "_", starting with a letter. Default: this file\'s stem (production.bundle.json → production), else "base". It names the default output (production.bundle.ts) and the generated IContainerModule class (ProductionBundle).',
      ),
    tags: stringList().default([]).describe('Tags associated with the bundle.'),
    // Optional rather than defaulted: a tsconfig the config names must exist, the default may be absent.
    extends: nonEmptyString()
      .optional()
      .meta({ default: DEFAULT_EXTENDS })
      .describe(
        "The tsconfig this bundle builds on, like a tsconfig's own `extends`: what it compiles (`files` / `include` / `exclude`) is the bundle's file set unless `files.paths` overrides it, and its `paths` aliases and module resolution shape the generated imports. Relative to this file. The default may be absent; a tsconfig named here must exist.",
      ),
    importExtension: z
      .string(expected('a string'))
      .optional()
      .describe(
        'Extension of generated imports, e.g. ".js". Inferred from the tsconfig: ".js" under node16/nodenext resolution, none otherwise.',
      ),
    files: FILES_SCHEMA.optional(),
    classes: CLASSES_SCHEMA.optional(),
  },
  expected('an object'),
);

type ParsedConfig = z.output<typeof BUNDLE_CONFIG_SCHEMA>;

/** `['classes', 'export']` -> `classes.export`, `['files', 'paths', 0]` -> `files.paths[0]`; the root is `config`. */
function formatPath(segments: PropertyKey[]): string {
  const formatted = segments
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : `.${String(segment)}`))
    .join('')
    .replace(/^\./, '');
  return formatted || 'config';
}

/**
 * A union failure names the union unless the value had the type of one branch: an
 * object path without `path` reports `files.paths[0].path`, not `files.paths[0]`.
 */
function matchedBranch(issue: z.core.$ZodIssueInvalidUnion): z.core.$ZodIssue[] | undefined {
  const typeMatched = issue.errors.filter((branch) =>
    branch.every((inner) => inner.code !== 'invalid_type' || inner.path.length > 0),
  );
  return typeMatched.length === 1 ? typeMatched[0] : undefined;
}

function formatIssue(issue: z.core.$ZodIssue, prefix: PropertyKey[] = []): string[] {
  const at = [...prefix, ...issue.path];
  if (issue.code === 'unrecognized_keys') return issue.keys.map((key) => `${formatPath([...at, key])}: unknown field`);
  const branch = issue.code === 'invalid_union' ? matchedBranch(issue) : undefined;
  if (branch) return branch.flatMap((inner) => formatIssue(inner, at));
  return [`${formatPath(at)}: ${issue.message}`];
}

const formatIssues = (error: z.ZodError): string => error.issues.flatMap((issue) => formatIssue(issue)).join('; ');

function toFileSelector(files: ParsedConfig['files']): ResolvedFileSelector {
  if (files === undefined) return { exclude: DEFAULT_EXCLUDE.map(globToRegExp) };
  return {
    paths: files.paths?.map((entry) => (typeof entry === 'string' ? { path: entry, recursive: true } : entry)),
    include: files.include?.map(globToRegExp),
    exclude: files.exclude.map(globToRegExp),
  };
}

function toClassSelector(classes: ParsedConfig['classes']): ResolvedClassSelector {
  if (classes === undefined) return { export: 'any', decorators: DEFAULT_DECORATORS };
  const { decorators, name, excludeName, ...rest } = classes;
  return {
    ...rest,
    // `[]` is the explicit opt-out: no decorator required.
    decorators: decorators.length > 0 ? decorators : undefined,
    name: name === undefined ? undefined : globToRegExp(name),
    excludeName: excludeName === undefined ? undefined : globToRegExp(excludeName),
  };
}

/**
 * Warns when an explicit, non-empty `files.exclude` omits one of the {@link DEFAULT_EXCLUDE}
 * globs, since that silently drops test files (or `node_modules`) from the scan.
 * An empty `exclude` is a deliberate opt-out and does not warn.
 */
function excludeWarnings(files: ParsedConfig['files']): string[] {
  const exclude = files?.exclude ?? [];
  if (exclude.length === 0) return [];
  const missing = DEFAULT_EXCLUDE.filter((glob) => !exclude.includes(glob));
  if (missing.length === 0) return [];
  return [
    `files.exclude replaces the default excludes and omits ${missing.map((glob) => `"${glob}"`).join(', ')}; ` +
      `add them back`,
  ];
}

/**
 * A config file is named `<name>.bundle.json`, `<name>.bundle.yaml` or `<name>.bundle.yml`,
 * e.g. `app.bundle.json`, `production.bundle.yaml`. Every format has the same shape.
 */
export const CONFIG_FILE_SUFFIXES = ['.bundle.json', '.bundle.yaml', '.bundle.yml'];

/** The config suffix `file` ends with, if any. */
export const configSuffix = (file: string): string | undefined =>
  CONFIG_FILE_SUFFIXES.find((suffix) => file.endsWith(suffix));

/** `production.bundle.yaml` -> `production`; `undefined` for any other file name, e.g. `tsconfig.json`. */
function configStem(file: string): string | undefined {
  const base = path.basename(file);
  const suffix = configSuffix(base);
  const stem = suffix ? base.slice(0, -suffix.length) : '';
  return BUNDLE_NAME.test(stem) ? stem : undefined;
}

/** The generated class for a bundle name: `production` -> `ProductionBundle`, `my-app_v2` -> `MyAppV2Bundle`. */
export function toClassName(name: string): string {
  const words = name.split(/[-_]+/).filter(Boolean);
  return `${words.map((word) => word[0].toUpperCase() + word.slice(1)).join('')}Bundle`;
}

/**
 * Validates parsed `*.bundle.json` content and resolves its paths against `file`'s directory.
 *
 * @throws {TicConfigError} when the content does not match the config shape; the message names the field.
 */
export function resolveConfig(content: unknown, file: string): ResolvedConfig {
  const result = BUNDLE_CONFIG_SCHEMA.safeParse(content);
  if (!result.success) throw new TicConfigError(formatIssues(result.error));
  const { output, name, tags, extends: tsconfig, importExtension, files, classes } = result.data;
  const dir = path.dirname(file);
  const bundleName = name ?? configStem(file) ?? DEFAULT_BUNDLE_NAME;
  return {
    file,
    dir,
    output: output === undefined ? undefined : path.resolve(dir, output),
    name: bundleName,
    className: toClassName(bundleName),
    tags,
    tsconfig: { file: path.resolve(dir, tsconfig ?? DEFAULT_EXTENDS), required: tsconfig !== undefined },
    importExtension,
    files: toFileSelector(files),
    classes: toClassSelector(classes),
    warnings: excludeWarnings(files),
  };
}
