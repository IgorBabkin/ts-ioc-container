import path from 'node:path';
import { by, inject, invoke, pipe, register } from 'ts-ioc-container';
import { z } from 'zod';
import { commandArgs, onDefault, parseOptions, validate } from '../../cli';
import { globalConfig } from '../../domain/GlobalConfig';
import { StaleBundlesError, TicError } from '../../exceptions/DomainException';
import { type ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { type IOutputService, IOutputServiceKey } from '../../services/OutputService';
import { type IBundleBuilder, IBundleBuilderKey, type OutputStatus } from './services/BundleBuilder';
import { type ITicConfigService, ITicConfigServiceKey } from './services/TicConfigService';

export const BUILD_OPTIONS = z.object({
  config: z.array(z.string().min(1)).default([]),
  check: z.boolean().default(false),
});

export type BuildCliOptions = z.output<typeof BUILD_OPTIONS>;

const buildArgs = parseOptions({
  config: { type: 'string', short: 'c', multiple: true },
  check: { type: 'boolean' },
});

const VERB: Record<OutputStatus, string> = { written: 'wrote', unchanged: 'unchanged', stale: 'stale' };

const plural = (n: number) => `${n} registration${n === 1 ? '' : 's'}`;

/** `tic build [--config <path>]... [--check]`. */
@register('build')
export class BuildController {
  constructor(
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(by(ITicConfigServiceKey)) private readonly configs: ITicConfigService,
    @inject(by(IBundleBuilderKey)) private readonly builder: IBundleBuilder,
    @inject(by(IOutputServiceKey)) private readonly output: IOutputService,
    @inject(by(ILoggerKey)) private readonly logger: ILogger,
  ) {}

  /**
   * Builds every config named with `--config`, else every `*.bundle.{json,yaml,yml}` of the
   * package. With `--check` nothing is written and
   * an out-of-date bundle fails the run. One line per bundle goes to stdout, warnings to
   * stderr; an error names the config it came from.
   *
   * @throws {UsageError} when an option is unknown or `--config` has no value.
   * @throws {TicConfigError} when a config or its tsconfig is missing or invalid, or none can be found.
   * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
   * @throws {StaleBundlesError} when `--check` finds a bundle that differs from what a build would write.
   */
  @onDefault(invoke)
  build(@inject(pipe(commandArgs, buildArgs, validate(BUILD_OPTIONS))) options: BuildCliOptions): void {
    let stale = 0;
    for (const config of this.configs.discover(options.config)) {
      const name = path.relative(this.cwd, config);
      try {
        const { output, warnings } = this.builder.build({ config, check: options.check });
        for (const warning of warnings) this.logger.warn(`${name}: ${warning}`);
        const { status, file, registrations } = output;
        this.output.write(`${VERB[status].padEnd(10)}${path.relative(this.cwd, file)} (${plural(registrations)})`);
        if (status === 'stale') stale++;
      } catch (e) {
        if (e instanceof TicError) e.message = `${name}: ${e.message}`;
        throw e;
      }
    }
    if (stale > 0) throw new StaleBundlesError(stale);
  }
}
