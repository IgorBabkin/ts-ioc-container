import { build, DEFAULT_EXCLUDE, loadConfig, TicConfigError, NamespaceNotFoundError } from '../../lib';
import { symlinkSync } from 'node:fs';
import { decorated, TempProject } from '../project';

const module = (paths: unknown[], extra: object = {}) => ({
  bundles: [{ output: 'src/di/container.bundle.ts', paths, ...extra }],
});

describe('Folder registration', () => {
  let project: TempProject;

  afterEach(() => project?.dispose());

  const generated = () => project.read('src/di/container.bundle.ts');
  const buildProject = (options: { check?: boolean } = {}) =>
    build({ config: project.path('.bundles.json'), ...options });

  describe('Story: Describe the container in a config file', () => {
    it('resolves relative paths against the config file, not the working directory', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src/services']),
        'src/services/Logger.ts': decorated('Logger'),
      });

      build({ config: project.path('.bundles.json'), cwd: '/' });

      expect(generated()).toContain("import { Logger } from '../services/Logger';");
    });

    it('exports the bundle class under its configured name, Bundle by default', () => {
      project = TempProject.create({
        '.bundles.json': {
          bundles: [
            { output: 'src/di/a.bundle.ts', paths: ['./src/services'] },
            { output: 'src/di/b.bundle.ts', paths: ['./src/services'], name: 'ServicesBundle' },
          ],
        },
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(project.read('src/di/a.bundle.ts')).toContain('export class Bundle implements IContainerModule');
      expect(project.read('src/di/b.bundle.ts')).toContain('export class ServicesBundle implements IContainerModule');
    });

    it('accepts and preserves bundle tags from config', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src/services'], { tags: ['test'] }),
      });

      expect(loadConfig(project.path('.bundles.json')).bundles[0].tags).toEqual(['test']);
    });

    it('defaults omitted bundle tags to an empty array', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src/services']),
      });

      expect(loadConfig(project.path('.bundles.json')).bundles[0].tags).toEqual([]);
    });

    it.each([
      [{}, 'bundles: expected a non-empty array'],
      [{ bundles: [{ paths: ['./src'] }] }, 'bundles[0].output: expected a non-empty string'],
      [{ bundles: [{ output: 'a.ts', paths: [] }] }, 'bundles[0].paths: expected a non-empty array'],
      [{ bundles: [{ output: 'a.ts', paths: [{ recursive: true }] }] }, 'bundles[0].paths[0].path'],
      [{ bundles: [{ output: 'a.ts', paths: ['./src'], name: 'not valid' }] }, 'bundles[0].name'],
      [{ bundles: [{ output: 'a.ts', paths: ['./src'], tags: [1] }] }, 'bundles[0].tags'],
      [{ bundles: [{ output: 'a.ts', namespaces: ['./src'] }] }, 'bundles[0].namespaces: unknown field'],
      [{ bundles: [{ output: 'a.ts', paths: ['./src'], include: './x.cjs' }] }, 'bundles[0].include: unknown field'],
      [{ bundles: [{ output: 'a.ts', paths: ['./src'], select: {} }] }, 'bundles[0].select: unknown field'],
      [{ bundles: [{ output: 'a.ts', paths: ['./src'], exclude: [] }] }, 'bundles[0].exclude: unknown field'],
    ])('rejects an invalid config %j naming the field', (config, message) => {
      project = TempProject.create({ '.bundles.json': config });

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
        '.bundles.json': module(['./src/services']),
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
        '.bundles.json': module([{ path: './src/services', recursive: false }]),
        'src/services/Logger.ts': decorated('Logger'),
        'src/services/nested/Hidden.ts': decorated('Hidden'),
      });

      buildProject();

      expect(generated()).toContain('Registration.fromClass(Logger)');
      expect(generated()).not.toContain('Hidden');
    });

    it('registers every exported class by default, skipping non-exported and abstract ones', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src']),
        'src/Classes.ts': [
          "import { register } from 'ts-ioc-container';",
          'export class Plain {}',
          '@register() export class Decorated {}',
          '@register() class Private {}',
          '@register() export abstract class Base {}',
        ].join('\n'),
      });

      buildProject();

      expect(generated()).toMatch(/fromClass\(Plain\)[\s\S]*fromClass\(Decorated\)/);
      expect(generated()).not.toMatch(/Private|Base/);
    });

    it('imports classes exported by export lists and default exports under their exported name', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src']),
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
        '.bundles.json': module(['./src']),
        'src/Kept.ts': decorated('Kept'),
        'src/Kept.spec.ts': decorated('KeptSpec'),
        'src/__tests__/Helper.ts': decorated('Helper'),
        'src/types.d.ts': 'export declare class Declared {}',
        'src/di/container.bundle.ts': decorated('Stale'),
      });

      buildProject();

      expect(generated()).toContain('Registration.fromClass(Kept)');
      expect(generated()).not.toMatch(/KeptSpec|Helper|Declared|Stale/);
    });

    it('replaces the default excludes with the configured globs', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src'], { files: { exclude: ['src/legacy/**'] } }),
        'src/legacy/Old.ts': decorated('Old'),
        'src/Kept.spec.ts': decorated('KeptSpec'),
      });

      buildProject();

      expect(generated()).toContain('Registration.fromClass(KeptSpec)');
      expect(generated()).not.toContain('Old');
    });

    it('warns when a non-empty exclude drops the default test globs', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src'], { files: { exclude: ['src/legacy/**'] } }),
        'src/legacy/Old.ts': decorated('Old'),
      });

      const { warnings } = buildProject();

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('bundles[0].files.exclude');
      expect(warnings[0]).toContain('**/*.spec.ts');
      expect(warnings[0]).toContain('add them back');
    });

    it('does not warn for a complete exclude or an explicit empty exclude', () => {
      const cases = [{ files: { exclude: [...DEFAULT_EXCLUDE] } }, { files: { exclude: [] } }];

      for (const extra of cases) {
        project = TempProject.create({
          '.bundles.json': module(['./src'], extra),
          'src/Kept.ts': decorated('Kept'),
        });

        expect(buildProject().warnings).toEqual([]);
      }
    });
  });

  describe('Story: Select files by name before parsing', () => {
    const sources = {
      'src/user.service.ts': decorated('UserService'),
      'src/user.repository.ts': decorated('UserRepository'),
      'src/legacy/old.service.ts': decorated('OldService'),
      'src/helpers.ts': decorated('Helper'),
    };
    const registered = () => [...generated().matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name);

    it('parses only files matching one of the include globs', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src'], { files: { include: ['**/*.service.ts', '**/*.repository.ts'] } }),
        ...sources,
      });

      buildProject();

      expect(registered()).toEqual(['OldService', 'UserRepository', 'UserService']);
    });

    it('never reads a file outside the include globs', () => {
      // A dangling `.ts` symlink fails the build the moment it is read.
      const withBrokenFile = (files: object) => {
        project = TempProject.create({ '.bundles.json': module(['./src'], { files }), ...sources });
        symlinkSync(project.path('missing.ts'), project.path('src/broken.ts'));
      };

      withBrokenFile({});
      expect(() => buildProject()).toThrow(/ENOENT/);

      withBrokenFile({ include: ['**/*.service.ts'] });
      expect(() => buildProject()).not.toThrow();
    });

    it('drops files matching exclude even when include matches them', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src'], {
          files: { include: ['**/*.service.ts'], exclude: [...DEFAULT_EXCLUDE, 'src/legacy/**'] },
        }),
        ...sources,
      });

      buildProject();

      expect(registered()).toEqual(['UserService']);
    });

    it('keeps the default excludes when only include is given', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src'], { files: { include: ['**/*.service.ts'] } }),
        'src/user.service.ts': decorated('UserService'),
        'src/user.service.spec.ts': decorated('UserServiceSpec'),
      });

      buildProject();

      expect(registered()).toEqual(['UserService']);
    });

    it('applies the class selector to the files that were parsed', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src'], {
          files: { include: ['**/*.service.ts'] },
          classes: { excludeNameGlob: 'Old*' },
        }),
        ...sources,
      });

      buildProject();

      expect(registered()).toEqual(['UserService']);
    });

    it.each([
      ['src/**', 'bundles[0].files: expected an object'],
      [{ include: [] }, 'bundles[0].files.include: expected a non-empty array of strings'],
      [{ include: [''] }, 'bundles[0].files.include: expected a non-empty array of strings'],
      [{ exclude: 'src/**' }, 'bundles[0].files.exclude: expected an array of strings'],
      [{ only: ['**/*.ts'] }, 'bundles[0].files.only: unknown field'],
    ])('rejects the file rule %j naming the field', (files, message) => {
      project = TempProject.create({ '.bundles.json': module(['./src'], { files }) });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(message);
    });
  });

  describe('Story: Configure which classes a file contributes', () => {
    const classes = [
      "import { register } from 'ts-ioc-container';",
      'export class UserService {}',
      '@register() export class AuthService {}',
      'export class Helper {}',
      '@register() export default class MainService {}',
    ].join('\n');

    const selected = (select: object) => {
      project = TempProject.create({
        '.bundles.json': module(['./src'], { classes: select }),
        'src/Classes.ts': classes,
      });
      buildProject();
      return [...generated().matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name);
    };

    it('applies no restriction beyond being exported when the rule is empty', () => {
      expect(selected({})).toEqual(['UserService', 'AuthService', 'Helper', 'MainService']);
    });

    it.each([
      [{ export: 'named' }, ['UserService', 'AuthService', 'Helper']],
      [{ export: 'default' }, ['MainService']],
    ])('restricts exports with %j', (select, expected) => {
      expect(selected(select)).toEqual(expected);
    });

    it('requires one of the listed decorators', () => {
      expect(selected({ decorators: ['register'] })).toEqual(['AuthService', 'MainService']);
    });

    it('requires the class name to match a glob', () => {
      expect(selected({ nameGlob: '*Service' })).toEqual(['UserService', 'AuthService', 'MainService']);
    });

    it('combines criteria: a class must meet every one', () => {
      expect(selected({ export: 'named', decorators: ['register'], nameGlob: '*Service' })).toEqual(['AuthService']);
    });

    it('recognises decorators by name through renamed imports and member access', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src'], { classes: { decorators: ['register', 'service'] } }),
        'src/Renamed.ts': "import { register as reg } from 'ts-ioc-container';\n@reg() export class Renamed {}\n",
        'src/Member.ts': "import * as ioc from 'ts-ioc-container';\n@ioc.register() export class Member {}\n",
        'src/Custom.ts': "import { service } from './service';\n@service export class Custom {}\n",
        'src/Other.ts': "import { other } from './other';\n@other() export class Other {}\n",
      });

      buildProject();

      expect(generated()).toMatch(/fromClass\(Custom\)[\s\S]*fromClass\(Member\)[\s\S]*fromClass\(Renamed\)/);
      expect(generated()).not.toContain('Other');
    });

    it('matches the name of an anonymous default export by its file name', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src'], { classes: { nameGlob: '*Service' } }),
        'src/user-service.ts': 'export default class {}\n',
      });

      buildProject();

      expect(generated()).toContain("import UserService from '../user-service';");
    });

    it('drops classes by exact name with excludeClasses', () => {
      expect(selected({ excludeClasses: ['Helper', 'AuthService'] })).toEqual(['UserService', 'MainService']);
    });

    it('drops classes whose name matches excludeNameGlob', () => {
      expect(selected({ excludeNameGlob: '*Service' })).toEqual(['Helper']);
    });

    it('applies exclusions after the positive criteria', () => {
      expect(selected({ decorators: ['register'], excludeClasses: ['MainService'] })).toEqual(['AuthService']);
    });

    it.each([
      ['decorated', 'bundles[0].classes: expected an object'],
      [{ export: 'all' }, 'bundles[0].classes.export: expected "any", "named" or "default"'],
      [{ decorators: [] }, 'bundles[0].classes.decorators: expected a non-empty array of strings'],
      [{ nameGlob: '' }, 'bundles[0].classes.nameGlob: expected a non-empty string'],
      [{ excludeClasses: [] }, 'bundles[0].classes.excludeClasses: expected a non-empty array of strings'],
      [{ excludeNameGlob: '' }, 'bundles[0].classes.excludeNameGlob: expected a non-empty string'],
      [{ exported: true }, 'bundles[0].classes.exported: unknown field'],
    ])('rejects the rule %j naming the field', (select, message) => {
      project = TempProject.create({ '.bundles.json': module(['./src'], { classes: select }) });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(message);
    });
  });

  describe('Story: Warn about two classes binding the same token', () => {
    const repo = (name: string, token = 'IDashboardRepositoryToken') =>
      `import { repository } from 'ts-ioc-container';\n@repository(${token})\nexport class ${name} {}\n`;

    it('warns when two selected classes pass the same decorator identifier', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src']),
        'src/HttpDashboardRepository.ts': repo('HttpDashboardRepository'),
        'src/MockDashboardRepository.ts': repo('MockDashboardRepository'),
      });

      const { warnings } = buildProject();

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('bundles[0]');
      expect(warnings[0]).toContain('IDashboardRepositoryToken');
      expect(warnings[0]).toContain('HttpDashboardRepository, MockDashboardRepository');
      expect(warnings[0]).toContain('classes.excludeClasses');
    });

    it('does not warn once one colliding class is excluded', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src'], { classes: { excludeClasses: ['MockDashboardRepository'] } }),
        'src/HttpDashboardRepository.ts': repo('HttpDashboardRepository'),
        'src/MockDashboardRepository.ts': repo('MockDashboardRepository'),
      });

      expect(buildProject().warnings).toEqual([]);
      expect(generated()).not.toContain('MockDashboardRepository');
    });

    it('ignores decorators whose first argument is not a plain identifier', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src']),
        'src/A.ts': decorated('A'),
        'src/B.ts': decorated('B'),
      });

      expect(buildProject().warnings).toEqual([]);
    });

    it('does not warn when a shared decorator scopes the colliding classes apart', () => {
      const scoped = (name: string, page: string) =>
        `import { repository } from 'ts-ioc-container';\n` +
        `import { perPage } from './scope';\n` +
        `@repository(IFilterChipsToken)\n@perPage('${page}')\nexport class ${name} {}\n`;
      project = TempProject.create({
        '.bundles.json': module(['./src']),
        'src/StationFilterChips.ts': scoped('StationFilterChips', 'stations'),
        'src/SessionFilterChips.ts': scoped('SessionFilterChips', 'sessions'),
      });

      expect(buildProject().warnings).toEqual([]);
    });

    it('still warns when the shared decorator has the same argument', () => {
      const scoped = (name: string) =>
        `import { repository } from 'ts-ioc-container';\n` +
        `import { perPage } from './scope';\n` +
        `@repository(IFilterChipsToken)\n@perPage('stations')\nexport class ${name} {}\n`;
      project = TempProject.create({
        '.bundles.json': module(['./src']),
        'src/A.ts': scoped('A'),
        'src/B.ts': scoped('B'),
      });

      expect(buildProject().warnings).toHaveLength(1);
    });
  });

  describe('Story: Address folders by tsconfig aliases', () => {
    const tsconfig = (compilerOptions: object) => ({ compilerOptions });

    it('resolves an alias namespace through inherited tsconfig paths and imports in alias form', () => {
      project = TempProject.create({
        '.bundles.json': module(['@app/services', './lib']),
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
        '.bundles.json': { tsconfig: './tsconfig.app.json', ...module(['@app/services']) },
        'tsconfig.app.json': tsconfig({ baseUrl: '.', paths: { '@app/*': ['src/*'] } }),
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '@app/services/Logger';");
    });

    it('fails naming a namespace that is neither a folder nor an alias', () => {
      project = TempProject.create({
        '.bundles.json': module(['@app/missing']),
        'tsconfig.json': tsconfig({ paths: { '@app/*': ['./src/*'] } }),
      });

      expect(() => buildProject()).toThrow(NamespaceNotFoundError);
      expect(() => buildProject()).toThrow('@app/missing');
    });

    it('adds a .js extension under nodenext resolution', () => {
      project = TempProject.create({
        '.bundles.json': module(['@app/services']),
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
        '.bundles.json': { importExtension: '', ...module(['./src/services']) },
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
        '.bundles.json': module(['./src']),
        'src/a/Logger.ts': decorated('Logger'),
        'src/b/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '../a/Logger';");
      expect(generated()).toContain("import { Logger as Logger_2 } from '../b/Logger';");
      expect(generated()).toContain('Registration.fromClass(Logger_2)');
    });
  });

  describe('Story: Generate a plain container module (protocol)', () => {
    it('writes paths into the generated TypeScript verbatim, never HTML-escaped', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src/a&b']),
        'src/a&b/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '../a&b/Logger';");
      expect(generated()).not.toMatch(/&amp;|&#x27;|&quot;/);
    });
  });

  describe('Story: Keep bundles in sync in CI', () => {
    it('reports a missing or outdated output as stale without writing it', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src/services']),
        'src/services/Logger.ts': decorated('Logger'),
      });

      const result = buildProject({ check: true });

      expect(result.outputs.map((o) => o.status)).toEqual(['stale']);
      expect(() => generated()).toThrow();
    });

    it('leaves an up-to-date output untouched', () => {
      project = TempProject.create({
        '.bundles.json': module(['./src/services']),
        'src/services/Logger.ts': decorated('Logger'),
      });

      expect(buildProject().outputs.map((o) => o.status)).toEqual(['written']);
      expect(buildProject().outputs.map((o) => o.status)).toEqual(['unchanged']);
      expect(buildProject({ check: true }).outputs.map((o) => o.status)).toEqual(['unchanged']);
    });
  });
});
