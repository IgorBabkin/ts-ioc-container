import path from 'node:path';
import { by, inject, register, SingleToken } from 'ts-ioc-container';
import { globalConfig } from '../../../domain/GlobalConfig';
import { TicConfigError } from '../../../exceptions/DomainException';
import { type IRenderService, IRenderServiceKey } from '../../../services/HandlebarsRenderService';
import { type IFileSystemService, IFileSystemServiceKey } from '../../../services/NodeFileSystemService';
import { DEFAULT_EXTENDS, type ResolvedConfig, resolveConfig } from '../BuildConfig';
import { findPackageRoot } from '../domain/configFiles';
import { BUNDLE_PROTOCOL, bundleView, GENERATED_HEADER } from '../domain/emit';
import { toPosix } from '../domain/glob';
import { findClasses, isSourceFile, listSourceFiles } from '../domain/scan';
import { tokenCollisions } from '../domain/tokenCollisions';
import { loadTsconfig } from '../domain/tsconfig';
import { type ITicConfigService, ITicConfigServiceKey, TSCONFIG_FILE } from './TicConfigService';

/** What one build does. Paths resolve against the run's working directory. */
export interface BuildRequest {
  /**
   * Path of the `*.bundle.json` to build, relative to the working directory. Omitted: build
   * from the `tsconfig.json` of the package the working directory is in (see `findPackageRoot`),
   * every setting at its default.
   */
  config?: string;
  /** Compare instead of writing: outputs that would change are reported `stale`. */
  check?: boolean;
}

export interface BuildOptions extends BuildRequest {
  /** Default `process.cwd()`. */
  cwd?: string;
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

export interface IBundleBuilder {
  /**
   * Generates the bundle a config describes. Nothing is written unless generation succeeds.
   *
   * @throws {TicConfigError} when the config or its tsconfig is missing or invalid, or the config has neither `files.paths` nor a tsconfig.
   * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
   */
  build(request?: BuildRequest): BuildResult;
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
   * @throws {TicConfigError} when the config or its tsconfig is missing or invalid, or the config has neither `files.paths` nor a tsconfig.
   * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
   */
  build({ config, check = false }: BuildRequest = {}): BuildResult {
    const resolved =
      config === undefined
        ? resolveConfig({ extends: DEFAULT_EXTENDS }, path.join(findPackageRoot(this.cwd), TSCONFIG_FILE))
        : this.configs.load(path.resolve(this.cwd, config));
    const { output, content, registrations, warnings } = this.generate(resolved);

    const current = this.fs.fileExists(output) ? this.fs.readFile(output) : undefined;
    const status: OutputStatus = current === content ? 'unchanged' : check ? 'stale' : 'written';
    if (status === 'written') this.fs.writeFile(output, content);
    return {
      config: resolved.file,
      output: { file: output, bundle: resolved.className, status, registrations, content },
      warnings: [...resolved.warnings, ...warnings],
    };
  }

  /**
   * @throws {TicConfigError} when the tsconfig is invalid, or the config names no `files.paths` and there is no tsconfig to take files from.
   * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
   */
  private generate(config: ResolvedConfig) {
    const { importPaths: paths, fileNames, rootDir } = loadTsconfig(config.tsconfig, config.importExtension);
    const output = config.output ?? (rootDir && path.join(rootDir, `${config.name}.bundle.ts`));
    if (output === undefined) throw new TicConfigError('output: required when there is no tsconfig to extend');
    const relative = (file: string) => toPosix(path.relative(config.dir, file));
    const { include, exclude } = config.files;
    // Decided by path alone, before a file is read: this is what keeps unrelated files unparsed.
    const isExcluded = (file: string) => {
      if (file === output) return true;
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
        const text = this.fs.readFile(file);
        // Another config's bundle can sit in a scanned folder; it is output, never input.
        return text.startsWith(GENERATED_HEADER) ? [] : findClasses(file, config.classes, text);
      })
      .map((cls) => ({ ...cls, specifier: paths.specifier(output, cls.file) }));

    const content = this.renderer.render(
      BUNDLE_PROTOCOL,
      bundleView({
        name: config.className,
        configPath: toPosix(path.relative(path.dirname(output), config.file)),
        paths: config.files.paths?.map((entry) => entry.path),
        tsconfigPath: toPosix(path.relative(path.dirname(output), config.tsconfig.file)),
        classes,
      }),
    );
    return { output, content, registrations: classes.length, warnings: tokenCollisions(classes) };
  }
}
