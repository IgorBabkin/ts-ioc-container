import path from 'node:path';
import { by, inject, invoke, pipe, register } from 'ts-ioc-container';
import { z } from 'zod';
import { commandArgs, onDefault, parseOptions, validate } from '../../cli';
import { type CliIo, CliIoKey } from '../../domain/CliIo';
import { TicError, UsageError } from '../../exceptions/DomainException';
import { type ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { type IOutputService, IOutputServiceKey } from '../../services/OutputService';
import { type BundleConfig, configFormat, STDIN } from './BuildConfig';
import { toPosix } from './domain/glob';
import { type IBundleService, IBundleServiceKey } from './services/BundleService';
import { type ITicConfigService, ITicConfigServiceKey } from './services/TicConfigService';

/** A bundle config by its name: `.json`, `.yaml` or `.yml`, or named `<name>.bundle.*` (so `app.bundle.toml` fails as a config). */
const isConfigFile = (arg: string): boolean =>
  configFormat(arg) !== undefined || path.basename(arg).includes('.bundle.');

/** `tsconfig.json`, `tsconfig.build.json`: a tsconfig to build from, not a bundle config. */
export const isTsconfig = (file: string): boolean => /^tsconfig(\..+)?\.json$/.test(path.basename(file));

/** What `tic build` was given: config files, or a tsconfig and paths, or nothing at all. */
export interface BuildCliOptions {
  /** Bundle config files, merged left to right; `['-']` reads one from stdin. */
  configs: string[];
  /** A tsconfig to build from: its `paths` aliases, and the folders they point to unless `include` is given. */
  tsconfig?: string;
  /** Folders, files and globs to scan, relative to the working directory, as in `paths.include`. */
  include?: string[];
}

/**
 * Sorts the arguments of `tic build`: a `.json` / `.yaml` / `.yml` file, or one named
 * `<name>.bundle.*`, is a bundle config, unless it is a tsconfig (`tsconfig.json`,
 * `tsconfig.*.json`); anything else is a folder, a file or a glob to scan. Config files stand
 * alone; a tsconfig and paths combine. Without an argument the config comes from stdin.
 */
export const BUILD_OPTIONS = z
  .object({ positionals: z.array(z.string().min(1)) })
  .transform(({ positionals }, ctx): BuildCliOptions => {
    const fail = (message: string) => {
      ctx.addIssue({ code: 'custom', path: ['config'], message });
      return z.NEVER;
    };
    if (positionals.length > 1 && positionals.includes(STDIN)) {
      return fail(`${STDIN} reads one config from stdin and cannot be combined with other arguments`);
    }
    const tsconfigs = positionals.filter(isTsconfig);
    const configs = positionals.filter((arg) => arg === STDIN || (!isTsconfig(arg) && isConfigFile(arg)));
    const include = positionals.filter((arg) => arg !== STDIN && !isTsconfig(arg) && !isConfigFile(arg));
    if (tsconfigs.length > 1) return fail(`name one tsconfig, not ${tsconfigs.length}: ${tsconfigs.join(', ')}`);
    if (configs.length > 0 && configs.length < positionals.length) {
      return fail(
        'config files cannot be combined with a tsconfig or paths: a config names its tsconfig in "tsconfig" and what it scans in "paths.include"',
      );
    }
    // No argument: the config is read from stdin.
    if (positionals.length === 0) return { configs: [STDIN], include: [] };
    return { configs, tsconfig: tsconfigs[0], include };
  });

const buildArgs = parseOptions({}, { positionals: true });

/** `1 file`, `2 files`. */
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * `tic build [<config>... | - | [<tsconfig>] <path>... | <tsconfig>]`: the bundle goes to stdout;
 * several configs are merged left to right into one, a tsconfig and paths stand for a config,
 * and without an argument the config comes from stdin.
 */
@register('build')
export class BundleController {
  constructor(
    @inject(by(CliIoKey)) private readonly io: CliIo,
    @inject(by(ITicConfigServiceKey)) private readonly configService: ITicConfigService,
    @inject(by(IBundleServiceKey)) private readonly bundleService: IBundleService,
    @inject(by(IOutputServiceKey)) private readonly output: IOutputService,
    @inject(by(ILoggerKey)) private readonly logger: ILogger,
  ) {}

  /**
   * Builds the bundle the config file `<config>` describes — several merged left to right
   * into one, or without one (or with `-`), the config piped into stdin — and prints it to
   * stdout. Given a tsconfig or paths instead, the bundle is `AppBundle`: of the folders, files
   * and globs given, through the aliases of the tsconfig given (default `./tsconfig.json`), or
   * of the folders the aliases of a tsconfig given alone point to; test files are excluded as
   * by default. Saving it is the shell's job: `tic build app.bundle.json > src/di/app.bundle.ts`,
   * `tic build common.bundle.yml prod.bundle.yml > src/di/prod.bundle.ts`,
   * `tic build 'src/**\/*.service.ts' > src/di/app.bundle.ts`, `tic build tsconfig.json > out.ts`,
   * `cat app.bundle.yml | tic build > out.ts`.
   * Progress goes to stderr, so it never ends up in the bundle: `Bundling AppBundle...`, then
   * each class in it, one per line as its name and its file's path relative to the working
   * directory (`  Clock: src/infra/Clock.ts`), the warnings, and a summary
   * (`Bundled AppBundle: 3 dependencies from 2 files (1 warning)`). An error names the configs.
   *
   * @throws {UsageError} when an option is unknown, `-` is given with other arguments, config files with a tsconfig or paths, or two tsconfigs; when the config should come from stdin and nothing is piped in.
   * @throws {TicConfigError} when a config file or tsconfig is missing or unreadable, several configs are in different folders, the config or its tsconfig is invalid, the bundle has no name or nothing to scan, or no tsconfig paths alias covers a selected class's file.
   * @throws {NamespaceNotFoundError} when a path is neither a source file, a folder, a tsconfig paths alias of one nor a glob in one.
   */
  @onDefault(invoke)
  bundle(@inject(pipe(commandArgs, buildArgs, validate(BUILD_OPTIONS))) options: BuildCliOptions): void {
    const { label, load } = this.source(options);
    try {
      const config = load();
      this.logger.info(`Bundling ${config.bundleClassName}...`);
      const { bundle, content, classes, files, warnings } = this.bundleService.bundle(config);
      for (const { file, className } of classes) {
        this.logger.info(`  ${className}: ${toPosix(path.relative(this.io.cwd, file))}`);
      }
      for (const warning of warnings) this.logger.warn(`${label}: ${warning}`);
      // The bundle ends with a newline; the output service adds its own.
      this.output.write(content.replace(/\n$/, ''));
      const summary = [count(classes.length, 'dependency', 'dependencies'), `from ${count(files.length, 'file')}`];
      if (warnings.length > 0) summary.push(`(${count(warnings.length, 'warning')})`);
      this.logger.info(`Bundled ${bundle}: ${summary.join(' ')}`);
    } catch (e) {
      if (e instanceof TicError && !(e instanceof UsageError)) e.message = `${label}: ${e.message}`;
      throw e;
    }
  }

  /**
   * Where the config comes from, and the label its warnings and errors carry.
   *
   * @throws {UsageError} when the config should come from stdin and nothing is piped in.
   */
  private source({ configs, tsconfig, include = [] }: BuildCliOptions): { label: string; load: () => BundleConfig } {
    const { cwd } = this.io;
    if (configs[0] === STDIN) return { label: '<stdin>', load: () => this.configService.parse(this.stdin(), cwd) };
    if (configs.length > 0) {
      return {
        label: configs.join(' + '),
        load: () => this.configService.load(configs.map((file) => path.resolve(cwd, file))),
      };
    }
    return {
      label: [...(tsconfig === undefined ? [] : [tsconfig]), ...include].join(' + '),
      load: () =>
        this.configService.fromProject({
          dir: cwd,
          tsconfig: tsconfig === undefined ? undefined : path.resolve(cwd, tsconfig),
          include,
        }),
    };
  }

  /**
   * @throws {UsageError} when nothing is piped into stdin.
   */
  private stdin(): string {
    const text = this.io.stdin?.();
    if (text === undefined) {
      throw new UsageError('missing <config>: name a config file, or pipe one in (cat app.bundle.json | tic build)');
    }
    return text;
  }
}
