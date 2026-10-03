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
    const service = new TicConfigService(fileSystem('{ glob').object());

    expect(() => service.load('/repo/app.bundle.json')).toThrow('not valid JSON');
  });

  it('given a YAML config when loaded then paths resolve against it and the name comes from its file', () => {
    const service = new TicConfigService(fileSystem('glob:\n  glob: [./src]\n').object());

    expect(service.load('/repo/production.bundle.yaml')).toMatchObject({
      file: '/repo/production.bundle.yaml',
      dir: '/repo',
      name: 'production',
      bundleClassName: 'ProductionBundle',
      tsconfig: { file: '/repo/tsconfig.json', required: false },
      glob: { glob: ['./src'] },
      className: { export: 'any', decorators: ['register'] },
    });
  });
});
