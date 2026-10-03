import path from 'node:path';
import { by, inject, register, SingleToken } from 'ts-ioc-container';
import { globalConfig } from '../../../domain/GlobalConfig';
import { type IRenderService, IRenderServiceKey } from '../../../services/HandlebarsRenderService';
import { type IFileSystemService, IFileSystemServiceKey } from '../../../services/NodeFileSystemService';
import { TicConfigError } from '../../../exceptions/DomainException';
import type { ResolvedConfig } from '../BuildConfig';
import { type ITicConfigService, ITicConfigServiceKey } from './TicConfigService';
import { BUNDLE_PROTOCOL, bundleView, GENERATED_HEADER } from '../domain/emit';
import { toPosix } from '../domain/glob';
import { findClasses, listSourceFiles } from '../domain/scan';
import { tokenCollisions } from '../domain/tokenCollisions';
import { loadImportPaths } from '../domain/tsconfig';

/** What one build does. Paths resolve against the run's working directory. */
export type BuildRequest =
  | {
      /** Path of the config file — `*.json`, `*.yaml` or `*.yml` — relative to the working directory. */
      config: string;
    }
  | {
      /**
       * The config as text, e.g. read from stdin: YAML or JSON. Its relative paths resolve
       * against the working directory, and it must set `name`.
       */
      text: string;
    };

export type BuildOptions = BuildRequest & {
  /** Default `process.cwd()`. */
  cwd?: string;
};

export interface BuildResult {
  /** Absolute path of the config file that was built; `undefined` for config text. */
  config?: string;
  /** Name of the generated class. */
  bundle: string;
  registrations: number;
  /** The generated bundle. Nothing is written: saving it is the caller's job (`tic build app.bundle.json > src/di/app.bundle.ts`). */
  content: string;
  /**
   * Non-fatal problems found while building, e.g. a `glob.exclude` that drops a default
   * test glob or two selected classes passing the same decorator token.
   */
  warnings: string[];
}

export interface IBundleBuilder {
  /**
   * Generates the bundle a config describes and returns it; nothing is written.
   *
   * @throws {TicConfigError} when the config file is missing or unreadable, the config or its tsconfig is invalid, the bundle has no name, or no tsconfig paths alias covers a selected class's file.
   * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
   */
  build(request: BuildRequest): BuildResult;
}

export const IBundleBuilderKey = new SingleToken<IBundleBuilder>('IBundleBuilder');

@register(IBundleBuilderKey)
export class BundleBuilder implements IBundleBuilder {
  constructor(
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(by(ITicConfigServiceKey)) private readonly configs: ITicConfigService,
    @inject(by(IFileSystemServiceKey)) private readonly fs: IFileSystemService,
    @inject(by(IRenderServiceKey)) private readonly renderer: IRenderService,
  ) {}

  /**
   * @throws {TicConfigError} when the config file is missing or unreadable, the config or its tsconfig is invalid, the bundle has no name, or no tsconfig paths alias covers a selected class's file.
   * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
   */
  build(request: BuildRequest): BuildResult {
    const resolved =
      'text' in request
        ? this.configs.parse(request.text, this.cwd)
        : this.configs.load(path.resolve(this.cwd, request.config));
    const { content, registrations, warnings } = this.generate(resolved);
    return {
      config: 'text' in request ? undefined : resolved.file,
      bundle: resolved.bundleClassName,
      registrations,
      content,
      warnings: [...resolved.warnings, ...warnings],
    };
  }

  /**
   * @throws {TicConfigError} when the tsconfig is missing or invalid, or no tsconfig paths alias covers a selected class's file.
   * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
   */
  private generate(config: ResolvedConfig) {
    const paths = loadImportPaths(config.tsconfig, config.importExtension);
    const relative = (file: string) => toPosix(path.relative(config.dir, file));
    const { exclude } = config.glob;
    // Decided by path alone, before a file is read: this is what keeps unrelated files unparsed.
    const isExcluded = (file: string) => {
      const filename = relative(file);
      return exclude.some((glob) => glob.test(filename));
    };

    const files = new Set<string>();
    for (const folder of config.glob.glob) {
      const dir = paths.resolveNamespace(folder, config.dir);
      for (const file of listSourceFiles(dir, isExcluded)) files.add(file);
    }

    const classes = [...files]
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .flatMap((file) => {
        const text = this.fs.readFile(file);
        // Another config's bundle can sit in a scanned folder; it is output, never input.
        return text.startsWith(GENERATED_HEADER) ? [] : findClasses(file, config.className, text);
      })
      .map((cls) => ({ ...cls, specifier: paths.specifier(cls.file) }));
    const uncovered = [...new Set(classes.filter((cls) => cls.specifier === undefined).map((cls) => cls.file))];
    if (uncovered.length > 0) {
      throw new TicConfigError(
        `no tsconfig paths alias covers ${uncovered.map((file) => toPosix(path.relative(config.dir, file))).join(', ')}; ` +
          `the bundle goes to stdout, so every import is written through an alias — add a "paths" entry to ${toPosix(path.relative(config.dir, config.tsconfig.file))}`,
      );
    }

    const content = this.renderer.render(
      BUNDLE_PROTOCOL,
      bundleView({
        name: config.bundleClassName,
        paths: config.glob.glob,
        classes: classes.map((cls) => ({ ...cls, specifier: cls.specifier! })),
      }),
    );
    return { content, registrations: classes.length, warnings: tokenCollisions(classes) };
  }
}
