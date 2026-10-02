import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import { NamespaceNotFoundError, TicConfigError } from './errors';
import { toPosix } from './glob';

interface Alias {
  pattern: string;
  /** Absolute, `/`-separated. */
  targets: string[];
}

const SOURCE_EXTENSION = /\.(tsx?|mts|cts)$/;
/** tsconfig "No inputs were found": irrelevant here, the bundler scans its own folders. */
const NO_INPUTS = 18003;

const isDirectory = (dir: string) => existsSync(dir) && statSync(dir).isDirectory();
const isRelative = (spec: string) => spec.startsWith('.') || path.isAbsolute(spec);

/** Splits a `paths` pattern at its `*`, if it has one. */
function splitWildcard(pattern: string): [string, string] | undefined {
  const star = pattern.indexOf('*');
  return star === -1 ? undefined : [pattern.slice(0, star), pattern.slice(star + 1)];
}

/**
 * Import paths as a project's `tsconfig.json` sees them: resolves namespaces
 * written as `paths` aliases to folders, and writes imports back in alias form.
 */
export class ImportPaths {
  /**
   * Reads `paths` (following `extends`) and the extension imports need under the
   * tsconfig's `moduleResolution`; `importExtension` overrides the latter.
   *
   * @throws {TicConfigError} when a required tsconfig is missing or cannot be parsed.
   */
  static load(tsconfig: { file: string; required: boolean }, importExtension?: string): ImportPaths {
    if (!existsSync(tsconfig.file)) {
      if (tsconfig.required) throw new TicConfigError(`tsconfig not found: ${tsconfig.file}`);
      return new ImportPaths([], importExtension ?? '');
    }

    const { config, error } = ts.readConfigFile(tsconfig.file, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(tsconfig.file), undefined, tsconfig.file);
    const [fatal] = [error, ...parsed.errors].filter((d): d is ts.Diagnostic => !!d && d.code !== NO_INPUTS);
    if (fatal) {
      throw new TicConfigError(`${tsconfig.file}: ${ts.flattenDiagnosticMessageText(fatal.messageText, '\n')}`);
    }

    const { paths = {}, baseUrl, pathsBasePath, moduleResolution } = parsed.options;
    // Without baseUrl, paths resolve against the tsconfig that declared them (which `extends` may make another file).
    const base = baseUrl ?? (typeof pathsBasePath === 'string' ? pathsBasePath : path.dirname(tsconfig.file));
    const aliases = Object.entries(paths).map(([pattern, targets]) => ({
      pattern,
      targets: targets.map((target) => toPosix(path.resolve(base, target))),
    }));
    const nodeEsm =
      moduleResolution === ts.ModuleResolutionKind.Node16 || moduleResolution === ts.ModuleResolutionKind.NodeNext;
    return new ImportPaths(aliases, importExtension ?? (nodeEsm ? '.js' : ''));
  }

  constructor(
    private readonly aliases: Alias[],
    readonly extension: string,
  ) {}

  /**
   * The folder a namespace names: a path relative to `baseDir`, or a `paths` alias.
   *
   * @throws {NamespaceNotFoundError} when the namespace is neither an existing folder nor an alias of one.
   */
  resolveNamespace(namespace: string, baseDir: string): string {
    const folder = path.resolve(baseDir, namespace);
    if (isDirectory(folder)) return folder;
    if (!isRelative(namespace)) {
      // `@app` also matches an `@app/*` pattern, naming the alias root itself.
      const found = [namespace, `${namespace}/`].flatMap((spec) => this.aliasTargets(spec)).find(isDirectory);
      if (found) return path.normalize(found);
    }
    throw new NamespaceNotFoundError(
      `namespace "${namespace}" is neither a folder relative to ${baseDir} nor a tsconfig paths alias of one`,
    );
  }

  /** The specifier `fromFile` imports `toFile` by: its most specific alias, else a relative path. */
  specifier(fromFile: string, toFile: string): string {
    const target = toPosix(toFile);
    const bare = target.replace(SOURCE_EXTENSION, '');
    const best = this.bestAlias(target, bare);
    if (best) return best.spec;

    const relative = toPosix(path.relative(path.dirname(fromFile), bare));
    return `${relative.startsWith('.') ? relative : `./${relative}`}${this.extension}`;
  }

  private bestAlias(target: string, bare: string): { spec: string; score: number } | undefined {
    let best: { spec: string; score: number } | undefined;
    for (const { pattern, targets } of this.aliases) {
      for (const aliasTarget of targets) {
        const match = this.matchAlias(pattern, aliasTarget, target, bare);
        if (match && (!best || match.score > best.score)) best = match;
      }
    }
    return best;
  }

  private aliasTargets(spec: string): string[] {
    return this.aliases.flatMap(({ pattern, targets }) => {
      const wildcard = splitWildcard(pattern);
      if (!wildcard) return pattern === spec ? targets : [];
      const [prefix, suffix] = wildcard;
      if (!spec.startsWith(prefix) || !spec.endsWith(suffix) || spec.length < prefix.length + suffix.length) return [];
      const captured = spec.slice(prefix.length, spec.length - suffix.length);
      return targets.map((target) => target.replace('*', captured));
    });
  }

  /** A longer matched target prefix is a more specific alias; an exact file alias beats every wildcard. */
  private matchAlias(pattern: string, aliasTarget: string, file: string, bare: string) {
    const wildcard = splitWildcard(aliasTarget);
    if (!wildcard) {
      const exact = aliasTarget === file || aliasTarget.replace(SOURCE_EXTENSION, '') === bare;
      return exact && !splitWildcard(pattern) ? { spec: pattern, score: Infinity } : undefined;
    }
    const [prefix, suffix] = wildcard;
    if (!bare.startsWith(prefix) || !bare.endsWith(suffix) || bare.length < prefix.length + suffix.length) {
      return undefined;
    }
    const captured = bare.slice(prefix.length, bare.length - suffix.length);
    return { spec: `${pattern.replace('*', captured)}${this.extension}`, score: prefix.length };
  }
}
