import { build, TicConfigError, NamespaceNotFoundError } from '../../lib';
import { decorated, TempProject } from '../project';

const module = (namespaces: unknown[], extra: object = {}) => ({
  modules: [{ output: 'src/di/container.generated.ts', namespaces, ...extra }],
});

describe('Folder registration', () => {
  let project: TempProject;

  afterEach(() => project?.dispose());

  const generated = () => project.read('src/di/container.generated.ts');
  const buildProject = (options: { check?: boolean } = {}) =>
    build({ config: project.path('tic.config.json'), ...options });

  describe('Story: Describe the container in a config file', () => {
    it('resolves relative paths against the config file, not the working directory', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src/services']),
        'src/services/Logger.ts': decorated('Logger'),
      });

      build({ config: project.path('tic.config.json'), cwd: '/' });

      expect(generated()).toContain("import { Logger } from '../services/Logger';");
    });

    it('exports the module under its configured name, ContainerModule by default', () => {
      project = TempProject.create({
        'tic.config.json': {
          modules: [
            { output: 'src/di/a.generated.ts', namespaces: ['./src/services'] },
            { output: 'src/di/b.generated.ts', namespaces: ['./src/services'], name: 'ServicesModule' },
          ],
        },
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(project.read('src/di/a.generated.ts')).toContain('export const ContainerModule: IContainerModule');
      expect(project.read('src/di/b.generated.ts')).toContain('export const ServicesModule: IContainerModule');
    });

    it.each([
      [{}, 'modules: expected a non-empty array'],
      [{ modules: [{ namespaces: ['./src'] }] }, 'modules[0].output: expected a non-empty string'],
      [{ modules: [{ output: 'a.ts', namespaces: [] }] }, 'modules[0].namespaces: expected a non-empty array'],
      [{ modules: [{ output: 'a.ts', namespaces: [{ recursive: true }] }] }, 'modules[0].namespaces[0].path'],
      [{ modules: [{ output: 'a.ts', namespaces: ['./src'], select: 'all' }] }, 'modules[0].select'],
      [{ modules: [{ output: 'a.ts', namespaces: ['./src'], name: 'not valid' }] }, 'modules[0].name'],
    ])('rejects an invalid config %j naming the field', (config, message) => {
      project = TempProject.create({ 'tic.config.json': config });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(message);
    });

    it('fails when the config file does not exist', () => {
      project = TempProject.create({});

      expect(() => buildProject()).toThrow(TicConfigError);
    });
  });

  describe('Story: Register the classes of a folder', () => {
    it('registers every decorated class of a folder recursively, ordered by file path', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src/services']),
        'src/services/b/UserService.ts': decorated('UserService'),
        'src/services/Auth.ts': `${decorated('AuthService')}\n@register()\nexport class TokenService {}\n`,
      });

      buildProject();

      expect(generated()).toContain(
        [
          'export const registrations: IRegistration[] = [',
          '  Registration.fromClass(AuthService),',
          '  Registration.fromClass(TokenService),',
          '  Registration.fromClass(UserService),',
          '];',
        ].join('\n'),
      );
    });

    it('limits a namespace to its own folder when recursive is false', () => {
      project = TempProject.create({
        'tic.config.json': module([{ path: './src/services', recursive: false }]),
        'src/services/Logger.ts': decorated('Logger'),
        'src/services/nested/Hidden.ts': decorated('Hidden'),
      });

      buildProject();

      expect(generated()).toContain('Registration.fromClass(Logger)');
      expect(generated()).not.toContain('Hidden');
    });

    it('skips undecorated, non-exported and abstract classes by default', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src']),
        'src/Classes.ts': [
          "import { register } from 'ts-ioc-container';",
          'export class Plain {}',
          '@register() class Private {}',
          '@register() export abstract class Base {}',
          '@register() export class Kept {}',
        ].join('\n'),
      });

      buildProject();

      expect(generated()).toContain('Registration.fromClass(Kept)');
      expect(generated()).not.toMatch(/Plain|Private|Base/);
    });

    it('registers every exported class with select "exported"', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src'], { select: 'exported' }),
        'src/Classes.ts': 'export class Plain {}\nclass Private {}\nexport abstract class Base {}\n',
      });

      buildProject();

      expect(generated()).toContain('Registration.fromClass(Plain)');
      expect(generated()).not.toMatch(/Private|Base/);
    });

    it('recognises configured decorators, renamed imports and member access', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src'], { decorators: ['register', 'service'] }),
        'src/Renamed.ts': "import { register as reg } from 'ts-ioc-container';\n@reg() export class Renamed {}\n",
        'src/Member.ts': "import * as ioc from 'ts-ioc-container';\n@ioc.register() export class Member {}\n",
        'src/Custom.ts': "import { service } from './service';\n@service export class Custom {}\n",
        'src/Other.ts': "import { other } from './other';\n@other() export class Other {}\n",
      });

      buildProject();

      expect(generated()).toMatch(/fromClass\(Custom\)[\s\S]*fromClass\(Member\)[\s\S]*fromClass\(Renamed\)/);
      expect(generated()).not.toContain('Other');
    });

    it('imports classes exported by export lists and default exports under their exported name', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src']),
        'src/List.ts':
          "import { register } from 'ts-ioc-container';\n@register() class Local {}\nexport { Local as Listed };\n",
        'src/Default.ts': "import { register } from 'ts-ioc-container';\n@register() export default class Main {}\n",
      });

      buildProject();

      expect(generated()).toContain("import Main from '../Default';");
      expect(generated()).toContain("import { Listed } from '../List';");
    });

    it('never registers test files, declaration files or the generated output itself', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src']),
        'src/Kept.ts': decorated('Kept'),
        'src/Kept.spec.ts': decorated('KeptSpec'),
        'src/__tests__/Helper.ts': decorated('Helper'),
        'src/types.d.ts': 'export declare class Declared {}',
        'src/di/container.generated.ts': decorated('Stale'),
      });

      buildProject();

      expect(generated()).toContain('Registration.fromClass(Kept)');
      expect(generated()).not.toMatch(/KeptSpec|Helper|Declared|Stale/);
    });

    it('replaces the default excludes with the configured globs', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src'], { exclude: ['src/legacy/**'] }),
        'src/legacy/Old.ts': decorated('Old'),
        'src/Kept.spec.ts': decorated('KeptSpec'),
      });

      buildProject();

      expect(generated()).toContain('Registration.fromClass(KeptSpec)');
      expect(generated()).not.toContain('Old');
    });
  });

  describe('Story: Address folders by tsconfig aliases', () => {
    const tsconfig = (compilerOptions: object) => ({ compilerOptions });

    it('resolves an alias namespace through inherited tsconfig paths and imports in alias form', () => {
      project = TempProject.create({
        'tic.config.json': module(['@app/services', './lib']),
        'tsconfig.base.json': tsconfig({ paths: { '@app/*': ['./src/*'], '@services/*': ['./src/services/*'] } }),
        'tsconfig.json': { extends: './tsconfig.base.json' },
        'src/services/Logger.ts': decorated('Logger'),
        'lib/External.ts': decorated('External'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '@services/Logger';");
      expect(generated()).toContain("import { External } from '../../lib/External';");
    });

    it('reads the tsconfig named in the config', () => {
      project = TempProject.create({
        'tic.config.json': { tsconfig: './tsconfig.app.json', ...module(['@app/services']) },
        'tsconfig.app.json': tsconfig({ baseUrl: '.', paths: { '@app/*': ['src/*'] } }),
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '@app/services/Logger';");
    });

    it('fails naming a namespace that is neither a folder nor an alias', () => {
      project = TempProject.create({
        'tic.config.json': module(['@app/missing']),
        'tsconfig.json': tsconfig({ paths: { '@app/*': ['./src/*'] } }),
      });

      expect(() => buildProject()).toThrow(NamespaceNotFoundError);
      expect(() => buildProject()).toThrow('@app/missing');
    });

    it('adds a .js extension under nodenext resolution', () => {
      project = TempProject.create({
        'tic.config.json': module(['@app/services']),
        'tsconfig.json': tsconfig({
          module: 'nodenext',
          moduleResolution: 'nodenext',
          paths: { '@app/*': ['./src/*'] },
        }),
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '@app/services/Logger.js';");
    });

    it('lets importExtension override the inferred extension', () => {
      project = TempProject.create({
        'tic.config.json': { importExtension: '', ...module(['./src/services']) },
        'tsconfig.json': tsconfig({ module: 'nodenext', moduleResolution: 'nodenext' }),
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '../services/Logger';");
    });
  });

  describe('Story: Generate a plain container module', () => {
    it('imports same-named classes under distinct local names', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src']),
        'src/a/Logger.ts': decorated('Logger'),
        'src/b/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '../a/Logger';");
      expect(generated()).toContain("import { Logger as Logger_2 } from '../b/Logger';");
      expect(generated()).toContain('Registration.fromClass(Logger_2)');
    });
  });

  describe('Story: Keep generated modules in sync in CI', () => {
    it('reports a missing or outdated output as stale without writing it', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src/services']),
        'src/services/Logger.ts': decorated('Logger'),
      });

      const result = buildProject({ check: true });

      expect(result.outputs.map((o) => o.status)).toEqual(['stale']);
      expect(() => generated()).toThrow();
    });

    it('leaves an up-to-date output untouched', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src/services']),
        'src/services/Logger.ts': decorated('Logger'),
      });

      expect(buildProject().outputs.map((o) => o.status)).toEqual(['written']);
      expect(buildProject().outputs.map((o) => o.status)).toEqual(['unchanged']);
      expect(buildProject({ check: true }).outputs.map((o) => o.status)).toEqual(['unchanged']);
    });
  });
});
