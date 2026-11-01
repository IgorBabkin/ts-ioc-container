import path from 'node:path';
import { by, inject, invoke, pipe, register } from 'ts-ioc-container';
import { z } from 'zod';
import { commandArgs, onDefault, parseOptions, validate } from '../../cli';
import { type CliIo, CliIoKey } from '../../domain/CliIo';
import { TicError, UsageError } from '../../exceptions/DomainException';
import { type ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { type IOutputService, IOutputServiceKey } from '../../services/OutputService';
import { STDIN } from './BuildConfig';
import { toPosix } from './domain/glob';
import { type IBundleService, IBundleServiceKey } from './services/BundleService';
import { type ITicConfigService, ITicConfigServiceKey } from './services/TicConfigService';

export const BUILD_OPTIONS = z.object({ positionals: z.array(z.string().min(1)) }).transform(({ positionals }, ctx) => {
  if (positionals.length > 1 && positionals.includes(STDIN)) {
    ctx.addIssue({
      code: 'custom',
      path: ['config'],
      message: `${STDIN} reads one config from stdin and cannot be merged with config files`,
    });
    return z.NEVER;
  }
  // No <config>, or `-`: the config is read from stdin.
  return { configs: positionals.length > 0 ? positionals : [STDIN] };
});

export type BuildCliOptions = z.output<typeof BUILD_OPTIONS>;

const buildArgs = parseOptions({}, { positionals: true });

/**
 * `tic build [<config>... | -]`: the bundle goes to stdout; several configs are merged left to right
 * into one, and without a config file the config comes from stdin.
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
   * stdout. Saving it is the shell's job: `tic build app.bundle.json > src/di/app.bundle.ts`,
   * `tic build common.bundle.yml prod.bundle.yml > src/di/prod.bundle.ts`,
   * `cat app.bundle.yml | tic build > out.ts`.
   * The files in the bundle, one path per line relative to the working directory, and warnings
   * go to stderr, so they never end up in the bundle; an error names the configs.
   *
   * @throws {UsageError} when an option is unknown, `-` is given with config files, or the config should come from stdin and nothing is piped in.
   * @throws {TicConfigError} when a config file is missing or unreadable, several are in different folders, the config or its tsconfig is invalid, the bundle has no name, or no tsconfig paths alias covers a selected class's file.
   * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
   */
  @onDefault(invoke)
  bundle(@inject(pipe(commandArgs, buildArgs, validate(BUILD_OPTIONS))) { configs }: BuildCliOptions): void {
    const stdin = configs[0] === STDIN;
    const label = stdin ? '<stdin>' : configs.join(' + ');
    try {
      const config = stdin
        ? this.configService.parse(this.stdin(), this.io.cwd)
        : this.configService.load(configs.map((file) => path.resolve(this.io.cwd, file)));
      const { content, files, warnings } = this.bundleService.bundle(config);
      for (const file of files) this.logger.info(toPosix(path.relative(this.io.cwd, file)));
      for (const warning of warnings) this.logger.warn(`${label}: ${warning}`);
      // The bundle ends with a newline; the output service adds its own.
      this.output.write(content.replace(/\n$/, ''));
    } catch (e) {
      if (e instanceof TicError && !(e instanceof UsageError)) e.message = `${label}: ${e.message}`;
      throw e;
    }
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
