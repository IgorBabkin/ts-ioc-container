import { It, Mock, Times } from 'moq.ts';
import {
  BuildController,
  type BuildResult,
  type CliIo,
  type IBundleBuilder,
  type ILogger,
  type IOutputService,
  TicConfigError,
  UsageError,
} from '../../../lib';

const result = (content: string, warnings: string[] = []) =>
  ({ config: '/repo/app.bundle.json', bundle: 'AppBundle', registrations: 1, content, warnings }) satisfies BuildResult;

const setup = (build: () => BuildResult, stdin?: () => string | undefined) => {
  const builder = new Mock<IBundleBuilder>().setup((m) => m.build(It.IsAny())).callback(build);
  const out = new Mock<IOutputService>().setup((m) => m.write(It.IsAny())).returns(undefined);
  const logger = new Mock<ILogger>().setup((m) => m.warn(It.IsAny())).returns(undefined);
  const io: CliIo = { cwd: '/repo', stdout: () => {}, stderr: () => {}, stdin };
  const controller = new BuildController(io, builder.object(), out.object(), logger.object());
  return { builder, out, logger, controller };
};

describe('BuildController', () => {
  it('given a config when built then the bundle is written to stdout once, without its trailing newline', () => {
    const { builder, out, controller } = setup(() => result('// bundle\nexport class AppBundle {}\n'));

    controller.build({ config: 'app.bundle.json' });

    builder.verify((m) => m.build(It.Is((request: { config: string }) => request.config === 'app.bundle.json')));
    out.verify((m) => m.write('// bundle\nexport class AppBundle {}'), Times.Once());
  });

  it('given build warnings when built then each is logged under the config, not printed with the bundle', () => {
    const { out, logger, controller } = setup(() => result('// bundle\n', ['glob.exclude omits a glob']));

    controller.build({ config: 'app.bundle.json' });

    logger.verify((m) => m.warn('app.bundle.json: glob.exclude omits a glob'), Times.Once());
    out.verify((m) => m.write('// bundle'), Times.Once());
  });

  it('given a config that fails when built then the error names the config and nothing is printed', () => {
    const { out, controller } = setup(() => {
      throw new TicConfigError('glob: expected an object');
    });

    expect(() => controller.build({ config: 'app.bundle.json' })).toThrow('app.bundle.json: glob: expected an object');
    out.verify((m) => m.write(It.IsAny()), Times.Never());
  });

  it('given - as the config when built then the config text is read from stdin', () => {
    const { builder, out, controller } = setup(
      () => result('// bundle\n'),
      () => 'name: app\nglob:\n  glob: [./src]\n',
    );

    controller.build({ config: '-' });

    builder.verify((m) =>
      m.build(It.Is((request: { text?: string }) => request.text === 'name: app\nglob:\n  glob: [./src]\n')),
    );
    out.verify((m) => m.write('// bundle'), Times.Once());
  });

  it('given - as the config and nothing piped in when built then it throws UsageError', () => {
    const { controller } = setup(
      () => result('// bundle\n'),
      () => undefined,
    );

    expect(() => controller.build({ config: '-' })).toThrow(UsageError);
    expect(() => controller.build({ config: '-' })).toThrow('missing <config>');
  });

  it('given a stdin config that fails when built then the error names <stdin>', () => {
    const { controller } = setup(
      () => {
        throw new TicConfigError('name: required for a config read from stdin');
      },
      () => 'glob: {}',
    );

    expect(() => controller.build({ config: '-' })).toThrow('<stdin>: name: required for a config read from stdin');
  });
});
