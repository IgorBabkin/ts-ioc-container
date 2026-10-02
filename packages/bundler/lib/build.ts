import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG_FILE, loadConfig, type ResolvedConfig, type ResolvedBundle } from './config';
import { emitBundle } from './emit';
import { globToRegExp, toPosix } from './glob';
import { ImportPaths, normalizeAliasName } from './ImportPaths';
import { type ExportPredicate, findConventionalExportPredicate, loadExportPredicate } from './exportPredicate';
import { fileTags, findConventionalPredicate, type InclusionPredicate, loadInclusionPredicate } from './inclusion';
import { findClasses, listSourceFiles, type DiscoveredClass } from './scan';

export interface BuildOptions {
  /** Path of `tic.config.json`, relative to `cwd`. Default `tic.config.json`. */
  config?: string;
  /** Default `process.cwd()`. */
  cwd?: string;
  /** Compare instead of writing: outputs that would change are reported `stale`. */
  check?: boolean;
  /** Decides which scanned files take part; overrides every inclusion predicate file. */
  include?: InclusionPredicate;
  /** Decides which parsed classes become registrations; overrides every export predicate file. */
  filterExports?: ExportPredicate;
}

/** `written` / `unchanged` after a build; `stale` / `unchanged` after a check. */
export type OutputStatus = 'written' | 'unchanged' | 'stale';

export interface OutputResult {
  /** Absolute path of the generated file. */
  file: string;
  /** Name of the generated class. */
  bundle: string;
  status: OutputStatus;
  registrations: number;
  content: string;
}

export interface BuildResult {
  /** Absolute path of the config that was built. */
  config: string;
  outputs: OutputResult[];
  /**
   * Non-fatal problems found while building, e.g. an `exclude` that drops a default
   * test glob or two selected classes passing the same decorator token. Each warning
   * names the bundle field it belongs to.
   */
  warnings: string[];
}

/**
 * Generates one bundle per config entry. Every bundle is generated before any
 * file is written, so a failing namespace leaves the previous outputs intact.
 *
 * @throws {TicConfigError} when the config, the tsconfig or a predicate file it names is missing or invalid.
 * @throws {NamespaceNotFoundError} when a namespace is neither a folder nor a tsconfig paths alias of one.
 */
export function build({
  config = DEFAULT_CONFIG_FILE,
  cwd = process.cwd(),
  check = false,
  include,
  filterExports,
}: BuildOptions = {}): BuildResult {
  const resolved = loadConfig(path.resolve(cwd, config));
  const paths = ImportPaths.load(resolved.tsconfig, resolved.importExtension);
  const includeFor = predicateResolver({
    override: include,
    conventional: findConventionalPredicate(resolved.dir),
    fileOf: (bundle) => bundle.include,
    load: loadInclusionPredicate,
  });
  const filterExportsFor = predicateResolver({
    override: filterExports,
    conventional: findConventionalExportPredicate(resolved.dir),
    fileOf: (bundle) => bundle.filterExports,
    load: loadExportPredicate,
  });
  const generated = resolved.bundles.map((bundle, i) =>
    generate(resolved, bundle, `bundles[${i}]`, paths, {
      include: includeFor(bundle),
      filterExports: filterExportsFor(bundle),
    }),
  );

  const outputs = generated.map(({ bundle, content, registrations }): OutputResult => {
    const current = existsSync(bundle.output) ? readFileSync(bundle.output, 'utf8') : undefined;
    const status: OutputStatus = current === content ? 'unchanged' : check ? 'stale' : 'written';
    if (status === 'written') {
      mkdirSync(path.dirname(bundle.output), { recursive: true });
      writeFileSync(bundle.output, content);
    }
    return { file: bundle.output, bundle: bundle.name, status, registrations, content };
  });
  return {
    config: resolved.file,
    outputs,
    warnings: [...resolved.warnings, ...generated.flatMap((g) => g.warnings)],
  };
}

/**
 * Which predicate of one kind a bundle uses: the one passed to `build`, else the bundle's own file,
 * else the conventional file next to the config, else none. Each file is loaded once, and only when
 * a bundle needs it.
 *
 * @throws {TicConfigError} when a predicate file a bundle needs is missing or does not export a function.
 */
function predicateResolver<P>({
  override,
  conventional,
  fileOf,
  load,
}: {
  override?: P;
  conventional?: string;
  fileOf: (bundle: ResolvedBundle) => string | undefined;
  load: (file: string) => P;
}) {
  const loaded = new Map<string, P>();
  return (bundle: ResolvedBundle): P | undefined => {
    if (override) return override;
    const file = fileOf(bundle) ?? conventional;
    if (file === undefined) return undefined;
    if (!loaded.has(file)) loaded.set(file, load(file));
    return loaded.get(file);
  };
}

/**
 * @throws {NamespaceNotFoundError} when a namespace is neither a folder nor a tsconfig paths alias of one.
 */
function generate(
  config: ResolvedConfig,
  bundle: ResolvedBundle,
  field: string,
  paths: ImportPaths,
  { include, filterExports }: { include?: InclusionPredicate; filterExports?: ExportPredicate },
) {
  const relative = (file: string) => toPosix(path.relative(config.dir, file));
  const outputs = new Set(config.bundles.map((m) => m.output));
  const excludes = bundle.exclude.map(globToRegExp);
  const isExcluded = (file: string) => {
    if (outputs.has(file)) return true;
    const filename = relative(file);
    return excludes.some((glob) => glob.test(filename)) || (include !== undefined && !include({ filename }));
  };

  const files = new Set<string>();
  for (const namespace of bundle.namespaces) {
    const dir = paths.resolveNamespace(namespace.path, config.dir);
    for (const file of listSourceFiles(dir, namespace.recursive, isExcluded)) files.add(file);
  }

  const excludedAliases = new Set((bundle.select.excludeAliases ?? []).map(normalizeAliasName));
  const isAliasExcluded = (file: string) => {
    if (excludedAliases.size === 0) return false;
    const alias = paths.aliasName(file);
    return alias !== undefined && excludedAliases.has(alias);
  };

  const classes = [...files]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .flatMap((file) => findClasses(file, bundle.select))
    .filter((cls) => {
      if (isAliasExcluded(cls.file)) return false;
      if (!filterExports) return true;
      const filename = relative(cls.file);
      const { exportName, className, isDefault, decorators } = cls;
      return filterExports({ filename, exportName, className, isDefault, decorators, tags: fileTags(filename) });
    })
    .map((cls) => ({ ...cls, specifier: paths.specifier(bundle.output, cls.file) }));

  const content = emitBundle({
    name: bundle.name,
    configPath: toPosix(path.relative(path.dirname(bundle.output), config.file)),
    namespaces: bundle.namespaces.map((ns) => ns.path),
    classes,
  });
  return { bundle, content, registrations: classes.length, warnings: tokenCollisions(classes, field) };
}

/**
 * A heuristic for "two selected classes bind the same token": when the decorator's
 * first argument is a plain identifier, equal identifiers are almost always the same
 * token, and registration is last-wins, so one silently replaces the other. Purely
 * syntactic — aliased imports and computed keys are not resolved.
 *
 * Scope-gated classes (`@perPage('stations')`, `@perPage('sessions')`) share the
 * token but are not last-wins: the classes are distinguished by a decorator they
 * share called with different arguments, so each scope registers its own. Those
 * groups are not warned about.
 */
function tokenCollisions(classes: DiscoveredClass[], field: string): string[] {
  const owners = new Map<string, DiscoveredClass[]>();
  for (const cls of classes) {
    for (const token of cls.tokens) {
      const group = owners.get(token) ?? [];
      if (!group.some((owner) => owner.className === cls.className)) group.push(cls);
      owners.set(token, group);
    }
  }
  return [...owners]
    .filter(([, group]) => group.length > 1 && !scopeDisjoint(group))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([token, group]) => {
      const names = group.map((cls) => cls.className);
      return (
        `${field}: decorator token "${token}" is passed by ${names.join(', ')}; ` +
        `registration is last-wins, exclude one with select.excludeClasses`
      );
    });
}

/**
 * Whether a decorator shared by every class in a colliding group is called with
 * different arguments, e.g. `@perPage('stations')` vs `@perPage('sessions')`. Such
 * classes are scope-gated, not last-wins. Purely syntactic.
 */
function scopeDisjoint(group: DiscoveredClass[]): boolean {
  const [first, ...rest] = group;
  return first.decoratorCalls.some(({ name, args }) =>
    rest.every((cls) => {
      const same = cls.decoratorCalls.find((call) => call.name === name);
      return same !== undefined && same.args.join('\u0000') !== args.join('\u0000');
    }),
  );
}
