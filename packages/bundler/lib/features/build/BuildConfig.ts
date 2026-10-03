import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { TicConfigError } from '../../exceptions/DomainException';
import { globToRegExp } from './domain/glob';

/**
 * Which files a bundle reads and parses: the first, cheap stage of selection,
 * decided by path alone. `paths` are the folders the files come from; within them
 * a file is parsed when it matches one of `include` and none of `exclude`. Globs
 * are relative to the config file and `/`-separated. With a file naming convention
 * (`*.service.ts`), `include` keeps the bundler from reading anything else.
 */
export interface GlobSelector {
  /** Folders to scan: relative to the config file (`./src/services`), or tsconfig `paths` aliases (`@app/services`). */
  paths: (string | PathConfig)[];
  /** Globs a file must match one of, e.g. `**\/*.service.ts`. Default: every source file. */
  include?: string[];
  /** Globs of files never read. Replaces {@link DEFAULT_EXCLUDE} when given. */
  exclude?: string[];
}

/** A {@link GlobSelector} with its defaults filled in and its globs compiled. */
export interface ResolvedGlobSelector {
  paths: Required<PathConfig>[];
  include?: RegExp[];
  exclude: RegExp[];
}

/** Which exports of a file count: both kinds, only named exports, or only the default export. */
export type ExportKind = 'any' | 'named' | 'default';

/**
 * Which classes of a parsed file are registered: the second stage of selection,
 * run on the files {@link GlobSelector} let through. A class is selected when
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
  /**
   * Globs the class name must match one of, e.g. `*Service` or `["*Service", "*Repository"]`.
   * An anonymous default export is named after its file.
   */
  glob?: string | string[];
  /**
   * Globs the class name must match none of, applied after every other criterion. A plain
   * name is a glob too, so `["MockUserRepository", "*Fake"]` drops one class by name and a
   * family by pattern.
   */
  exclude?: string | string[];
}

/** A {@link ClassSelector} with its defaults filled in and its globs compiled. */
export interface ResolvedClassSelector {
  export: ExportKind;
  decorators?: string[];
  glob?: RegExp[];
  exclude?: RegExp[];
}

export interface PathConfig {
  /** A folder relative to the config file (`./src/services`) or a tsconfig `paths` alias (`@app/services`). */
  path: string;
  /** Scan sub-folders too. Default `true`. */
  recursive?: boolean;
}

/**
 * A bundle config file: one bundle, described explicitly — the folders it scans and the
 * classes it registers. `tic build <config>` prints the bundle to stdout; where it is
 * saved is the caller's choice (`tic build app.bundle.json > src/di/app.bundle.ts`).
 */
export interface BundleConfig {
  $schema?: string;
  /**
   * The bundle's name: letters, digits, `-` and `_`, starting with a letter. Default: the
   * config file's stem (`production.bundle.json` -> `production`); required for a config
   * file named otherwise. It names the generated class, an `IContainerModule`
   * (`ProductionBundle`, see {@link toClassName}).
   */
  name?: string;
  /**
   * The tsconfig whose `paths` aliases `glob.paths` may name and generated imports are
   * written in, and whose `moduleResolution` sets the import extension. It contributes
   * nothing else: the files scanned are `glob.paths` alone. Relative to the config file.
   * Default `./tsconfig.json`, which may be absent; a tsconfig named here must exist.
   */
  tsconfig?: string;
  /** Extension of generated imports. Inferred from the tsconfig's `moduleResolution` when omitted. */
  importExtension?: string;
  /** Which files are parsed: the folders in `glob.paths`, minus {@link DEFAULT_EXCLUDE} unless `exclude` says otherwise. */
  glob: GlobSelector;
  /** Which classes of a parsed file are registered. Default: every exported class. */
  className?: ClassSelector;
}

export const DEFAULT_TSCONFIG = './tsconfig.json';
/** What `className.decorators` requires when omitted: the library's own `@register`. */
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
  /** Its folder: what the config's relative paths resolve against. */
  dir: string;
  /** The bundle name: `production` for `production.bundle.json`. */
  name: string;
  /** The generated class: `ProductionBundle`. */
  bundleClassName: string;
  /** The tsconfig of `paths` aliases; `required` when the config names it, so it must exist. */
  tsconfig: { file: string; required: boolean };
  importExtension?: string;
  glob: ResolvedGlobSelector;
  className: ResolvedClassSelector;
  /** Non-fatal problems found while resolving, e.g. a `glob.exclude` that drops a default test glob. */
  warnings: string[];
}

const BUNDLE_NAME = /^[A-Za-z][\w-]*$/;

// Each schema carries the message a config author reads, so a failed parse names
// the field and what it expected: `className.export: expected "any", "named" or "default"`.
const expected = (what: string) => ({ error: `expected ${what}` });
const nonEmptyString = () => z.string(expected('a non-empty string')).min(1, expected('a non-empty string'));
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

/**
 * A list of non-empty strings, validated as one value so a bad element is reported at the
 * list (`include: expected an array of strings`), as the config author wrote it. Its JSON
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

/** One glob or a non-empty list of them, validated as one value like {@link strings}. */
const globs = () =>
  z
    .custom<string | string[]>(
      (value) => isNonEmptyString(value) || (Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString)),
      expected('a glob or a non-empty array of globs'),
    )
    .meta({
      anyOf: [
        { type: 'string', minLength: 1 },
        { type: 'array', items: { type: 'string', minLength: 1 }, minItems: 1 },
      ],
    });
const toGlobs = (value?: string | string[]): RegExp[] | undefined =>
  value === undefined ? undefined : (Array.isArray(value) ? value : [value]).map(globToRegExp);

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

const GLOB_SCHEMA = z
  .strictObject(
    {
      paths: z
        .array(PATH_SCHEMA, expected('a non-empty array'))
        .min(1, expected('a non-empty array'))
        .describe(
          'Folders to scan: paths relative to the config file (./src/services) or tsconfig paths aliases (@app/services). Sub-folders are scanned too unless an entry says { "path": "...", "recursive": false }.',
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
    'Which files this bundle reads and parses — decided by path alone, before parsing. `paths` are the folders the files come from; within them a file is parsed when it matches one of `include` and none of `exclude`. Globs are relative to the config file. With a file naming convention, `include` keeps every other file unread.',
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
      glob: globs()
        .optional()
        .describe(
          'Glob, or globs, the class name must match one of, e.g. "*Service" or ["*Service", "*Repository"]. An anonymous default export is named after its file.',
        ),
      exclude: globs()
        .optional()
        .describe(
          'Glob, or globs, the class name must match none of, applied after every other criterion. A plain name is a glob too: ["MockUserRepository", "*Fake"].',
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
    name: z
      .string(expected('letters, digits, "-" or "_", starting with a letter'))
      .regex(BUNDLE_NAME, expected('letters, digits, "-" or "_", starting with a letter'))
      .optional()
      .describe(
        'The bundle\'s name: letters, digits, "-" and "_", starting with a letter. Default: the config file\'s stem (production.bundle.json → production); required for a config file named otherwise. It names the generated IContainerModule class (ProductionBundle).',
      ),
    // Optional rather than defaulted: a tsconfig the config names must exist, the default may be absent.
    tsconfig: nonEmptyString()
      .optional()
      .meta({ default: DEFAULT_TSCONFIG })
      .describe(
        'The tsconfig whose `paths` aliases glob.paths may name and generated imports are written in, and whose module resolution sets the import extension. It adds no files: the bundle scans glob.paths alone. Relative to the config file. The default may be absent; a tsconfig named here must exist.',
      ),
    importExtension: z
      .string(expected('a string'))
      .optional()
      .describe(
        'Extension of generated imports, e.g. ".js". Inferred from the tsconfig: ".js" under node16/nodenext resolution, none otherwise.',
      ),
    glob: GLOB_SCHEMA,
    className: CLASSES_SCHEMA.optional(),
  },
  expected('an object'),
);

type ParsedConfig = z.output<typeof BUNDLE_CONFIG_SCHEMA>;

/** `['className', 'export']` -> `className.export`, `['glob', 'paths', 0]` -> `glob.paths[0]`; the root is `config`. */
function formatPath(segments: PropertyKey[]): string {
  const formatted = segments
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : `.${String(segment)}`))
    .join('')
    .replace(/^\./, '');
  return formatted || 'config';
}

/**
 * A union failure names the union unless the value had the type of one branch: an
 * object path without `path` reports `glob.paths[0].path`, not `glob.paths[0]`.
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

function toGlobSelector(glob: ParsedConfig['glob']): ResolvedGlobSelector {
  return {
    paths: glob.paths.map((entry) => (typeof entry === 'string' ? { path: entry, recursive: true } : entry)),
    include: glob.include?.map(globToRegExp),
    exclude: glob.exclude.map(globToRegExp),
  };
}

function toClassSelector(classes: ParsedConfig['className']): ResolvedClassSelector {
  if (classes === undefined) return { export: 'any', decorators: DEFAULT_DECORATORS };
  const { decorators, glob, exclude, ...rest } = classes;
  return {
    ...rest,
    // `[]` is the explicit opt-out: no decorator required.
    decorators: decorators.length > 0 ? decorators : undefined,
    glob: toGlobs(glob),
    exclude: toGlobs(exclude),
  };
}

/**
 * Warns when an explicit, non-empty `glob.exclude` omits one of the {@link DEFAULT_EXCLUDE}
 * globs, since that silently drops test files (or `node_modules`) from the scan.
 * An empty `exclude` is a deliberate opt-out and does not warn.
 */
function excludeWarnings(glob: ParsedConfig['glob']): string[] {
  const { exclude } = glob;
  if (exclude.length === 0) return [];
  const missing = DEFAULT_EXCLUDE.filter((glob) => !exclude.includes(glob));
  if (missing.length === 0) return [];
  return [
    `glob.exclude replaces the default excludes and omits ${missing.map((glob) => `"${glob}"`).join(', ')}; ` +
      `add them back`,
  ];
}

/**
 * A config file is named `<name>.bundle.json`, `<name>.bundle.yaml` or `<name>.bundle.yml`
 * by convention, e.g. `app.bundle.json`; any `.json` / `.yaml` / `.yml` file works.
 */
export const CONFIG_FILE_SUFFIXES = ['.bundle.json', '.bundle.yaml', '.bundle.yml'];

/** `production.bundle.yaml` -> `production`; `undefined` for a file named otherwise, e.g. `di.json`. */
function configStem(file: string): string | undefined {
  const base = path.basename(file);
  const suffix = CONFIG_FILE_SUFFIXES.find((candidate) => base.endsWith(candidate));
  const stem = suffix ? base.slice(0, -suffix.length) : '';
  return BUNDLE_NAME.test(stem) ? stem : undefined;
}

/** What stands for standard input where a config file is expected: `tic build -`. */
export const STDIN = '-';

/** The format of a config file, by extension; `undefined` for any other file. */
export const configFormat = (file: string): ConfigFormat | undefined =>
  file.endsWith('.json') ? 'json' : file.endsWith('.yaml') || file.endsWith('.yml') ? 'yaml' : undefined;

/** The format of config text: JSON or YAML. */
export type ConfigFormat = 'json' | 'yaml';

/**
 * Parses config text in its format. An empty YAML document is `{}`.
 *
 * @throws {TicConfigError} when the text is not valid in its format.
 */
export function parseConfig(text: string, format: ConfigFormat): unknown {
  try {
    return format === 'yaml' ? (parseYaml(text) ?? {}) : JSON.parse(text);
  } catch (e) {
    throw new TicConfigError(`not valid ${format.toUpperCase()}: ${(e as Error).message}`);
  }
}

/** The generated class for a bundle name: `production` -> `ProductionBundle`, `my-app_v2` -> `MyAppV2Bundle`. */
export function toClassName(name: string): string {
  const words = name.split(/[-_]+/).filter(Boolean);
  return `${words.map((word) => word[0].toUpperCase() + word.slice(1)).join('')}Bundle`;
}

/**
 * Validates parsed config content and resolves its paths against `file`'s directory.
 * Without a `name` the bundle is named after the file: `production.bundle.json` -> `production`.
 *
 * @throws {TicConfigError} when the content does not match the config shape, or names no bundle; the message names the field.
 */
export function resolveConfig(content: unknown, file: string): ResolvedConfig {
  const result = BUNDLE_CONFIG_SCHEMA.safeParse(content);
  if (!result.success) throw new TicConfigError(formatIssues(result.error));
  const { name, tsconfig, importExtension, glob, className } = result.data;
  const bundleName = name ?? configStem(file);
  if (bundleName === undefined) {
    throw new TicConfigError(
      path.basename(file) === STDIN
        ? 'name: required for a config read from stdin'
        : `name: required when the config file is not named <name>${CONFIG_FILE_SUFFIXES.join(' / ')}`,
    );
  }
  const dir = path.dirname(file);
  return {
    file,
    dir,
    name: bundleName,
    bundleClassName: toClassName(bundleName),
    tsconfig: { file: path.resolve(dir, tsconfig ?? DEFAULT_TSCONFIG), required: tsconfig !== undefined },
    importExtension,
    glob: toGlobSelector(glob),
    className: toClassSelector(className),
    warnings: excludeWarnings(glob),
  };
}
