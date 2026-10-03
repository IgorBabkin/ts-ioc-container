import path from 'node:path';
import { by, inject, invoke, pipe, register } from 'ts-ioc-container';
import { z } from 'zod';
import { commandArgs, onDefault, parseOptions, validate } from '../../cli';
import { type CliIo, CliIoKey } from '../../domain/CliIo';
import { globalConfig } from '../../domain/GlobalConfig';
import { StaleBundlesError, TicError, UsageError } from '../../exceptions/DomainException';
import { type ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { type IOutputService, IOutputServiceKey } from '../../services/OutputService';
import { type ConfigFormat, parseConfig } from './BuildConfig';
import { type IBundleBuilder, IBundleBuilderKey, type OutputStatus } from './services/BundleBuilder';

/** The value of `--json` / `--yaml` that means "read the content from standard input". */
export const STDIN = '-';

export const BUILD_OPTIONS = z
  .object({
    positionals: z.array(z.string().min(1)),
    json: z.string().optional(),
    yaml: z.string().optional(),
    check: z.boolean().default(false),
  })
  .transform(({ positionals, json, yaml, check }, ctx) => {
    if (positionals.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['output'],
        message: positionals.length === 0 ? 'missing <output>' : `expected one <output>, got ${positionals.join(' ')}`,
      });
    }
    if ((json === undefined) === (yaml === undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['config'],
        message: 'pass the config as exactly one of --json <content> or --yaml <content> (- reads stdin)',
      });
    }
    if (positionals.length !== 1 || (json === undefined) === (yaml === undefined)) return z.NEVER;
    const [format, content]: [ConfigFormat, string] = json !== undefined ? ['json', json] : ['yaml', yaml!];
    return { output: positionals[0], format, content, check };
  });

export type BuildCliOptions = z.output<typeof BUILD_OPTIONS>;

const buildArgs = parseOptions(
  {
    json: { type: 'string' },
    yaml: { type: 'string' },
    check: { type: 'boolean' },
  },
  { positionals: true },
);

const VERB: Record<OutputStatus, string> = { written: 'wrote', unchanged: 'unchanged', stale: 'stale' };

const plural = (n: number) => `${n} registration${n === 1 ? '' : 's'}`;

/** `tic build <output> (--json <content> | --yaml <content>) [--check]`. */
@register('build')
export class BuildController {
  constructor(
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(by(CliIoKey)) private readonly io: CliIo,
    @inject(by(IBundleBuilderKey)) private readonly builder: IBundleBuilder,
    @inject(by(IOutputServiceKey)) private readonly output: IOutputService,
    @inject(by(ILoggerKey)) private readonly logger: ILogger,
  ) {}

  /**
   * Builds the bundle `<output>` from the config content passed with `--json` or `--yaml`
   * (`-` reads it from stdin). The CLI never reads a config file: the caller does —
   * `--json "$(cat app.bundle.json)"`, or `cat app.bundle.json | tic build <output> --json -`.
   * With `--check` nothing is written and an out-of-date bundle fails the run. One line goes
   * to stdout, warnings to stderr; an error names the output it was building.
   *
   * @throws {UsageError} when an option is unknown, there is not exactly one `<output>`, not exactly one of `--json` / `--yaml`, or `-` is given with no stdin to read.
   * @throws {TicConfigError} when the content is not valid JSON / YAML, the config or its tsconfig is invalid, or the bundle has no name.
   * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
   * @throws {StaleBundlesError} when `--check` finds the bundle differs from what a build would write.
   */
  @onDefault(invoke)
  build(@inject(pipe(commandArgs, buildArgs, validate(BUILD_OPTIONS))) options: BuildCliOptions): void {
    const { output: outputPath, format, check } = options;
    try {
      const config = parseConfig(this.content(options), format);
      const { output, warnings } = this.builder.build({ output: outputPath, config, check });
      for (const warning of warnings) this.logger.warn(`${outputPath}: ${warning}`);
      const { status, registrations } = output;
      this.output.write(`${VERB[status].padEnd(10)}${path.relative(this.cwd, output.file)} (${plural(registrations)})`);
      if (status === 'stale') throw new StaleBundlesError(1);
    } catch (e) {
      if (e instanceof TicError && !(e instanceof StaleBundlesError)) e.message = `${outputPath}: ${e.message}`;
      throw e;
    }
  }

  /**
   * @throws {UsageError} when the content is `-` and there is no stdin to read.
   */
  private content({ format, content }: BuildCliOptions): string {
    if (content !== STDIN) return content;
    if (!this.io.stdin) throw new UsageError(`--${format} -: there is no stdin to read`);
    return this.io.stdin();
  }
}
