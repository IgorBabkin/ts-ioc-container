import path from 'node:path';
import { z } from 'zod';
import { TicConfigError } from '../../exceptions/DomainException';
import { globToRegExp } from './domain/glob';

/** Which exports of a file count: both kinds, only named exports, or only the default export. */
export type ExportKind = 'any' | 'named' | 'default';

/**
 * Which classes of a parsed file are registered. A class is selected when it is
 * exported, not abstract, and meets every criterion set here; an empty rule
 * selects every exported class.
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

/**
 * `compilerOptions` of a bundle config: the tsconfig's own options plus the bundler's.
 * `importExtension` and `classes` are read by `tic build`; every other option (`paths`,
 * `baseUrl`, `rootDir`, `moduleResolution`, ...) is handed to TypeScript on top of the
 * extended tsconfig, exactly as a child tsconfig's would be.
 */
export interface BundleCompilerOptions {
  /** Extension of generated imports. Inferred from the tsconfig's `moduleResolution` when omitted. */
  importExtension?: string;
  /** Which classes of a scanned file are registered. Default: every exported class decorated with `@register`. */
  classes?: ClassSelector;
  [option: string]: unknown;
}

/**
 * The shape of `*.bundle.json`: one bundle, written as a tsconfig. `extends`, `include`,
 * `exclude` and `compilerOptions` mean what they mean in a tsconfig, so the files the bundle
 * scans are the files this config would compile; `output`, `name` and the bundler's
 * own compiler options describe the generated module. A project that needs several bundles
 * keeps one config file per bundle.
 */
export interface BundleConfig {
  $schema?: string;
  /**
   * The generated file, relative to the config file. Default `<root>/<name>.bundle.ts`:
   * `<root>` is the compiled `rootDir`, else the common folder of the files compiled.
   */
  output?: string;
  /**
   * The bundle's name: letters, digits, `-` and `_`, starting with a letter. Default: the
   * config file's stem (`production.bundle.json` -> `production`), else {@link DEFAULT_BUNDLE_NAME}.
   * It names the default output (`production.bundle.ts`) and the generated class,
   * an `IContainerModule` (`ProductionBundle`, see {@link toClassName}).
   */
  name?: string;
  /**
   * The tsconfig this config extends, as a tsconfig's own `extends`. Relative to the config
   * file. Default `./tsconfig.json`, which may be absent; a tsconfig named here must exist.
   */
  extends?: string;
  /** tsconfig `include`: replaces the extended tsconfig's. */
  include?: string[];
  /** tsconfig `exclude`: replaces the extended tsconfig's. {@link DEFAULT_EXCLUDE} applies regardless. */
  exclude?: string[];
  compilerOptions?: BundleCompilerOptions;
}

export const DEFAULT_EXTENDS = './tsconfig.json';
/** The bundle name when the config file gives none, e.g. building from `tsconfig.json` alone. */
export const DEFAULT_BUNDLE_NAME = 'base';
/** What `classes.decorators` requires when omitted: the library's own `@register`. */
export const DEFAULT_DECORATORS = ['register'];
/** Files never scanned, whatever the tsconfig compiles: tests, and anything under `node_modules`. */
export const DEFAULT_EXCLUDE = [
  '**/*.spec.ts',
  '**/*.test.ts',
  '**/*.spec.tsx',
  '**/*.test.tsx',
  '**/__tests__/**',
  '**/node_modules/**',
];

/** The tsconfig part of a bundle config, handed to TypeScript as a tsconfig of its own. */
export interface TsconfigOverrides {
  include?: string[];
  exclude?: string[];
  /** `compilerOptions` without the bundler's own options. */
  compilerOptions: Record<string, unknown>;
}

/** A {@link BundleConfig} whose defaults are filled in and whose paths are absolute. */
export interface ResolvedConfig {
  /** The config file itself. */
  file: string;
  dir: string;
  /** `undefined`: derived from what is compiled at build time (see {@link BundleConfig.output}). */
  output?: string;
  /** The bundle name: `production` for `production.bundle.json`. */
  name: string;
  /** The generated class: `ProductionBundle`. */
  className: string;
  /** The extended tsconfig; `required` when the config names it, so it must exist. */
  tsconfig: { file: string; required: boolean };
  /** What the config sets on top of {@link tsconfig}. */
  overrides: TsconfigOverrides;
  importExtension?: string;
  classes: ResolvedClassSelector;
}

const BUNDLE_NAME = /^[A-Za-z][\w-]*$/;

// Each schema carries the message a config author reads, so a failed parse names
// the field and what it expected: `classes.export: expected "any", "named" or "default"`.
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
    'Which classes of a scanned file are registered. A class is selected when it is exported, not abstract, and meets every criterion set here; by default that is every exported class decorated with @register.',
  );

const COMPILER_OPTIONS_SCHEMA = z
  .looseObject(
    {
      importExtension: z
        .string(expected('a string'))
        .optional()
        .describe(
          'Extension of generated imports, e.g. ".js". Inferred from the tsconfig: ".js" under node16/nodenext resolution, none otherwise.',
        ),
      classes: CLASSES_SCHEMA.optional(),
      paths: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe('tsconfig `paths`: aliases the generated imports are written in.'),
      rootDir: z
        .string()
        .optional()
        .describe('tsconfig `rootDir`: where the default output (<rootDir>/<name>.bundle.ts) goes.'),
    },
    expected('an object'),
  )
  .describe(
    "tsconfig `compilerOptions`, plus the bundler's own `importExtension` and `classes`. Every other option is handed to TypeScript on top of the extended tsconfig's, which validates it.",
  );

/** A list of tsconfig globs; TypeScript reports the bad ones. */
const tsconfigGlobs = (field: string) =>
  stringList().optional().describe(`tsconfig \`${field}\`: replaces the extended tsconfig's. Relative to this file.`);

/**
 * One `*.bundle.json` / `*.bundle.yaml`: a tsconfig with the bundler's fields. The published
 * `tic.schema.json` is generated from it (`ticConfigJsonSchema`), so the schema editors
 * validate against cannot drift from what `tic build` accepts.
 */
export const BUNDLE_CONFIG_SCHEMA = z.strictObject(
  {
    $schema: z.string().optional(),
    // Optional rather than defaulted: a tsconfig the config names must exist, the default may be absent.
    extends: nonEmptyString()
      .optional()
      .meta({ default: DEFAULT_EXTENDS })
      .describe(
        "The tsconfig this bundle extends, as a tsconfig's own `extends`: its file set, `paths` aliases and module resolution apply unless this file overrides them. Relative to this file. The default may be absent; a tsconfig named here must exist.",
      ),
    output: nonEmptyString()
      .optional()
      .describe(
        'The bundle file (convention: *.bundle.ts). Default `<root>/<name>.bundle.ts`: <root> is the compiled rootDir, else the common folder of the files compiled.',
      ),
    name: z
      .string(expected('letters, digits, "-" or "_", starting with a letter'))
      .regex(BUNDLE_NAME, expected('letters, digits, "-" or "_", starting with a letter'))
      .optional()
      .describe(
        'The bundle\'s name: letters, digits, "-" and "_", starting with a letter. Default: this file\'s stem (production.bundle.json → production), else "base". It names the default output (production.bundle.ts) and the generated IContainerModule class (ProductionBundle).',
      ),
    include: tsconfigGlobs('include'),
    exclude: tsconfigGlobs('exclude'),
    compilerOptions: COMPILER_OPTIONS_SCHEMA.optional(),
  },
  expected('an object'),
);

type CompilerOptions = NonNullable<z.output<typeof BUNDLE_CONFIG_SCHEMA>['compilerOptions']>;

/** `['compilerOptions', 'classes', 'export']` -> `compilerOptions.classes.export`; the root is `config`. */
function formatPath(segments: PropertyKey[]): string {
  const formatted = segments
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : `.${String(segment)}`))
    .join('')
    .replace(/^\./, '');
  return formatted || 'config';
}

function formatIssue(issue: z.core.$ZodIssue): string[] {
  if (issue.code === 'unrecognized_keys') {
    return issue.keys.map((key) => `${formatPath([...issue.path, key])}: unknown field`);
  }
  return [`${formatPath(issue.path)}: ${issue.message}`];
}

const formatIssues = (error: z.ZodError): string => error.issues.flatMap((issue) => formatIssue(issue)).join('; ');

function toClassSelector(classes: CompilerOptions['classes']): ResolvedClassSelector {
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
  const { output, name, extends: tsconfig, include, exclude, compilerOptions = {} } = result.data;
  const { importExtension, classes, ...tsCompilerOptions } = compilerOptions;
  const dir = path.dirname(file);
  const bundleName = name ?? configStem(file) ?? DEFAULT_BUNDLE_NAME;
  return {
    file,
    dir,
    output: output === undefined ? undefined : path.resolve(dir, output),
    name: bundleName,
    className: toClassName(bundleName),
    tsconfig: { file: path.resolve(dir, tsconfig ?? DEFAULT_EXTENDS), required: tsconfig !== undefined },
    overrides: { include, exclude, compilerOptions: tsCompilerOptions },
    importExtension,
    classes: toClassSelector(classes),
  };
}
