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
    const service = new TicConfigService('/repo', fileSystem(undefined).object());

    expect(() => service.load('/repo/app.bundle.json')).toThrow(TicConfigError);
    expect(() => service.load('/repo/app.bundle.json')).toThrow('config file not found: /repo/app.bundle.json');
  });

  it('given a JSON config that does not parse when loaded then it throws TicConfigError', () => {
    const service = new TicConfigService('/repo', fileSystem('{ output').object());

    expect(() => service.load('/repo/app.bundle.json')).toThrow('/repo/app.bundle.json is not valid JSON');
  });

  it('given an empty YAML config when loaded then every setting takes its default', () => {
    const service = new TicConfigService('/repo', fileSystem('').object());

    const resolved = service.load('/repo/production.bundle.yaml');

    expect(resolved).toMatchObject({
      name: 'production',
      className: 'ProductionBundle',
      tsconfig: { file: '/repo/tsconfig.json', required: false },
      classes: { export: 'any', decorators: ['register'] },
    });
  });

  it('given configs named on the command line when discovered then they resolve against the working directory', () => {
    const service = new TicConfigService('/repo', fileSystem(undefined).object());

    expect(service.discover(['a.bundle.json', 'sub/b.bundle.yaml'])).toEqual([
      '/repo/a.bundle.json',
      '/repo/sub/b.bundle.yaml',
    ]);
  });
});
