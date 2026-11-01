import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { TicConfigError } from '../../exceptions/DomainException';
import { globToRegExp } from './domain/glob';

/**
 * Which files a bundle reads and parses: the first, cheap stage of selection,
 * decided by path alone. `include` names the folders, files and globs the files come from,
 * and `tsconfig` adds the folders the `paths` aliases of the tsconfigs it names point to; of
 * them a file is parsed unless it matches one of `exclude`. Globs are relative to the config file
 * and `/`-separated.
 */
export interface PathSelector {
  /**
   * Path, or glob, of tsconfig files — or a list of them — whose `paths` aliases point to folders
   * to scan too: `./tsconfig.json`, or `./packages/*\/tsconfig.json` in a monorepo.
   * `"@app/*": ["./src/*"]` scans `./src`, `baseUrl` and `extends` followed; a tsconfig's
   * `include`, `exclude` and `files` play no part. `include` adds to them and `exclude`
   * applies to them. Imports are still written through the config's own `tsconfig`. No tsconfig
   * is scanned unless named here.
   */
  tsconfig?: string | string[];
  /**
   * What to scan: folders, with their sub-folders, relative to the config file (`./src/services`)
   * or tsconfig `paths` aliases (`@app/services`); source files (`./src/Clock.ts`); or globs of
   * files (`./src/**\/*.service.ts`), whose folder before the first wildcard may be an alias
   * (`@app/**\/*.service.ts`). Required unless `tsconfig` is given.
   */
  include?: string | string[];
  /**
   * Glob, or globs, of files never read; one may start with a tsconfig `paths` alias
   * (`@generated/**`, or `@generated` for the whole folder). Replaces {@link DEFAULT_EXCLUDE} when given.
   */
  exclude?: string | string[];
}

/** A {@link PathSelector} with its defaults filled in. */
export interface ResolvedPathSelector {
  /** Paths or globs of the tsconfigs whose alias folders are scanned too, as written in the config; empty for none. */
  tsconfig: string[];
  /** The folders, files and globs to scan, as written in the config; empty when it names none. */
  include: string[];
  /** As written in the config: an alias in one is resolved, and the glob compiled, once the tsconfig is loaded. */
  exclude: string[];
}

/** Which exports of a file count: both kinds, only named exports, or only the default export. */
export type ExportKind = 'any' | 'named' | 'default';

/**
 * Which classes of a parsed file are registered: the second stage of selection,
 * run on the files {@link PathSelector} let through. A class is selected when
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

/**
 * A bundle config file: one bundle, described explicitly — the folders it scans and the
 * classes it registers. `tic build <config>` prints the bundle to stdout; where it is
 * saved is the caller's choice (`tic build app.bundle.json > src/di/app.bundle.ts`).
 * `tic build common.bundle.yml prod.bundle.yml` merges several into one, left to right
 * (see {@link mergeConfigs}).
 */
export interface BundleConfigFile {
  $schema?: string;
  /**
   * The bundle's name: letters, digits, `-` and `_`, starting with a letter. Default: the
   * config file's stem (`production.bundle.json` -> `production`); required for a config
   * file named otherwise. It names the generated class, an `IContainerModule`
   * (`ProductionBundle`, see {@link toClassName}).
   */
  name?: string;
  /**
   * The tsconfig whose `paths` aliases `paths.include` may name and generated imports are
   * written in, and whose `moduleResolution` sets the import extension. It contributes
   * nothing else: the files scanned are named by `paths` (`paths.tsconfig` may name this one).
   * Relative to the config file. Default `./tsconfig.json`, which may be absent; a tsconfig
   * named here must exist.
   */
  tsconfig?: string;
  /** Extension of generated imports. Inferred from the tsconfig's `moduleResolution` when omitted. */
  importExtension?: string;
  /**
   * Which files are parsed: what `paths.include` names, and the alias folders of the tsconfigs
   * `paths.tsconfig` names, minus {@link DEFAULT_EXCLUDE} unless `exclude` says otherwise.
   * Always an object: there is no folder or folder-list shorthand. Required, with `include` or
   * `tsconfig` — though in a config merged with others, only the merged config must have it.
   */
  paths: PathSelector;
  /**
   * Which classes of a parsed file are registered. Default: every exported class decorated
   * with `@register`. A glob or a list of globs is shorthand for `{ glob }`.
   */
  match?: string | string[] | ClassSelector;
}

export const DEFAULT_TSCONFIG = './tsconfig.json';
/** The name of a bundle `tic build` makes of a tsconfig or of paths, without a config file: `AppBundle`. */
export const DEFAULT_BUNDLE_NAME = 'app';
/** What `match.decorators` requires when omitted: the library's own `@register`. */
export const DEFAULT_DECORATORS = ['register'];
export const DEFAULT_EXCLUDE = [
  '**/*.spec.ts',
  '**/*.test.ts',
  '**/*.spec.tsx',
  '**/*.test.tsx',
  '**/__tests__/**',
  '**/node_modules/**',
];

/** A {@link BundleConfigFile} whose defaults are filled in and whose paths are absolute. */
export interface BundleConfig {
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
  paths: ResolvedPathSelector;
  match: ResolvedClassSelector;
  /** Non-fatal problems found while resolving, e.g. a `paths.exclude` that drops a default test glob. */
  warnings: string[];
}

const BUNDLE_NAME = /^[A-Za-z][\w-]*$/;

// Each schema carries the message a config author reads, so a failed parse names
// the field and what it expected: `match.export: expected "any", "named" or "default"`.
const expected = (what: string) => ({ error: `expected ${what}` });
const nonEmptyString = () => z.string(expected('a non-empty string')).min(1, expected('a non-empty string'));
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

/**
 * A list of non-empty strings, validated as one value so a bad element is reported at the
 * list (`decorators: expected an array of strings`), as the config author wrote it. Its JSON
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

/** One glob or a list of them, validated as one value like {@link strings}; a list may be empty only when `minItems` is 0. */
const globList = (what: string, minItems: number) =>
  z
    .custom<string | string[]>(
      (value) =>
        isNonEmptyString(value) || (Array.isArray(value) && value.length >= minItems && value.every(isNonEmptyString)),
      expected(what),
    )
    .meta({
      anyOf: [
        { type: 'string', minLength: 1 },
        { type: 'array', items: { type: 'string', minLength: 1 }, ...(minItems > 0 && { minItems }) },
      ],
    });
const globs = () => globList('a glob or a non-empty array of globs', 1);
const toList = (value: string | string[]): string[] => (Array.isArray(value) ? value : [value]);
const toGlobs = (value?: string | string[]): RegExp[] | undefined =>
  value === undefined ? undefined : toList(value).map(globToRegExp);

const PATH_LIST_SCHEMA = z.array(nonEmptyString(), expected('a non-empty array')).min(1, expected('a non-empty array'));

const PATHS_DESCRIPTION =
  'Which files this bundle reads and parses — decided by path alone, before parsing. `include` names the folders, files and globs the files come from, and `tsconfig` adds the folders the paths aliases of the tsconfigs it names point to; of them a file is parsed unless it matches one of `exclude`. Globs are relative to the config file.';

const PATHS_SCHEMA = z
  .strictObject(
    {
      tsconfig: globs()
        .optional()
        .describe(
          'Path, or glob, of tsconfig files — or a list of them — whose paths aliases point to folders to scan too: ./tsconfig.json, or ./packages/*/tsconfig.json. "@app/*": ["./src/*"] scans ./src, baseUrl and extends followed; a tsconfig\'s include, exclude and files play no part. include adds to them, exclude applies to them. Relative to the config file. Imports are still written through the config\'s own tsconfig.',
        ),
      include: z
        .union([nonEmptyString(), PATH_LIST_SCHEMA], expected('a path or a non-empty array of paths'))
        .optional()
        .describe(
          'What to scan: folders, sub-folders included, relative to the config file (./src/services) or tsconfig paths aliases (@app/services); source files (./src/Clock.ts); or globs of files (./src/**/*.service.ts, @app/**/*.service.ts). Required unless tsconfig is given.',
        ),
      exclude: globList('a glob or an array of globs', 0)
        .default(DEFAULT_EXCLUDE)
        .describe(
          'Glob, or globs, of files never read, relative to the config file or starting with a tsconfig paths alias (@generated/**, or @generated for the whole folder). Replaces the default when given. A non-empty value that omits a default glob makes `tic build` warn.',
        ),
    },
    expected('an object with "include" or "tsconfig"'),
  )
  .describe(PATHS_DESCRIPTION);

const CLASS_OBJECT_SCHEMA = z.strictObject(
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
);

const CLASSES_SCHEMA = z
  .union(
    [
      nonEmptyString().describe(
        'One class-name glob, with the default export and decorators: shorthand for { "glob": "..." }.',
      ),
      z
        .array(nonEmptyString(), expected('a non-empty array'))
        .min(1, expected('a non-empty array'))
        .describe('Class-name globs, with the default export and decorators: shorthand for { "glob": [...] }.'),
      CLASS_OBJECT_SCHEMA,
    ],
    expected('a glob, a non-empty array of globs or an object'),
  )
  .describe(
    'Which classes of a parsed file are registered. A class is selected when it is exported, not abstract, and meets every criterion set here; by default that is every exported class decorated with @register. A glob, or a list of globs, is shorthand for { "glob": ... }.',
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
        'The tsconfig whose `paths` aliases paths.include may name and generated imports are written in, and whose module resolution sets the import extension. It adds no files: the bundle scans what paths names (paths.tsconfig may name this tsconfig). Relative to the config file. The default may be absent; a tsconfig named here must exist.',
      ),
    importExtension: z
      .string(expected('a string'))
      .optional()
      .describe(
        'Extension of generated imports, e.g. ".js". Inferred from the tsconfig: ".js" under node16/nodenext resolution, none otherwise.',
      ),
    paths: PATHS_SCHEMA,
    match: CLASSES_SCHEMA.optional(),
  },
  expected('an object'),
);

type ParsedConfig = z.output<typeof BUNDLE_CONFIG_SCHEMA>;

/**
 * One config file among several merged into one bundle: it may leave `paths.include`, or
 * `paths` altogether, to another — only the merged config must have it. The published
 * `tic.schema.json` is generated from it, so editors accept a shared config.
 */
export const BUNDLE_CONFIG_FILE_SCHEMA = BUNDLE_CONFIG_SCHEMA.extend({
  paths: PATHS_SCHEMA.partial().optional().describe(PATHS_DESCRIPTION),
});

/** `['match', 'export']` -> `match.export`, `['paths', 'include', 0]` -> `paths.include[0]`; the root is `config`. */
function formatPath(segments: PropertyKey[]): string {
  const formatted = segments
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : `.${String(segment)}`))
    .join('')
    .replace(/^\./, '');
  return formatted || 'config';
}

/**
 * A union failure names the union unless the value had the type of one branch: an
 * object path without `path` reports `paths.include[0].path`, not `paths.include[0]`.
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

type ParsedPaths = z.output<typeof PATHS_SCHEMA>;

function toPathSelector(paths: ParsedPaths): ResolvedPathSelector {
  return {
    tsconfig: paths.tsconfig === undefined ? [] : toList(paths.tsconfig),
    include: paths.include === undefined ? [] : toList(paths.include),
    exclude: toList(paths.exclude),
  };
}

function toClassSelector(match: ParsedConfig['match']): ResolvedClassSelector {
  if (match === undefined) return { export: 'any', decorators: DEFAULT_DECORATORS };
  // A glob, or a list of globs, is shorthand for `{ glob }` with the default export and decorators.
  if (typeof match === 'string' || Array.isArray(match)) {
    return { export: 'any', decorators: DEFAULT_DECORATORS, glob: toGlobs(match) };
  }
  const { decorators, glob, exclude, ...rest } = match;
  return {
    ...rest,
    // `[]` is the explicit opt-out: no decorator required.
    decorators: decorators.length > 0 ? decorators : undefined,
    glob: toGlobs(glob),
    exclude: toGlobs(exclude),
  };
}

/**
 * Warns when an explicit, non-empty `paths.exclude` omits one of the {@link DEFAULT_EXCLUDE}
 * globs, since that silently drops test files (or `node_modules`) from the scan.
 * An empty `exclude` is a deliberate opt-out and does not warn.
 */
function excludeWarnings(paths: ParsedPaths): string[] {
  const exclude = toList(paths.exclude);
  if (exclude.length === 0) return [];
  const missing = DEFAULT_EXCLUDE.filter((glob) => !exclude.includes(glob));
  if (missing.length === 0) return [];
  return [
    `paths.exclude replaces the default excludes and omits ${missing.map((glob) => `"${glob}"`).join(', ')}; ` +
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

/** The fields whose values concatenate when configs merge; every other value is replaced. */
const LIST_FIELDS = new Set([
  'paths.include',
  'paths.exclude',
  'paths.tsconfig',
  'match.decorators',
  'match.glob',
  'match.exclude',
]);

type ConfigObject = Record<string, unknown>;
const isObject = (value: unknown): value is ConfigObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function mergeInto(base: ConfigObject, next: ConfigObject, at = ''): ConfigObject {
  const merged = { ...base };
  for (const [key, value] of Object.entries(next)) {
    const field = `${at}${key}`;
    const previous = merged[key];
    if (LIST_FIELDS.has(field)) {
      merged[key] = [
        ...new Set([...toList((previous ?? []) as string | string[]), ...toList(value as string | string[])]),
      ];
    } else {
      merged[key] = isObject(previous) && isObject(value) ? mergeInto(previous, value, `${field}.`) : value;
    }
  }
  return merged;
}

/** The `match` shorthand as the object it stands for, so it merges field by field: `'*Service'` -> `{ glob: '*Service' }`. */
const expandMatch = ({ match, ...rest }: ConfigObject): ConfigObject =>
  match === undefined ? rest : { ...rest, match: isObject(match) ? match : { glob: match } };

/**
 * Merges the contents of several config files into one, left to right, as webpack-merge
 * does: objects merge field by field, a list field — `paths.include`, `paths.exclude`,
 * `paths.tsconfig`, `match.glob`, `match.exclude`, `match.decorators` — concatenates without duplicates
 * (one glob or folder counting as a list of one), and any other value set by a later file
 * replaces an earlier one. The `match` shorthand merges as `match.glob`. Each file is
 * validated alone first, so a shared file may leave out `paths`; defaults apply to the
 * merged config only, so a `paths.exclude` in any file replaces {@link DEFAULT_EXCLUDE}.
 *
 * @throws {TicConfigError} when a file's content does not match the config file shape; the message names the file and the field.
 */
export function mergeConfigs(configs: { file: string; content: unknown }[]): unknown {
  return configs.reduce<ConfigObject>((merged, { file, content }) => {
    const result = BUNDLE_CONFIG_FILE_SCHEMA.safeParse(content);
    if (!result.success) throw new TicConfigError(`${path.basename(file)}: ${formatIssues(result.error)}`);
    return mergeInto(merged, expandMatch(content as ConfigObject));
  }, {});
}

/**
 * Validates parsed config content and resolves its paths against `file`'s directory.
 * Without a `name` the bundle is named after the file: `production.bundle.json` -> `production`.
 * It must name what it scans: `paths.include`, or `paths.tsconfig`.
 *
 * @throws {TicConfigError} when the content does not match the config shape, names no bundle, or names nothing to scan; the message names the field.
 */
export function resolveConfig(content: unknown, file: string): BundleConfig {
  const result = BUNDLE_CONFIG_SCHEMA.safeParse(content);
  if (!result.success) throw new TicConfigError(formatIssues(result.error));
  const { name, tsconfig, importExtension, paths, match } = result.data;
  const bundleName = name ?? configStem(file);
  if (bundleName === undefined) {
    throw new TicConfigError(
      path.basename(file) === STDIN
        ? 'name: required for a config read from stdin'
        : `name: required when the config file is not named <name>${CONFIG_FILE_SUFFIXES.join(' / ')}`,
    );
  }
  if (paths.include === undefined && paths.tsconfig === undefined) {
    throw new TicConfigError('paths.include: required unless paths.tsconfig names a tsconfig to scan');
  }
  const dir = path.dirname(file);
  return {
    file,
    dir,
    name: bundleName,
    bundleClassName: toClassName(bundleName),
    tsconfig: {
      file: path.resolve(dir, tsconfig ?? DEFAULT_TSCONFIG),
      required: tsconfig !== undefined,
    },
    importExtension,
    paths: toPathSelector(paths),
    match: toClassSelector(match),
    warnings: excludeWarnings(paths),
  };
}
