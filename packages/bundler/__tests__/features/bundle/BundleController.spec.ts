import { It, Mock, Times } from 'moq.ts';
import {
  BUILD_OPTIONS,
  BundleController,
  type Bundle,
  type BundledClass,
  type CliIo,
  type IBundleService,
  type ILogger,
  type IOutputService,
  type ITicConfigService,
  type ProjectSources,
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
    .callback(resolve)
    .setup((m) => m.fromProject(It.IsAny()))
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

  it('given bundled classes when built then each is logged, indented, as its name and its path relative to the working directory', () => {
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

    logger.verify((m) => m.info('  JsonLogger: src/infra/JsonLogger.ts'), Times.Once());
    logger.verify((m) => m.info('  Greeter: src/services/greeters.ts'), Times.Once());
    logger.verify((m) => m.info('  LoudGreeter: src/services/greeters.ts'), Times.Once());
    out.verify((m) => m.write('// bundle'), Times.Once());
  });

  it('given a bundle when built then its start is logged before it is bundled and a summary after it is written', () => {
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

    logger.verify((m) => m.info('Bundling AppBundle...'), Times.Once());
    logger.verify((m) => m.info('Bundled AppBundle: 3 dependencies from 2 files'), Times.Once());
    out.verify((m) => m.write('// bundle'), Times.Once());
  });

  it('given one class and a warning when built then the summary counts them in the singular', () => {
    const { logger, controller } = setup(() =>
      result('// bundle\n', ['paths.exclude omits a glob'], [{ file: '/repo/src/Clock.ts', className: 'Clock' }]),
    );

    controller.bundle({ configs: ['app.bundle.json'] });

    logger.verify((m) => m.info('Bundled AppBundle: 1 dependency from 1 file (1 warning)'), Times.Once());
  });

  it('given a config that fails to load when built then nothing but the error is reported', () => {
    const { logger, controller } = setup(() => result('// bundle\n'), undefined, failing('paths: expected an object'));

    expect(() => controller.bundle({ configs: ['app.bundle.json'] })).toThrow(
      'app.bundle.json: paths: expected an object',
    );
    logger.verify((m) => m.info(It.IsAny()), Times.Never());
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

  it('given paths when built then they are scanned from the working directory, without a tsconfig named', () => {
    const { configService, controller } = setup(() => result('// bundle\n'));

    controller.bundle({ configs: [], include: ['src/**/*.ts'] });

    configService.verify((m) =>
      m.fromProject(
        It.Is<ProjectSources>(
          ({ dir, tsconfig, include }) =>
            dir === '/repo' && tsconfig === undefined && include?.join() === 'src/**/*.ts',
        ),
      ),
    );
  });

  it('given a tsconfig and paths when built then the tsconfig is resolved from the working directory and a failure names both', () => {
    const { configService, controller } = setup(
      () => result('// bundle\n'),
      undefined,
      failing('namespace "lib" is neither a folder'),
    );

    expect(() =>
      controller.bundle({ configs: [], tsconfig: 'config/tsconfig.di.json', include: ['lib/*.ts'] }),
    ).toThrow('config/tsconfig.di.json + lib/*.ts: namespace "lib" is neither a folder');
    configService.verify((m) =>
      m.fromProject(It.Is<ProjectSources>(({ tsconfig }) => tsconfig === '/repo/config/tsconfig.di.json')),
    );
  });
});

describe('BUILD_OPTIONS', () => {
  const parse = (...positionals: string[]) => BUILD_OPTIONS.safeParse({ positionals });

  it.each([
    [['app.bundle.json', 'prod.bundle.yml'], { configs: ['app.bundle.json', 'prod.bundle.yml'], include: [] }],
    [['app.bundle.toml'], { configs: ['app.bundle.toml'], include: [] }],
    [['-'], { configs: ['-'], include: [] }],
    [[], { configs: ['-'], include: [] }],
    [['tsconfig.json'], { configs: [], tsconfig: 'tsconfig.json', include: [] }],
    [['config/tsconfig.build.json', 'src'], { configs: [], tsconfig: 'config/tsconfig.build.json', include: ['src'] }],
    [
      ['src/**/*.ts', 'lib/Clock.ts', '@app/services'],
      { configs: [], include: ['src/**/*.ts', 'lib/Clock.ts', '@app/services'] },
    ],
  ])('given %j when parsed then it sorts them into configs, a tsconfig and paths', (positionals, expected) => {
    expect(parse(...positionals).data).toEqual(expected);
  });

  it.each([
    [['-', 'src'], 'cannot be combined with other arguments'],
    [['app.bundle.json', 'src/**'], 'config files cannot be combined'],
    [['app.bundle.json', 'tsconfig.json'], 'config files cannot be combined'],
    [['tsconfig.json', 'tsconfig.app.json'], 'name one tsconfig, not 2'],
  ])('given %j when parsed then it fails', (positionals, message) => {
    const result = parse(...positionals);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(message);
  });
});
