import { It, Mock, Times } from 'moq.ts';
import {
  BuildController,
  type BuildCliOptions,
  type BuildResult,
  type CliIo,
  type IBundleBuilder,
  type ILogger,
  type IOutputService,
  type OutputResult,
  StaleBundlesError,
  TicConfigError,
  UsageError,
} from '../../../lib';

const result = (status: OutputResult['status'], file: string, registrations: number, warnings: string[] = []) =>
  ({
    output: { file, bundle: 'AppBundle', status, registrations, content: '' },
    warnings,
  }) satisfies BuildResult;

const options = (overrides: Partial<BuildCliOptions> = {}): BuildCliOptions => ({
  output: 'src/app.bundle.ts',
  format: 'json',
  content: '{"glob":{"paths":["./src"]}}',
  check: false,
  ...overrides,
});

const setup = (build: () => BuildResult, io: Partial<CliIo> = {}) => {
  const builder = new Mock<IBundleBuilder>().setup((m) => m.build(It.IsAny())).callback(build);
  const out = new Mock<IOutputService>().setup((m) => m.write(It.IsAny())).returns(undefined);
  const logger = new Mock<ILogger>().setup((m) => m.warn(It.IsAny())).returns(undefined);
  const cliIo = { cwd: '/repo', stdout: () => {}, stderr: () => {}, ...io };
  const controller = new BuildController('/repo', cliIo, builder.object(), out.object(), logger.object());
  return { builder, out, logger, controller };
};

describe('BuildController', () => {
  it('given JSON content when built then the parsed config is built and reported on one line', () => {
    const { builder, out, controller } = setup(() => result('written', '/repo/src/app.bundle.ts', 2));

    controller.build(options());

    builder.verify((m) =>
      m.build(
        It.Is(
          (request) =>
            JSON.stringify(request) ===
            JSON.stringify({ output: 'src/app.bundle.ts', config: { glob: { paths: ['./src'] } }, check: false }),
        ),
      ),
    );
    out.verify((m) => m.write('wrote     src/app.bundle.ts (2 registrations)'), Times.Once());
  });

  it('given YAML content when built then it is parsed as YAML', () => {
    const { builder, controller } = setup(() => result('written', '/repo/src/app.bundle.ts', 1));

    controller.build(options({ format: 'yaml', content: 'glob:\n  paths: [./lib]\n' }));

    builder.verify((m) =>
      m.build(
        It.Is((request: { config: unknown }) => JSON.stringify(request.config) === '{"glob":{"paths":["./lib"]}}'),
      ),
    );
  });

  it('given - as content when built then the content is read from stdin', () => {
    const { builder, controller } = setup(() => result('written', '/repo/src/app.bundle.ts', 1), {
      stdin: () => '{"glob":{"paths":["./piped"]}}',
    });

    controller.build(options({ content: '-' }));

    builder.verify((m) =>
      m.build(
        It.Is((request: { config: unknown }) => JSON.stringify(request.config) === '{"glob":{"paths":["./piped"]}}'),
      ),
    );
  });

  it('given - as content and no stdin when built then it throws UsageError', () => {
    const { controller } = setup(() => result('written', '/repo/src/app.bundle.ts', 1));

    expect(() => controller.build(options({ content: '-' }))).toThrow(UsageError);
  });

  it('given build warnings when built then each is logged under the output', () => {
    const { logger, controller } = setup(() =>
      result('unchanged', '/repo/src/app.bundle.ts', 0, ['glob.exclude omits a glob']),
    );

    controller.build(options());

    logger.verify((m) => m.warn('src/app.bundle.ts: glob.exclude omits a glob'), Times.Once());
  });

  it('given a config that fails when built then the error names the output', () => {
    const { controller } = setup(() => {
      throw new TicConfigError('glob: expected an object');
    });

    expect(() => controller.build(options())).toThrow('src/app.bundle.ts: glob: expected an object');
  });

  it('given a stale bundle when checked then it is reported before StaleBundlesError', () => {
    const { out, controller } = setup(() => result('stale', '/repo/src/app.bundle.ts', 1));

    expect(() => controller.build(options({ check: true }))).toThrow(StaleBundlesError);
    out.verify((m) => m.write('stale     src/app.bundle.ts (1 registration)'), Times.Once());
  });
});
