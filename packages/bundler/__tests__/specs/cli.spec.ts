import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { run } from '../../lib';
import { decorated, TempProject } from '../project';

class Io {
  readonly out: string[] = [];
  readonly err: string[] = [];

  constructor(
    readonly cwd: string,
    private readonly input?: string,
  ) {}

  stdout = (line: string) => this.out.push(line);
  stderr = (line: string) => this.err.push(line);
  get stdin() {
    const { input } = this;
    return input === undefined ? undefined : () => input;
  }
}

const json = (config: object) => JSON.stringify(config);
const services = json({ glob: { paths: ['./src/services'] } });

describe('Story: Describe the container in a config file (tic CLI)', () => {
  let project: TempProject;

  beforeEach(() => {
    project = TempProject.create({ 'src/services/Logger.ts': decorated('Logger') });
  });

  afterEach(() => project.dispose());

  it('builds the bundle named as the first argument from the JSON content passed with --json', () => {
    const io = new Io(project.root);

    expect(run(['build', 'src/di/app.bundle.ts', '--json', services], io)).toBe(0);
    expect(io.out).toEqual(['wrote     src/di/app.bundle.ts (1 registration)']);
    expect(project.read('src/di/app.bundle.ts')).toContain('Registration.fromClass(Logger)');
    expect(project.read('src/di/app.bundle.ts')).toContain('export class AppBundle');
  });

  it('takes YAML content with --yaml', () => {
    const io = new Io(project.root);

    expect(run(['build', 'src/di/prod.bundle.ts', '--yaml', 'glob:\n  paths: [./src]\n'], io)).toBe(0);
    expect(project.read('src/di/prod.bundle.ts')).toContain('export class ProdBundle');
  });

  it('takes the flags before the output too', () => {
    const io = new Io(project.root);

    expect(run(['build', `--json=${services}`, 'src/di/app.bundle.ts'], io)).toBe(0);
    expect(io.out).toEqual(['wrote     src/di/app.bundle.ts (1 registration)']);
  });

  it.each([
    ['--json', services],
    ['--yaml', 'glob: { paths: [./src/services] }'],
  ])('reads the content from stdin with %s -: cat app.bundle.json | tic build <output> --json -', (flag, input) => {
    const io = new Io(project.root, input);

    expect(run(['build', 'src/di/app.bundle.ts', flag, '-'], io)).toBe(0);
    expect(project.read('src/di/app.bundle.ts')).toContain('Registration.fromClass(Logger)');
  });

  it('fails reading stdin when there is none', () => {
    const io = new Io(project.root);

    expect(run(['build', 'src/di/app.bundle.ts', '--json', '-'], io)).toBe(1);
    expect(io.err.join('\n')).toContain('--json -: there is no stdin to read');
  });

  it('never reads a file: a path passed as content is not valid JSON', () => {
    project.write('app.bundle.json', { glob: { paths: ['./src'] } });
    const io = new Io(project.root);

    expect(run(['build', 'src/di/app.bundle.ts', '--json', 'app.bundle.json'], io)).toBe(1);
    expect(io.err.join('\n')).toContain('src/di/app.bundle.ts: --json is not valid JSON');
  });

  it.each([
    [['build', '--json', services], 'missing <output>'],
    [['build', 'a.bundle.ts', 'b.bundle.ts', '--json', services], 'expected one <output>, got a.bundle.ts b.bundle.ts'],
    [['build', 'src/di/app.bundle.ts'], 'pass the config as exactly one of --json <content> or --yaml <content>'],
    [['build', 'src/di/app.bundle.ts', '--json', services, '--yaml', 'glob: {}'], 'exactly one of --json'],
    [['build', 'src/di/app.bundle.ts', '--config', 'app.bundle.json'], "Unknown option '--config'"],
  ])('rejects %j', (argv, message) => {
    const io = new Io(project.root);

    expect(run(argv, io)).toBe(1);
    expect(io.err.join('\n')).toContain(message);
  });

  it('never builds from tsconfig.json alone', () => {
    project.write('tsconfig.json', { include: ['src'] });
    const io = new Io(project.root);

    expect(run(['build', 'src/di/prod.bundle.ts'], io)).toBe(1);
    expect(existsSync(project.path('src/di/prod.bundle.ts'))).toBe(false);
  });

  it('requires a name in the config when the output is not named <name>.bundle.ts', () => {
    const io = new Io(project.root);

    expect(run(['build', 'src/di/container.ts', '--json', services], io)).toBe(1);
    expect(io.err.join('\n')).toContain('src/di/container.ts: name: required');
    expect(run(['build', 'src/di/container.ts', '--json', json({ name: 'app', glob: { paths: ['./src'] } })], io)).toBe(
      0,
    );
  });

  it('never registers a bundle another build generated', () => {
    const io = new Io(project.root);

    run(['build', 'src/di/app.bundle.ts', '--json', services], io);
    run(['build', 'src/di/prod.bundle.ts', '--json', json({ glob: { paths: ['./src'] } })], io);

    expect(project.read('src/di/prod.bundle.ts')).not.toMatch(/fromClass\(AppBundle\)/);
  });

  it('fails --check with a hint when the output is stale, and passes once it is current', () => {
    const io = new Io(project.root);

    expect(run(['build', 'src/di/app.bundle.ts', '--json', services, '--check'], io)).toBe(1);
    expect(io.err.join('\n')).toContain('1 generated bundle is out of date — run `tic build`');

    run(['build', 'src/di/app.bundle.ts', '--json', services], io);
    expect(run(['build', 'src/di/app.bundle.ts', '--json', services, '--check'], io)).toBe(0);
  });

  it('reports a config error on stderr, naming the output', () => {
    const io = new Io(project.root);

    expect(
      run(['build', 'src/di/app.bundle.ts', '--json', json({ output: 'x.ts', glob: { paths: ['./src'] } })], io),
    ).toBe(1);
    expect(io.err).toEqual(['tic: src/di/app.bundle.ts: output: unknown field']);
  });

  it('prints a warning when a non-empty exclude drops the default test globs', () => {
    const io = new Io(project.root);
    const config = json({ glob: { paths: ['./src/services'], exclude: ['legacy/**'] } });

    expect(run(['build', 'src/di/app.bundle.ts', '--json', config], io)).toBe(0);
    expect(io.err.join('\n')).toContain('tic: warning: src/di/app.bundle.ts: glob.exclude');
    expect(io.err.join('\n')).toContain('**/*.spec.ts');
  });

  it('prints a warning when two classes pass the same decorator token', () => {
    const source = (name: string) =>
      `import { register } from 'ts-ioc-container';\n@register(Token)\nexport class ${name} {}\n`;
    project.write('src/services/A.ts', source('A'));
    project.write('src/services/B.ts', source('B'));
    const io = new Io(project.root);

    expect(run(['build', 'src/di/app.bundle.ts', '--json', services], io)).toBe(0);
    expect(io.err.join('\n')).toContain('tic: warning: src/di/app.bundle.ts: decorator token "Token"');
  });

  it('prints usage for --help and rejects an unknown command', () => {
    const io = new Io(project.root);

    expect(run(['--help'], io)).toBe(0);
    expect(io.out.join('\n')).toContain(
      'ts-ioc-container build <output> (--json <content> | --yaml <content>) [--check]',
    );
    expect(io.out.join('\n')).toContain('cat prod.bundle.yml | tic build src/di/prod.bundle.ts --yaml -');
    expect(io.out.join('\n')).toContain('tic is a shortcut for ts-ioc-container');
    expect(run(['compile'], io)).toBe(1);
    expect(io.err).toContain('tic: unknown command "compile"');
  });

  it('installs as ts-ioc-container, with tic as a shortcut to the same program', () => {
    const { bin } = JSON.parse(readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));

    expect(bin).toEqual({ 'ts-ioc-container': 'cjm/bin.js', tic: 'cjm/bin.js' });
  });
});
