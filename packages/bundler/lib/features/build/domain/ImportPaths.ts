import path from 'node:path';
import * as ts from 'typescript';
import { toPosix } from './glob';

interface Alias {
  pattern: string;
  /** Absolute, `/`-separated. */
  targets: string[];
}

const SOURCE_EXTENSION = /\.(tsx?|mts|cts)$/;

/** Splits a `paths` pattern at its `*`, if it has one. */
function splitWildcard(pattern: string): [string, string] | undefined {
  const star = pattern.indexOf('*');
  return star === -1 ? undefined : [pattern.slice(0, star), pattern.slice(star + 1)];
}

/**
 * Import paths as a project's `tsconfig.json` sees them: writes imports in the
 * form of its `paths` aliases, else its `baseUrl`, where one matches.
 */
export class ImportPaths {
  /**
   * From a parsed tsconfig's options: its `paths` aliases and `baseUrl`, and the extension
   * imports need under its `moduleResolution`; `importExtension` overrides the latter.
   */
  static fromOptions(options: ts.CompilerOptions, tsconfigFile: string, importExtension?: string): ImportPaths {
    const { paths = {}, baseUrl, pathsBasePath, moduleResolution } = options;
    // Without baseUrl, paths resolve against the tsconfig that declared them (which `extends` may make another file).
    const base = baseUrl ?? (typeof pathsBasePath === 'string' ? pathsBasePath : path.dirname(tsconfigFile));
    const aliases = Object.entries(paths).map(([pattern, targets]) => ({
      pattern,
      targets: targets.map((target) => toPosix(path.resolve(base, target))),
    }));
    const nodeEsm =
      moduleResolution === ts.ModuleResolutionKind.Node16 || moduleResolution === ts.ModuleResolutionKind.NodeNext;
    return new ImportPaths(
      aliases,
      importExtension ?? (nodeEsm ? '.js' : ''),
      baseUrl === undefined ? undefined : toPosix(baseUrl),
    );
  }

  constructor(
    private readonly aliases: Alias[],
    readonly extension: string,
    /** Absolute, `/`-separated: non-relative imports resolve against it. */
    private readonly baseUrl?: string,
  ) {}

  /**
   * The specifier `fromFile` imports `toFile` by: its most specific `paths` alias, else a
   * path relative to `baseUrl` when the file is under it, else a path relative to `fromFile`.
   */
  specifier(fromFile: string, toFile: string): string {
    const target = toPosix(toFile);
    const bare = target.replace(SOURCE_EXTENSION, '');
    const best = this.bestAlias(target, bare);
    if (best) return best.spec;

    const fromBaseUrl = this.baseUrlSpecifier(bare);
    if (fromBaseUrl) return `${fromBaseUrl}${this.extension}`;

    const relative = toPosix(path.relative(path.dirname(fromFile), bare));
    return `${relative.startsWith('.') ? relative : `./${relative}`}${this.extension}`;
  }

  /** `bare` written relative to `baseUrl`, when it is under it; `undefined` otherwise. */
  private baseUrlSpecifier(bare: string): string | undefined {
    if (!this.baseUrl) return undefined;
    const prefix = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;
    return bare.startsWith(prefix) ? bare.slice(prefix.length) : undefined;
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
