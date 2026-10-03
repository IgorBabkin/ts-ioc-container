import { It, Mock, Times } from 'moq.ts';
import {
  BuildController,
  type BuildResult,
  type IBundleBuilder,
  type ILogger,
  type IOutputService,
  type ITicConfigService,
  type OutputResult,
  StaleBundlesError,
  TicConfigError,
} from '../../../lib';

const result = (status: OutputResult['status'], file: string, registrations: number, warnings: string[] = []) =>
  ({
    config: '',
    output: { file, bundle: 'AppBundle', status, registrations, content: '' },
    warnings,
  }) satisfies BuildResult;

const setup = (configs: string[], build: (config?: string) => BuildResult) => {
  const discovery = new Mock<ITicConfigService>().setup((m) => m.discover(It.IsAny())).returns(configs);
  const builder = new Mock<IBundleBuilder>()
    .setup((m) => m.build(It.IsAny()))
    .callback(({ args: [request] }) => build(request?.config));
  const out = new Mock<IOutputService>().setup((m) => m.write(It.IsAny())).returns(undefined);
  const logger = new Mock<ILogger>().setup((m) => m.warn(It.IsAny())).returns(undefined);
  const controller = new BuildController('/repo', discovery.object(), builder.object(), out.object(), logger.object());
  return { discovery, builder, out, logger, controller };
};

describe('BuildController', () => {
  it('given discovered configs when built then each is built and reported on one line', () => {
    const { discovery, out, controller } = setup(['/repo/app.bundle.json', '/repo/web.bundle.yaml'], (config) =>
      config === '/repo/app.bundle.json'
        ? result('written', '/repo/src/app.bundle.ts', 2)
        : result('unchanged', '/repo/src/web.bundle.ts', 1),
    );

    controller.build({ config: ['app.bundle.json'], check: false });

    discovery.verify((m) => m.discover(It.Is((named) => JSON.stringify(named) === '["app.bundle.json"]')));
    out.verify((m) => m.write('wrote     src/app.bundle.ts (2 registrations)'), Times.Once());
    out.verify((m) => m.write('unchanged src/web.bundle.ts (1 registration)'), Times.Once());
  });

  it('given build warnings when built then each is logged under the config it came from', () => {
    const { logger, controller } = setup(['/repo/app.bundle.json'], () =>
      result('unchanged', '/repo/src/app.bundle.ts', 0, ['glob.exclude omits a glob']),
    );

    controller.build({ config: [], check: false });

    logger.verify((m) => m.warn('app.bundle.json: glob.exclude omits a glob'), Times.Once());
  });

  it('given a config that fails when built then the error names that config', () => {
    const { controller } = setup(['/repo/app.bundle.json'], () => {
      throw new TicConfigError('output: expected a non-empty string');
    });

    expect(() => controller.build({ config: [], check: false })).toThrow(
      'app.bundle.json: output: expected a non-empty string',
    );
  });

  it('given a stale bundle when checked then every config is still reported before StaleBundlesError', () => {
    const { out, controller } = setup(['/repo/a.bundle.json', '/repo/b.bundle.json'], (config) =>
      result(config === '/repo/a.bundle.json' ? 'stale' : 'unchanged', `${config}.ts`, 1),
    );

    expect(() => controller.build({ config: [], check: true })).toThrow(StaleBundlesError);
    out.verify((m) => m.write(It.IsAny()), Times.Exactly(2));
  });
});
