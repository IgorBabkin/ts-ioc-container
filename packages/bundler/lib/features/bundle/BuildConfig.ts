import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { TicConfigError } from '../../exceptions/DomainException';
import { globToRegExp } from './domain/glob';

/** Which exports of a file count: both kinds, only named exports, or only the default export. */
export type ExportKind = 'any' | 'named' | 'default';

/**
 * Which classes of a parsed file are registered: the second stage of selection,
 * run on the files `include` and `exclude` let through. A class is selected when
 * it is exported, not abstract, and meets every criterion set here.
 */
export interface ClassSelector {
  export: ExportKind;
  /**
   * The class must carry one of these decorators, recognised by name (`register`, or a
   * composed one); `[]` requires none.
   */
  decorators: string[];
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

/** A {@link ClassSelector} with its globs compiled. */
export interface ResolvedClassSelector {
  export: ExportKind;
  decorators?: string[];
  glob?: RegExp[];
  exclude?: RegExp[];
}

/**
 * A bundle config file: one bundle, described explicitly. Nothing is implied: every field but
 * `$schema`, `extends`, `match.glob` and `match.exclude` is required — though in a config merged with
 * others, only the merged config must have it (see {@link mergeConfigs}).
 * `tic build --tsconfig tsconfig.json <config>` prints the bundle to stdout; where it is saved
 * is the caller's choice (`tic build --tsconfig tsconfig.json app.bundle.json > src/di/app.bundle.ts`).
 */
export interface BundleConfigFile {
  $schema?: string;
  /**
   * Path of the config this one builds on, relative to this file and in the same folder. That
   * config is merged first and this one on top of it, see {@link mergeConfigs}.
   */
  extends?: string;
  /**
   * The name of the generated class, an `IContainerModule`, written as given: `ProductionBundle`.
   * Letters, digits and `_`, starting with a capital letter.
   */
  bundleClassName: string;
  /** Extension of generated imports, written as given: `.js` under node16/nodenext resolution, `''` for none. */
  importExtension: string;
  /**
   * Folder, or folders, to scan recursively: relative to the config file (`./src/services`),
   * or tsconfig `paths` aliases (`@app/services`). The first, cheap stage of selection, decided
   * by path alone.
   */
  include: string | string[];
  /**
   * Glob, or globs, of files never read within `include`: relative to the config file and
   * `/`-separated, or starting with a tsconfig `paths` alias (`@generated/**`, or `@generated`
   * for the whole folder). `[]` excludes nothing.
   */
  exclude: string | string[];
  /** Which classes of a parsed file are registered. Always an object: there is no glob shorthand. */
  match: ClassSelector;
}

/** A validated {@link BundleConfigFile}, located at its file. */
export interface BundleConfig {
  /** The config file itself. */
  file: string;
  /** Its folder: what the config's relative paths resolve against. */
  dir: string;
  /** The generated class: `ProductionBundle`. */
  bundleClassName: string;
  importExtension: string;
  /** The folders to scan, as written in the config. */
  include: string[];
  /** As written in the config: an alias in one is resolved, and the glob compiled, once the tsconfig is loaded. */
  exclude: string[];
  match: ResolvedClassSelector;
}

// A capital first letter keeps every TypeScript keyword out.
const CLASS_NAME = /^[A-Z]\w*$/;

// Each schema carries the message a config author reads, so a failed parse names
// the field and what it expected: `match.export: expected "any", "named" or "default"`.
const expected = (what: string) => ({ error: `expected ${what}` });
const CLASS_NAME_RULE = 'a class name: letters, digits or "_", starting with a capital letter';
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

const FOLDERS_SCHEMA = z.array(nonEmptyString(), expected('a non-empty array')).min(1, expected('a non-empty array'));

const CLASS_OBJECT_SCHEMA = z.strictObject(
  {
    export: z
      .enum(['any', 'named', 'default'], expected('"any", "named" or "default"'))
      .describe('Which exports count.'),
    decorators: stringList().describe(
      'The class must carry one of these decorators, recognised by name (e.g. "register", or a composed decorator); [] requires none.',
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

const MATCH_DESCRIPTION =
  'Which classes of a parsed file are registered: a class is selected when it is exported, not abstract, and meets every criterion set here.';

/**
 * One `*.bundle.json` / `*.bundle.yaml`. The published `tic.schema.json` is generated
 * from it (`ticConfigJsonSchema`), so the schema editors validate against cannot drift
 * from what `tic build` accepts.
 */
export const BUNDLE_CONFIG_SCHEMA = z.strictObject(
  {
    $schema: z.string().optional(),
    bundleClassName: z
      .string(expected(CLASS_NAME_RULE))
      .regex(CLASS_NAME, expected(CLASS_NAME_RULE))
      .describe(
        'The name of the generated IContainerModule class, written as given: ProductionBundle. Letters, digits and "_", starting with a capital letter.',
      ),
    importExtension: z
      .string(expected('a string'))
      .describe(
        'Extension of generated imports, written as given: ".js" under node16/nodenext resolution, "" for none.',
      ),
    include: z
      .union([nonEmptyString(), FOLDERS_SCHEMA], expected('a folder or a non-empty array of folders'))
      .describe(
        'Folder, or folders, to scan, sub-folders included: paths relative to the config file (./src/services) or tsconfig paths aliases (@app/services).',
      ),
    exclude: globList('a glob or an array of globs', 0).describe(
      'Glob, or globs, of files never read within include, relative to the config file or starting with a tsconfig paths alias (@generated/**, or @generated for the whole folder). [] excludes nothing.',
    ),
    match: CLASS_OBJECT_SCHEMA.describe(MATCH_DESCRIPTION),
  },
  expected('an object'),
);

/**
 * One config file among several merged into one bundle: it may leave any field to another —
 * only the merged config must have them all. It alone may set `extends`, which is gone once
 * configs are merged. The published `tic.schema.json` is generated
 * from it, so editors accept a shared config.
 */
export const BUNDLE_CONFIG_FILE_SCHEMA = BUNDLE_CONFIG_SCHEMA.partial().extend({
  extends: nonEmptyString()
    .optional()
    .describe(
      'Path of the config this one builds on, relative to this file and in the same folder. That config is merged first and this one on top of it.',
    ),
  match: CLASS_OBJECT_SCHEMA.partial().optional().describe(`${MATCH_DESCRIPTION} Required in the merged config.`),
});

/** `['match', 'export']` -> `match.export`, `['include', 0]` -> `include[0]`; the root is `config`. */
function formatPath(segments: PropertyKey[]): string {
  const formatted = segments
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : `.${String(segment)}`))
    .join('')
    .replace(/^\./, '');
  return formatted || 'config';
}

/**
 * A union failure names the union unless the value had the type of one branch: an
 * object path without `path` reports `include[0].path`, not `include[0]`.
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

type ParsedMatch = z.output<typeof CLASS_OBJECT_SCHEMA>;

function toClassSelector({ decorators, glob, exclude, ...rest }: ParsedMatch): ResolvedClassSelector {
  return {
    ...rest,
    // `[]` is the explicit opt-out: no decorator required.
    decorators: decorators.length > 0 ? decorators : undefined,
    glob: toGlobs(glob),
    exclude: toGlobs(exclude),
  };
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

/** The fields whose values concatenate when configs merge; every other value is replaced. */
const LIST_FIELDS = new Set(['include', 'exclude', 'match.decorators', 'match.glob', 'match.exclude']);

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

/**
 * The absolute path of the config `content` extends, resolved against `file`'s folder;
 * `undefined` when it extends none.
 *
 * @throws {TicConfigError} when `extends` is not a non-empty string.
 */
export function extendedFile(content: unknown, file: string): string | undefined {
  const parent = isObject(content) ? content.extends : undefined;
  if (parent === undefined) return undefined;
  if (!isNonEmptyString(parent)) throw new TicConfigError('extends: expected a non-empty string');
  return path.resolve(path.dirname(file), parent);
}

/**
 * Merges the contents of several config files into one, left to right, as webpack-merge
 * does: objects merge field by field, a list field — `include`, `exclude`,
 * `match.glob`, `match.exclude`, `match.decorators` — concatenates without duplicates
 * (one glob or folder counting as a list of one), and any other value set by a later file
 * replaces an earlier one. Each file is validated alone first, so a shared file may leave any
 * field out; the merged config must have them all.
 *
 * @throws {TicConfigError} when a file's content does not match the config file shape; the message names the file and the field.
 */
export function mergeConfigs(configs: { file: string; content: unknown }[]): unknown {
  return configs.reduce<ConfigObject>((merged, { file, content }) => {
    const result = BUNDLE_CONFIG_FILE_SCHEMA.safeParse(content);
    if (!result.success) throw new TicConfigError(`${path.basename(file)}: ${formatIssues(result.error)}`);
    const { extends: _parent, ...fields } = content as ConfigObject;
    return mergeInto(merged, fields);
  }, {});
}

/**
 * Validates parsed config content and locates it at `file`, whose directory its relative paths resolve against.
 *
 * @throws {TicConfigError} when the content does not match the config shape; the message names the field.
 */
export function resolveConfig(content: unknown, file: string): BundleConfig {
  const result = BUNDLE_CONFIG_SCHEMA.safeParse(content);
  if (!result.success) throw new TicConfigError(formatIssues(result.error));
  const { bundleClassName, importExtension, include, exclude, match } = result.data;
  return {
    file,
    dir: path.dirname(file),
    bundleClassName,
    importExtension,
    include: toList(include),
    exclude: toList(exclude),
    match: toClassSelector(match),
  };
}
