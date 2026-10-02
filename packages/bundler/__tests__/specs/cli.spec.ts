import { readFileSync } from 'node:fs';
import path from 'node:path';
import { run } from '../../lib';
import { decorated, TempProject } from '../project';

class Io {
  readonly out: string[] = [];
  readonly err: string[] = [];

  constructor(readonly cwd: string) {}

  stdout = (line: string) => this.out.push(line);
  stderr = (line: string) => this.err.push(line);
}

describe('Story: Describe the container in a config file (tic CLI)', () => {
  let project: TempProject;

  beforeEach(() => {
    project = TempProject.create({
      'tic.config.json': { bundles: [{ output: 'src/di/container.bundle.ts', namespaces: ['./src/services'] }] },
      'src/services/Logger.ts': decorated('Logger'),
      'other/tic.config.json': { bundles: [{ output: 'out.bundle.ts', namespaces: ['../src/services'] }] },
    });
  });

  afterEach(() => project.dispose());

  it('builds tic.config.json from the working directory', () => {
    const io = new Io(project.root);

    expect(run(['build'], io)).toBe(0);
    expect(io.out).toEqual(['wrote     src/di/container.bundle.ts (1 registration)']);
    expect(project.read('src/di/container.bundle.ts')).toContain('Registration.fromClass(Logger)');
  });

  it('builds the config passed with --config, reporting paths relative to the working directory', () => {
    const io = new Io(project.root);

    expect(run(['build', '--config', 'other/tic.config.json'], io)).toBe(0);
    expect(io.out).toEqual(['wrote     other/out.bundle.ts (1 registration)']);
  });

  it('fails --check with a hint when an output is stale, and passes once it is current', () => {
    const io = new Io(project.root);

    expect(run(['build', '--check'], io)).toBe(1);
    expect(io.err.join('\n')).toContain('run `tic build`');

    run(['build'], io);
    expect(run(['build', '--check'], io)).toBe(0);
  });

  it('reports a config error on stderr', () => {
    project.write('tic.config.json', { bundles: [] });
    const io = new Io(project.root);

    expect(run(['build'], io)).toBe(1);
    expect(io.err).toEqual(['tic: bundles: expected a non-empty array']);
  });

  it('prints a warning when a non-empty exclude drops the default test globs', () => {
    project.write('tic.config.json', {
      bundles: [{ output: 'src/di/container.bundle.ts', namespaces: ['./src/services'], exclude: ['legacy/**'] }],
    });
    const io = new Io(project.root);

    expect(run(['build'], io)).toBe(0);
    expect(io.err.join('\n')).toContain('tic: warning: bundles[0].exclude');
    expect(io.err.join('\n')).toContain('**/*.spec.ts');
  });

  it('prints usage for --help and rejects an unknown command', () => {
    const io = new Io(project.root);

    expect(run(['--help'], io)).toBe(0);
    expect(io.out.join('\n')).toContain('ts-ioc-container build [--config <path>] [--check]');
    expect(io.out.join('\n')).toContain('tic is a shortcut for ts-ioc-container');
    expect(run(['compile'], io)).toBe(1);
    expect(io.err).toContain('tic: unknown command "compile"');
  });

  it('installs as ts-ioc-container, with tic as a shortcut to the same program', () => {
    const { bin } = JSON.parse(readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));

    expect(bin).toEqual({ 'ts-ioc-container': 'cjm/bin.js', tic: 'cjm/bin.js' });
  });
});
