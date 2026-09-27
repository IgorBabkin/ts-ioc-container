import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG_FILE, loadConfig, type ResolvedConfig, type ResolvedBundle } from './config';
import { emitBundle } from './emit';
import { globToRegExp, toPosix } from './glob';
import { ImportPaths } from './ImportPaths';
import { type ExportPredicate, findConventionalExportPredicate, loadExportPredicate } from './exportPredicate';
import { fileTags, findConventionalPredicate, type InclusionPredicate, loadInclusionPredicate } from './inclusion';
import { findClasses, listSourceFiles } from './scan';

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
  const generated = resolved.bundles.map((bundle) =>
    generate(resolved, bundle, paths, { include: includeFor(bundle), filterExports: filterExportsFor(bundle) }),
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
  return { config: resolved.file, outputs };
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

  const classes = [...files]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .flatMap((file) => findClasses(file, bundle.select))
    .filter((cls) => {
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
  return { bundle, content, registrations: classes.length };
}
