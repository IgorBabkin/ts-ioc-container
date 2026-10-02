import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG_FILE, loadConfig, type ResolvedConfig, type ResolvedBundle } from './config';
import { emitBundle } from './emit';
import { toPosix } from './glob';
import { ImportPaths } from './ImportPaths';
import { findClasses, listSourceFiles, type DiscoveredClass } from './scan';

export interface BuildOptions {
  /** Path of `.bundles.json`, relative to `cwd`. Default `.bundles.json`. */
  config?: string;
  /** Default `process.cwd()`. */
  cwd?: string;
  /** Compare instead of writing: outputs that would change are reported `stale`. */
  check?: boolean;
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
   * Non-fatal problems found while building, e.g. a `files.exclude` that drops a default
   * test glob or two selected classes passing the same decorator token. Each warning
   * names the bundle field it belongs to.
   */
  warnings: string[];
}

/**
 * Generates one bundle per config entry. Every bundle is generated before any
 * file is written, so a failing path leaves the previous outputs intact.
 *
 * @throws {TicConfigError} when the config or the tsconfig is missing or invalid.
 * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
 */
export function build({
  config = DEFAULT_CONFIG_FILE,
  cwd = process.cwd(),
  check = false,
}: BuildOptions = {}): BuildResult {
  const resolved = loadConfig(path.resolve(cwd, config));
  const paths = ImportPaths.load(resolved.tsconfig, resolved.importExtension);
  const generated = resolved.bundles.map((bundle, i) => generate(resolved, bundle, `bundles[${i}]`, paths));

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
 * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
 */
function generate(config: ResolvedConfig, bundle: ResolvedBundle, field: string, paths: ImportPaths) {
  const relative = (file: string) => toPosix(path.relative(config.dir, file));
  const outputs = new Set(config.bundles.map((m) => m.output));
  const { include, exclude } = bundle.files;
  // Decided by path alone, before a file is read: this is what keeps unrelated files unparsed.
  const isExcluded = (file: string) => {
    if (outputs.has(file)) return true;
    const filename = relative(file);
    if (include && !include.some((glob) => glob.test(filename))) return true;
    return exclude.some((glob) => glob.test(filename));
  };

  const files = new Set<string>();
  for (const entry of bundle.paths) {
    const dir = paths.resolveNamespace(entry.path, config.dir);
    for (const file of listSourceFiles(dir, entry.recursive, isExcluded)) files.add(file);
  }

  const classes = [...files]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .flatMap((file) => findClasses(file, bundle.classes))
    .map((cls) => ({ ...cls, specifier: paths.specifier(bundle.output, cls.file) }));

  const content = emitBundle({
    name: bundle.name,
    configPath: toPosix(path.relative(path.dirname(bundle.output), config.file)),
    paths: bundle.paths.map((entry) => entry.path),
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
        `registration is last-wins, exclude one with classes.excludeClasses`
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
