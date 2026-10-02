import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadConfig, type ResolvedConfig } from './config';
import { emitBundle, GENERATED_HEADER } from './emit';
import { toPosix } from './glob';
import { TicConfigError } from './errors';
import { findClasses, isSourceFile, listSourceFiles, type DiscoveredClass } from './scan';
import { loadTsconfig } from './tsconfig';

export interface BuildOptions {
  /** Path of the `*.bundle.json` to build, relative to `cwd`. */
  config: string;
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
  output: OutputResult;
  /**
   * Non-fatal problems found while building, e.g. a `files.exclude` that drops a default
   * test glob or two selected classes passing the same decorator token.
   */
  warnings: string[];
}

/**
 * Generates the bundle a config describes. Nothing is written unless generation succeeds.
 *
 * @throws {TicConfigError} when the config or its tsconfig is missing or invalid, or the config has neither `files.paths` nor a tsconfig.
 * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
 */
export function build({ config, cwd = process.cwd(), check = false }: BuildOptions): BuildResult {
  const resolved = loadConfig(path.resolve(cwd, config));
  const { content, registrations, warnings } = generate(resolved);

  const current = existsSync(resolved.output) ? readFileSync(resolved.output, 'utf8') : undefined;
  const status: OutputStatus = current === content ? 'unchanged' : check ? 'stale' : 'written';
  if (status === 'written') {
    mkdirSync(path.dirname(resolved.output), { recursive: true });
    writeFileSync(resolved.output, content);
  }
  return {
    config: resolved.file,
    output: { file: resolved.output, bundle: resolved.name, status, registrations, content },
    warnings: [...resolved.warnings, ...warnings],
  };
}

/**
 * @throws {TicConfigError} when the tsconfig is invalid, or the config names no `files.paths` and there is no tsconfig to take files from.
 * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
 */
function generate(config: ResolvedConfig) {
  const { importPaths: paths, fileNames } = loadTsconfig(config.tsconfig, config.importExtension);
  const relative = (file: string) => toPosix(path.relative(config.dir, file));
  const { include, exclude } = config.files;
  // Decided by path alone, before a file is read: this is what keeps unrelated files unparsed.
  const isExcluded = (file: string) => {
    if (file === config.output) return true;
    const filename = relative(file);
    if (include && !include.some((glob) => glob.test(filename))) return true;
    return exclude.some((glob) => glob.test(filename));
  };

  const files = new Set<string>();
  if (config.files.paths) {
    // `files.paths` override the tsconfig's file set, as a child tsconfig's `include` does.
    for (const entry of config.files.paths) {
      const dir = paths.resolveNamespace(entry.path, config.dir);
      for (const file of listSourceFiles(dir, entry.recursive, isExcluded)) files.add(file);
    }
  } else if (fileNames) {
    for (const file of fileNames) if (isSourceFile(file) && !isExcluded(file)) files.add(file);
  } else {
    throw new TicConfigError(
      `files.paths: required when there is no tsconfig to extend (${config.tsconfig.file} not found)`,
    );
  }

  const classes = [...files]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      // Another config's bundle can sit in a scanned folder; it is output, never input.
      return text.startsWith(GENERATED_HEADER) ? [] : findClasses(file, config.classes, text);
    })
    .map((cls) => ({ ...cls, specifier: paths.specifier(config.output, cls.file) }));

  const content = emitBundle({
    name: config.name,
    configPath: toPosix(path.relative(path.dirname(config.output), config.file)),
    paths: config.files.paths?.map((entry) => entry.path),
    tsconfigPath: toPosix(path.relative(path.dirname(config.output), config.tsconfig.file)),
    classes,
  });
  return { content, registrations: classes.length, warnings: tokenCollisions(classes) };
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
function tokenCollisions(classes: DiscoveredClass[]): string[] {
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
        `decorator token "${token}" is passed by ${names.join(', ')}; ` +
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
