import { by, inject, invoke, pipe, register } from 'ts-ioc-container';
import { z } from 'zod';
import { commandArgs, onDefault, parseOptions, validate } from '../../cli';
import { type CliIo, CliIoKey } from '../../domain/CliIo';
import { TicError, UsageError } from '../../exceptions/DomainException';
import { type ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { type IOutputService, IOutputServiceKey } from '../../services/OutputService';
import { STDIN } from './BuildConfig';
import { type IBundleBuilder, IBundleBuilderKey } from './services/BundleBuilder';

export const BUILD_OPTIONS = z.object({ positionals: z.array(z.string().min(1)) }).transform(({ positionals }, ctx) => {
  if (positionals.length > 1) {
    ctx.addIssue({ code: 'custom', path: ['config'], message: `expected one <config>, got ${positionals.join(' ')}` });
    return z.NEVER;
  }
  // No <config>, or `-`: the config is read from stdin.
  return { config: positionals[0] ?? STDIN };
});

export type BuildCliOptions = z.output<typeof BUILD_OPTIONS>;

const buildArgs = parseOptions({}, { positionals: true });

/** `tic build [<config> | -]`: the bundle goes to stdout; without a config file, the config comes from stdin. */
@register('build')
export class BuildController {
  constructor(
    @inject(by(CliIoKey)) private readonly io: CliIo,
    @inject(by(IBundleBuilderKey)) private readonly builder: IBundleBuilder,
    @inject(by(IOutputServiceKey)) private readonly output: IOutputService,
    @inject(by(ILoggerKey)) private readonly logger: ILogger,
  ) {}

  /**
   * Builds the bundle the config file `<config>` describes — or, without one (or with `-`),
   * the config piped into stdin — and prints it to stdout. Saving it is the shell's job:
   * `tic build app.bundle.json > src/di/app.bundle.ts`, `cat app.bundle.yml | tic build > out.ts`.
   * Warnings go to stderr, so they never end up in the bundle; an error names the config.
   *
   * @throws {UsageError} when an option is unknown, there is more than one `<config>`, or the config should come from stdin and nothing is piped in.
   * @throws {TicConfigError} when the config file is missing or unreadable, the config or its tsconfig is invalid, the bundle has no name, or no tsconfig paths alias covers a selected class's file.
   * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
   */
  @onDefault(invoke)
  build(@inject(pipe(commandArgs, buildArgs, validate(BUILD_OPTIONS))) { config }: BuildCliOptions): void {
    const label = config === STDIN ? '<stdin>' : config;
    try {
      const { content, warnings } = this.builder.build(config === STDIN ? { text: this.stdin() } : { config });
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
