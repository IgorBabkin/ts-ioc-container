import { It, Mock } from 'moq.ts';
import { type IFileSystemService, TicConfigError, TicConfigService } from '../../../lib';

const fileSystem = (content: string | undefined) =>
  new Mock<IFileSystemService>()
    .setup((m) => m.fileExists(It.IsAny()))
    .returns(content !== undefined)
    .setup((m) => m.readFile(It.IsAny()))
    .returns(content ?? '');

const YAML =
  "bundleClassName: ProductionBundle\nimportExtension: ''\ninclude: [./src]\nexclude: []\nmatch:\n  export: any\n  decorators: [register]\n";

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

  it('given a YAML config when loaded then its fields are taken as written and paths resolve against it', () => {
    const service = new TicConfigService(fileSystem(YAML).object());

    expect(service.load('/repo/di.yaml')).toMatchObject({
      file: '/repo/di.yaml',
      dir: '/repo',
      bundleClassName: 'ProductionBundle',
      importExtension: '',
      include: ['./src'],
      exclude: [],
      match: { export: 'any', decorators: ['register'] },
    });
  });

  it('given several configs when loaded then they merge left to right', () => {
    const files: Record<string, string> = {
      '/repo/common.bundle.yml':
        "bundleClassName: CommonBundle\nimportExtension: ''\ninclude: ['@app/services']\nexclude: []\nmatch:\n  export: any\n  decorators: [register]\n  glob: '*Service'\n",
      '/repo/prod.bundle.yml': "bundleClassName: ProdBundle\nimportExtension: '.js'\ninclude: [./src/infra]\n",
    };
    const fs = new Mock<IFileSystemService>()
      .setup((m) => m.fileExists(It.IsAny()))
      .callback(({ args: [file] }) => file in files)
      .setup((m) => m.readFile(It.IsAny()))
      .callback(({ args: [file] }) => files[file]);
    const service = new TicConfigService(fs.object());

    expect(service.load(Object.keys(files))).toMatchObject({
      file: '/repo/prod.bundle.yml',
      bundleClassName: 'ProdBundle',
      importExtension: '.js',
      include: ['@app/services', './src/infra'],
      match: { glob: [/^[^/]*Service$/] },
    });
  });
});
