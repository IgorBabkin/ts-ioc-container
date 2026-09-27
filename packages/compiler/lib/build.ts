import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG_FILE, loadConfig, type ResolvedConfig, type ResolvedModule } from './config';
import { emitModule } from './emit';
import { globToRegExp, toPosix } from './glob';
import { ImportPaths } from './ImportPaths';
import { findConventionalPredicate, type InclusionPredicate, loadInclusionPredicate } from './inclusion';
import { findClasses, listSourceFiles } from './scan';

export interface BuildOptions {
  /** Path of `tic.config.json`, relative to `cwd`. Default `tic.config.json`. */
  config?: string;
  /** Default `process.cwd()`. */
  cwd?: string;
  /** Compare instead of writing: outputs that would change are reported `stale`. */
  check?: boolean;
  /** Decides which scanned files take part; overrides every predicate file. */
  include?: InclusionPredicate;
}

/** `written` / `unchanged` after a build; `stale` / `unchanged` after a check. */
export type OutputStatus = 'written' | 'unchanged' | 'stale';

export interface OutputResult {
  /** Absolute path of the generated file. */
  file: string;
  module: string;
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
 * Generates one module per config entry. Every module is generated before any
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
}: BuildOptions = {}): BuildResult {
  const resolved = loadConfig(path.resolve(cwd, config));
  const paths = ImportPaths.load(resolved.tsconfig, resolved.importExtension);
  const predicateFor = inclusionResolver(resolved, include);
  const generated = resolved.modules.map((module) => generate(resolved, module, paths, predicateFor(module)));

  const outputs = generated.map(({ module, content, registrations }): OutputResult => {
    const current = existsSync(module.output) ? readFileSync(module.output, 'utf8') : undefined;
    const status: OutputStatus = current === content ? 'unchanged' : check ? 'stale' : 'written';
    if (status === 'written') {
      mkdirSync(path.dirname(module.output), { recursive: true });
      writeFileSync(module.output, content);
    }
    return { file: module.output, module: module.name, status, registrations, content };
  });
  return { config: resolved.file, outputs };
}

/**
 * Which predicate a module uses: the one passed to `build`, else the module's `include` file, else
 * the conventional `tic.include.*` next to the config, else none. Each file is loaded once, and only
 * when a module needs it.
 *
 * @throws {TicConfigError} when a predicate file a module needs is missing or does not export a function.
 */
function inclusionResolver(config: ResolvedConfig, override?: InclusionPredicate) {
  const conventional = findConventionalPredicate(config.dir);
  const loaded = new Map<string, InclusionPredicate>();
  const load = (file: string) => {
    if (!loaded.has(file)) loaded.set(file, loadInclusionPredicate(file));
    return loaded.get(file)!;
  };
  return (module: ResolvedModule): InclusionPredicate | undefined => {
    if (override) return override;
    const file = module.include ?? conventional;
    return file === undefined ? undefined : load(file);
  };
}

/**
 * @throws {NamespaceNotFoundError} when a namespace is neither a folder nor a tsconfig paths alias of one.
 */
function generate(config: ResolvedConfig, module: ResolvedModule, paths: ImportPaths, include?: InclusionPredicate) {
  const outputs = new Set(config.modules.map((m) => m.output));
  const excludes = module.exclude.map(globToRegExp);
  const isExcluded = (file: string) => {
    if (outputs.has(file)) return true;
    const filename = toPosix(path.relative(config.dir, file));
    return excludes.some((glob) => glob.test(filename)) || (include !== undefined && !include({ filename }));
  };

  const files = new Set<string>();
  for (const namespace of module.namespaces) {
    const dir = paths.resolveNamespace(namespace.path, config.dir);
    for (const file of listSourceFiles(dir, namespace.recursive, isExcluded)) files.add(file);
  }

  const classes = [...files]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .flatMap((file) => findClasses(file, module.select))
    .map((cls) => ({ ...cls, specifier: paths.specifier(module.output, cls.file) }));

  const content = emitModule({
    name: module.name,
    configPath: toPosix(path.relative(path.dirname(module.output), config.file)),
    namespaces: module.namespaces.map((ns) => ns.path),
    classes,
  });
  return { module, content, registrations: classes.length };
}
