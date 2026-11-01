import { It, Mock, Times } from 'moq.ts';
import {
  BundleController,
  type Bundle,
  type BundledClass,
  type CliIo,
  type IBundleService,
  type ILogger,
  type IOutputService,
  type ITicConfigService,
  type BundleConfig,
  TicConfigError,
  UsageError,
} from '../../../lib';

const result = (content: string, warnings: string[] = [], classes: BundledClass[] = []) =>
  ({
    bundle: 'AppBundle',
    registrations: 1,
    files: [...new Set(classes.map((cls) => cls.file))],
    classes,
    content,
    warnings,
  }) satisfies Bundle;

const resolved = { name: 'app', bundleClassName: 'AppBundle' } as BundleConfig;

const failing = (message: string) => () => {
  throw new TicConfigError(message);
};

const setup = (build: () => Bundle, stdin?: () => string | undefined, resolve: () => BundleConfig = () => resolved) => {
  const configService = new Mock<ITicConfigService>()
    .setup((m) => m.load(It.IsAny()))
    .callback(resolve)
    .setup((m) => m.parse(It.IsAny(), It.IsAny()))
    .callback(resolve);
  const bundleService = new Mock<IBundleService>().setup((m) => m.bundle(It.IsAny())).callback(build);
  const out = new Mock<IOutputService>().setup((m) => m.write(It.IsAny())).returns(undefined);
  const logger = new Mock<ILogger>()
    .setup((m) => m.info(It.IsAny()))
    .returns(undefined)
    .setup((m) => m.warn(It.IsAny()))
    .returns(undefined);
  const io: CliIo = { cwd: '/repo', stdout: () => {}, stderr: () => {}, stdin };
  const controller = new BundleController(
    io,
    configService.object(),
    bundleService.object(),
    out.object(),
    logger.object(),
  );
  return { configService, bundleService, out, logger, controller };
};

describe('BundleController', () => {
  it('given a config when built then it is loaded from the working directory and its bundle written to stdout once, without its trailing newline', () => {
    const { configService, bundleService, out, controller } = setup(() =>
      result('// bundle\nexport class AppBundle {}\n'),
    );

    controller.bundle({ configs: ['app.bundle.json'] });

    configService.verify((m) => m.load(It.Is((files: string[]) => files.join() === '/repo/app.bundle.json')));
    bundleService.verify((m) => m.bundle(resolved), Times.Once());
    out.verify((m) => m.write('// bundle\nexport class AppBundle {}'), Times.Once());
  });

  it('given build warnings when built then each is logged under the config, not printed with the bundle', () => {
    const { out, logger, controller } = setup(() => result('// bundle\n', ['paths.exclude omits a glob']));

    controller.bundle({ configs: ['app.bundle.json'] });

    logger.verify((m) => m.warn('app.bundle.json: paths.exclude omits a glob'), Times.Once());
    out.verify((m) => m.write('// bundle'), Times.Once());
  });

  it('given bundled classes when built then each is logged as its name and its path relative to the working directory', () => {
    const { out, logger, controller } = setup(() =>
      result(
        '// bundle\n',
        [],
        [
          { file: '/repo/src/infra/JsonLogger.ts', className: 'JsonLogger' },
          { file: '/repo/src/services/greeters.ts', className: 'Greeter' },
          { file: '/repo/src/services/greeters.ts', className: 'LoudGreeter' },
        ],
      ),
    );

    controller.bundle({ configs: ['app.bundle.json'] });

    logger.verify((m) => m.info('JsonLogger src/infra/JsonLogger.ts'), Times.Once());
    logger.verify((m) => m.info('Greeter src/services/greeters.ts'), Times.Once());
    logger.verify((m) => m.info('LoudGreeter src/services/greeters.ts'), Times.Once());
    out.verify((m) => m.write('// bundle'), Times.Once());
  });

  it('given a config that fails to load when built then the error names the config and nothing is bundled', () => {
    const { bundleService, out, controller } = setup(
      () => result('// bundle\n'),
      undefined,
      failing('paths: expected an object'),
    );

    expect(() => controller.bundle({ configs: ['app.bundle.json'] })).toThrow(
      'app.bundle.json: paths: expected an object',
    );
    bundleService.verify((m) => m.bundle(It.IsAny()), Times.Never());
    out.verify((m) => m.write(It.IsAny()), Times.Never());
  });

  it('given a config whose bundle fails when built then the error names the config and nothing is printed', () => {
    const { out, controller } = setup(failing('no tsconfig paths alias covers lib/External.ts'));

    expect(() => controller.bundle({ configs: ['app.bundle.json'] })).toThrow(
      'app.bundle.json: no tsconfig paths alias covers lib/External.ts',
    );
    out.verify((m) => m.write(It.IsAny()), Times.Never());
  });

  it('given several configs when built then they are built as one, and a warning names them all', () => {
    const { configService, logger, controller } = setup(() => result('// bundle\n', ['paths.exclude omits a glob']));

    controller.bundle({ configs: ['common.bundle.yml', 'prod.bundle.yml'] });

    configService.verify((m) =>
      m.load(It.Is((files: string[]) => files.join() === '/repo/common.bundle.yml,/repo/prod.bundle.yml')),
    );
    logger.verify((m) => m.warn('common.bundle.yml + prod.bundle.yml: paths.exclude omits a glob'), Times.Once());
  });

  it('given - as the config when built then the config text is read from stdin, against the working directory', () => {
    const { configService, bundleService, out, controller } = setup(
      () => result('// bundle\n'),
      () => 'name: app\npaths:\n  include: [./src]\n',
    );

    controller.bundle({ configs: ['-'] });

    configService.verify((m) => m.parse('name: app\npaths:\n  include: [./src]\n', '/repo'));
    bundleService.verify((m) => m.bundle(resolved), Times.Once());
    out.verify((m) => m.write('// bundle'), Times.Once());
  });

  it('given - as the config and nothing piped in when built then it throws UsageError', () => {
    const { controller } = setup(
      () => result('// bundle\n'),
      () => undefined,
    );

    expect(() => controller.bundle({ configs: ['-'] })).toThrow(UsageError);
    expect(() => controller.bundle({ configs: ['-'] })).toThrow('missing <config>');
  });

  it('given a stdin config that fails when built then the error names <stdin>', () => {
    const { controller } = setup(
      () => result('// bundle\n'),
      () => 'paths: {}',
      failing('name: required for a config read from stdin'),
    );

    expect(() => controller.bundle({ configs: ['-'] })).toThrow('<stdin>: name: required for a config read from stdin');
  });
});
