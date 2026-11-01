import { It, Mock } from 'moq.ts';
import { type IFileSystemService, TicConfigError, TicConfigService } from '../../../lib';

const fileSystem = (content: string | undefined) =>
  new Mock<IFileSystemService>()
    .setup((m) => m.fileExists(It.IsAny()))
    .returns(content !== undefined)
    .setup((m) => m.readFile(It.IsAny()))
    .returns(content ?? '');

describe('TicConfigService', () => {
  it('given no config file when loaded then it throws TicConfigError naming the file', () => {
    const service = new TicConfigService(fileSystem(undefined).object());

    expect(() => service.load('/repo/app.bundle.json')).toThrow('config file not found: /repo/app.bundle.json');
  });

  it('given a file that is not .json, .yaml or .yml when loaded then it throws TicConfigError', () => {
    const service = new TicConfigService(fileSystem('').object());

    expect(() => service.load('/repo/app.bundle.toml')).toThrow(TicConfigError);
  });

  it('given a JSON config that does not parse when loaded then it throws TicConfigError', () => {
    const service = new TicConfigService(fileSystem('{ paths').object());

    expect(() => service.load('/repo/app.bundle.json')).toThrow('not valid JSON');
  });

  it('given a YAML config when loaded then paths resolve against it and the name comes from its file', () => {
    const service = new TicConfigService(fileSystem('paths:\n  include: [./src]\n').object());

    expect(service.load('/repo/production.bundle.yaml')).toMatchObject({
      file: '/repo/production.bundle.yaml',
      dir: '/repo',
      name: 'production',
      bundleClassName: 'ProductionBundle',
      tsconfig: { file: '/repo/tsconfig.json', required: false },
      paths: { include: ['./src'] },
      match: { export: 'any', decorators: ['register'] },
    });
  });

  it('given several configs when loaded then they merge left to right and the last one names the bundle', () => {
    const files: Record<string, string> = {
      '/repo/common.bundle.yml': "paths:\n  include: ['@app/services']\nmatch: '*Service'\n",
      '/repo/prod.bundle.yml': "importExtension: '.js'\npaths:\n  include: [./src/infra]\n",
    };
    const fs = new Mock<IFileSystemService>()
      .setup((m) => m.fileExists(It.IsAny()))
      .callback(({ args: [file] }) => file in files)
      .setup((m) => m.readFile(It.IsAny()))
      .callback(({ args: [file] }) => files[file]);
    const service = new TicConfigService(fs.object());

    expect(service.load(Object.keys(files))).toMatchObject({
      file: '/repo/prod.bundle.yml',
      name: 'prod',
      importExtension: '.js',
      paths: { include: ['@app/services', './src/infra'] },
      match: { glob: [/^[^/]*Service$/] },
    });
  });

  it('given paths and no tsconfig when made into a config then AppBundle scans them from the directory, through ./tsconfig.json', () => {
    const service = new TicConfigService(fileSystem(undefined).object());

    expect(service.fromProject({ dir: '/repo', include: ['src/**/*.ts'] })).toMatchObject({
      dir: '/repo',
      name: 'app',
      bundleClassName: 'AppBundle',
      tsconfig: { file: '/repo/tsconfig.json', required: false },
      paths: { tsconfig: false, include: ['src/**/*.ts'] },
    });
  });

  it('given a tsconfig alone when made into a config then it scans the folders of its aliases, so it must exist', () => {
    const service = new TicConfigService(fileSystem(undefined).object());

    expect(service.fromProject({ dir: '/repo', tsconfig: '/repo/config/tsconfig.di.json' })).toMatchObject({
      tsconfig: { file: '/repo/config/tsconfig.di.json', required: true },
      paths: { tsconfig: true, include: [] },
    });
  });

  it('given neither a tsconfig nor paths when made into a config then it throws TicConfigError', () => {
    const service = new TicConfigService(fileSystem(undefined).object());

    expect(() => service.fromProject({ dir: '/repo' })).toThrow('nothing to bundle');
  });
});
