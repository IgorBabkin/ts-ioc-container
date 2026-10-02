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
      'app.bundle.json': { output: 'src/di/container.bundle.ts', files: { paths: ['./src/services'] } },
      'src/services/Logger.ts': decorated('Logger'),
      'other/app.bundle.json': { output: 'out.bundle.ts', files: { paths: ['../src/services'] } },
    });
  });

  afterEach(() => project.dispose());

  it('builds every *.bundle.json in the working directory', () => {
    project.write('production.bundle.json', { output: 'src/di/production.bundle.ts', files: { paths: ['./src'] } });
    project.write('development.bundle.json', { output: 'src/di/development.bundle.ts', files: { paths: ['./src'] } });
    const io = new Io(project.root);

    expect(run(['build'], io)).toBe(0);
    expect(io.out).toEqual([
      'wrote     src/di/container.bundle.ts (1 registration)',
      'wrote     src/di/development.bundle.ts (1 registration)',
      'wrote     src/di/production.bundle.ts (1 registration)',
    ]);
    expect(project.read('src/di/container.bundle.ts')).toContain('Registration.fromClass(Logger)');
  });

  it('never registers a bundle another config generated', () => {
    project.write('production.bundle.json', { output: 'src/di/production.bundle.ts', files: { paths: ['./src'] } });
    const io = new Io(project.root);

    run(['build'], io);
    run(['build'], io);

    expect(project.read('src/di/production.bundle.ts')).not.toMatch(/fromClass\(Bundle\)/);
  });

  it('builds only the configs passed with --config, reporting paths relative to the working directory', () => {
    project.write('other/extra.bundle.json', { output: 'extra.bundle.ts', files: { paths: ['../src/services'] } });
    const io = new Io(project.root);

    expect(run(['build', '--config', 'other/app.bundle.json', '-c', 'other/extra.bundle.json'], io)).toBe(0);
    expect(io.out).toEqual([
      'wrote     other/out.bundle.ts (1 registration)',
      'wrote     other/extra.bundle.ts (1 registration)',
    ]);
  });

  it('falls back to tsconfig.json when the working directory has no *.bundle.json', () => {
    project.write('zero/tsconfig.json', { include: ['src'] });
    project.write('zero/src/Logger.ts', decorated('Logger'));
    const io = new Io(project.path('zero'));

    expect(run(['build'], io)).toBe(0);
    expect(io.out).toEqual(['wrote     src/base.bundle.ts (1 registration)']);
  });

  describe('in a monorepo: the package it is invoked in', () => {
    beforeEach(() => {
      project.write('repo/package.json', { private: true });
      project.write('repo/tsconfig.json', { include: ['packages/*/src'] });
      project.write('repo/packages/a/package.json', { name: 'a' });
      project.write('repo/packages/a/tsconfig.json', { include: ['src'] });
      project.write('repo/packages/a/src/index.ts', 'export {};\n');
      project.write('repo/packages/a/src/services/Logger.ts', decorated('Logger'));
      project.write('repo/packages/b/package.json', { name: 'b' });
      project.write('repo/packages/b/src/Mailer.ts', decorated('Mailer'));
    });

    it("builds from the package's tsconfig.json, even when invoked in a sub-folder", () => {
      const io = new Io(project.path('repo/packages/a/src/services'));

      expect(run(['build'], io)).toBe(0);
      expect(io.out).toEqual(['wrote     ../base.bundle.ts (1 registration)']);
      expect(project.read('repo/packages/a/src/base.bundle.ts')).toContain('Registration.fromClass(Logger)');
    });

    it("builds the package's *.bundle.json, even when invoked in a sub-folder", () => {
      project.write('repo/packages/b/app.bundle.json', { output: 'src/app.bundle.ts', files: { paths: ['./src'] } });
      const io = new Io(project.path('repo/packages/b/src'));

      expect(run(['build'], io)).toBe(0);
      expect(io.out).toEqual(['wrote     app.bundle.ts (1 registration)']);
    });

    it("never falls back to the workspace root's tsconfig.json", () => {
      const io = new Io(project.path('repo/packages/b/src'));

      expect(run(['build'], io)).toBe(1);
      expect(io.err.join('\n')).toContain(`no *.bundle.json or tsconfig.json in ${project.path('repo/packages/b')};`);
    });
  });

  it('fails when the working directory has neither a *.bundle.json nor a tsconfig.json', () => {
    const io = new Io(project.path('src'));

    expect(run(['build'], io)).toBe(1);
    expect(io.err.join('\n')).toContain('no *.bundle.json or tsconfig.json');
  });

  it('fails --check with a hint when an output is stale, and passes once it is current', () => {
    const io = new Io(project.root);

    expect(run(['build', '--check'], io)).toBe(1);
    expect(io.err.join('\n')).toContain('1 generated bundle is out of date — run `tic build`');

    run(['build'], io);
    expect(run(['build', '--check'], io)).toBe(0);
  });

  it('reports a config error on stderr', () => {
    project.write('app.bundle.json', { output: '', files: { paths: ['./src/services'] } });
    const io = new Io(project.root);

    expect(run(['build'], io)).toBe(1);
    expect(io.err).toEqual(['tic: app.bundle.json: output: expected a non-empty string']);
  });

  it('prints a warning when a non-empty exclude drops the default test globs', () => {
    project.write('app.bundle.json', {
      output: 'src/di/container.bundle.ts',
      files: { paths: ['./src/services'], exclude: ['legacy/**'] },
    });
    const io = new Io(project.root);

    expect(run(['build'], io)).toBe(0);
    expect(io.err.join('\n')).toContain('tic: warning: app.bundle.json: files.exclude');
    expect(io.err.join('\n')).toContain('**/*.spec.ts');
  });

  it('prints a warning when two classes pass the same decorator token', () => {
    const source = (name: string) =>
      `import { register } from 'ts-ioc-container';\n@register(Token)\nexport class ${name} {}\n`;
    project.write('src/services/A.ts', source('A'));
    project.write('src/services/B.ts', source('B'));
    const io = new Io(project.root);

    expect(run(['build'], io)).toBe(0);
    expect(io.err.join('\n')).toContain('tic: warning: app.bundle.json: decorator token "Token"');
    expect(io.err.join('\n')).toContain('Token');
  });

  it('prints usage for --help and rejects an unknown command', () => {
    const io = new Io(project.root);

    expect(run(['--help'], io)).toBe(0);
    expect(io.out.join('\n')).toContain('ts-ioc-container build [--config <path>]... [--check]');
    expect(io.out.join('\n')).toContain('tic is a shortcut for ts-ioc-container');
    expect(run(['compile'], io)).toBe(1);
    expect(io.err).toContain('tic: unknown command "compile"');
  });

  it('installs as ts-ioc-container, with tic as a shortcut to the same program', () => {
    const { bin } = JSON.parse(readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));

    expect(bin).toEqual({ 'ts-ioc-container': 'cjm/bin.js', tic: 'cjm/bin.js' });
  });
});
