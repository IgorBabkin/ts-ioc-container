import { build, type BuildResult, DEFAULT_EXCLUDE, TicConfigError, NamespaceNotFoundError } from '../../lib';
import { existsSync, symlinkSync } from 'node:fs';
import { decorated, TempProject } from '../project';

// The bundle goes to stdout, so every import is written through a tsconfig alias: each
// project gets one covering its root unless a test brings its own tsconfig.json.
const ROOT_ALIAS = { compilerOptions: { paths: { '@/*': ['./*'] } } };
const create = (files: Record<string, string | object>) =>
  TempProject.create({ 'tsconfig.json': ROOT_ALIAS, ...files });

const module = (folders: unknown[], { glob, ...extra }: { glob?: object; [field: string]: unknown } = {}) => ({
  glob: { glob: folders, ...glob },
  ...extra,
});

describe('Folder registration', () => {
  let project: TempProject;

  afterEach(() => project?.dispose());

  let last: BuildResult;
  const buildFrom = (config: string) => (last = build({ config, cwd: project.root }));
  const buildProject = () => buildFrom('app.bundle.json');
  const generated = () => last.content;

  describe('Story: Describe the container in a config file', () => {
    it('resolves relative paths against the config file, not the working directory', () => {
      project = create({
        'config/app.bundle.json': module(['../src/services'], { tsconfig: '../tsconfig.json' }),
        'src/services/Logger.ts': decorated('Logger'),
      });

      last = build({ config: project.path('config/app.bundle.json'), cwd: '/' });

      expect(generated()).toContain("import { Logger } from '@/src/services/Logger';");
    });

    it('returns the bundle and writes nothing', () => {
      project = create({ 'app.bundle.json': module(['./src']), 'src/Logger.ts': decorated('Logger') });

      const result = buildProject();

      expect(result).toMatchObject({ bundle: 'AppBundle', registrations: 1, config: project.path('app.bundle.json') });
      expect(result.content).toContain('export class AppBundle implements IContainerModule');
      expect(existsSync(project.path('src/app.bundle.ts'))).toBe(false);
    });

    it.each([
      ['app.bundle.toml', 'expected a .json, .yaml or .yml config file'],
      ['missing.bundle.json', 'config file not found'],
    ])('rejects the config file %s', (file, message) => {
      project = create({ 'app.bundle.toml': 'glob = {}' });

      expect(() => buildFrom(file)).toThrow(TicConfigError);
      expect(() => buildFrom(file)).toThrow(message);
    });

    it.each([
      [{}, 'export class AppBundle implements IContainerModule'],
      [{ name: 'services' }, 'export class ServicesBundle implements IContainerModule'],
      [{ name: 'my-app_v2' }, 'export class MyAppV2Bundle implements IContainerModule'],
    ])('names the bundle class after the bundle name, by default the config file stem (%j)', (extra, expected) => {
      project = create({
        'app.bundle.json': module(['./src/services'], extra),
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain(expected);
    });

    it('describes exactly one bundle: a bundles list is an unknown field', () => {
      project = create({ 'app.bundle.json': { bundles: [module(['./src'])] } });

      expect(() => buildProject()).toThrow('bundles: unknown field');
    });

    it.each([
      [[], 'config: expected an object'],
      [{}, 'glob: expected a folder, a non-empty array of folders or an object with "glob"'],
      [module(['./src'], { output: 'src/di/container.bundle.ts' }), 'output: unknown field'],
      [{ glob: {} }, 'glob.glob: expected a folder or a non-empty array of folders'],
      [{ glob: { exclude: ['**/*.ts'] } }, 'glob.glob: expected a folder or a non-empty array of folders'],
      [{ glob: '' }, 'glob: expected a non-empty string'],
      [{ glob: [] }, 'glob: expected a non-empty array'],
      [{ glob: 42 }, 'glob: expected a folder, a non-empty array of folders or an object with "glob"'],
      [{ glob: { glob: [] } }, 'glob.glob: expected a non-empty array'],
      [{ glob: { glob: [{ path: './src' }] } }, 'glob.glob[0]: expected a non-empty string'],
      [{ glob: [{ path: './src', recursive: false }] }, 'glob[0]: expected a non-empty string'],
      [{ glob: { glob: 42 } }, 'glob.glob: expected a folder or a non-empty array of folders'],
      [module(['./src'], { name: 'not valid' }), 'name: expected letters, digits, "-" or "_", starting with a letter'],
      [module(['./src'], { name: '2fa' }), 'name: expected letters, digits, "-" or "_", starting with a letter'],
      [module(['./src'], { tags: ['production'] }), 'tags: unknown field'],
      [module(['./src'], { tsconfig: '' }), 'tsconfig: expected a non-empty string'],
      [module(['./src'], { extends: './tsconfig.json' }), 'extends: unknown field'],
      [{ paths: ['./src'] }, 'paths: unknown field'],
      [{ namespaces: ['./src'] }, 'namespaces: unknown field'],
      [module(['./src'], { include: './x.cjs' }), 'include: unknown field'],
      [module(['./src'], { select: {} }), 'select: unknown field'],
      [module(['./src'], { exclude: [] }), 'exclude: unknown field'],
      [module(['./src'], { compilerOptions: {} }), 'compilerOptions: unknown field'],
    ])('rejects an invalid config %j naming the field', (config, message) => {
      project = create({ 'app.bundle.json': config });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(message);
    });
  });

  describe('Story: Name the scanned folders without an object', () => {
    it.each([
      ['a folder', './src/services'],
      ['a list of folders', ['./src/services', './src/infra']],
      ['an object whose glob is a folder', { glob: './src/services' }],
    ])('takes glob as %s, keeping the default exclude', (_, glob) => {
      project = create({
        'app.bundle.json': { glob },
        'src/services/Logger.ts': decorated('Logger'),
        'src/services/Logger.spec.ts': decorated('LoggerSpec'),
        'src/infra/Db.ts': decorated('Db'),
      });

      const { warnings } = buildProject();

      expect(generated()).toContain('Registration.fromClass(Logger)');
      expect(generated()).not.toContain('LoggerSpec');
      expect(warnings).toEqual([]);
    });
  });

  describe('Story: Write the config in YAML', () => {
    const yaml = [
      'name: services',
      'glob:',
      '  glob:',
      '    - ./src/services',
      'className:',
      '  decorators: [register]',
      '',
    ].join('\n');

    it.each(['app.bundle.yaml', 'app.bundle.yml'])('reads %s like its JSON twin', (file) => {
      project = create({ [file]: yaml, 'src/services/Logger.ts': decorated('Logger') });

      expect(buildFrom(file).bundle).toBe('ServicesBundle');
      expect(generated()).toContain('Registration.fromClass(Logger)');
      expect(generated()).toContain('// Generated by `tic build`. Do not edit by hand.');
    });

    it('rejects an empty YAML file: glob must be written out', () => {
      project = create({ 'production.bundle.yaml': '', 'tsconfig.json': { include: ['src'] } });

      expect(() => buildFrom('production.bundle.yaml')).toThrow(
        'glob: expected a folder, a non-empty array of folders or an object with "glob"',
      );
    });

    it.each([
      ['glob: [unclosed', /not valid YAML/],
      ['- glob: {}', 'config: expected an object'],
      ['glob:\n  glob: [./src]\nselect: {}', 'select: unknown field'],
      ['output: src/di/app.bundle.ts', 'output: unknown field'],
    ])('rejects %j naming the problem', (source, message) => {
      project = create({ 'app.bundle.yaml': source });

      expect(() => buildFrom('app.bundle.yaml')).toThrow(TicConfigError);
      expect(() => buildFrom('app.bundle.yaml')).toThrow(message);
    });
  });

  describe('Story: Register the classes of a folder', () => {
    it('registers every decorated class of a folder recursively, ordered by file path', () => {
      project = create({
        'app.bundle.json': module(['./src/services']),
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

    it('scans the folders of a list, each one recursively', () => {
      project = create({
        'app.bundle.json': module(['./src/services', './src/infra']),
        'src/services/Logger.ts': decorated('Logger'),
        'src/infra/nested/Db.ts': decorated('Db'),
      });

      buildProject();

      expect(generated()).toContain('Registration.fromClass(Logger)');
      expect(generated()).toContain('Registration.fromClass(Db)');
    });

    it('registers exported classes, skipping non-exported and abstract ones', () => {
      project = create({
        'app.bundle.json': module(['./src'], { className: { decorators: [] } }),
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
      project = create({
        'app.bundle.json': module(['./src']),
        'src/List.ts':
          "import { register } from 'ts-ioc-container';\n@register() class Local {}\nexport { Local as Listed };\n",
        'src/Default.ts': "import { register } from 'ts-ioc-container';\n@register() export default class Main {}\n",
      });

      buildProject();

      expect(generated()).toContain("import Main from '@/src/Default';");
      expect(generated()).toContain("import { Listed } from '@/src/List';");
    });

    it('never registers test files, declaration files or a bundle tic build generated', () => {
      project = create({
        'app.bundle.json': module(['./src']),
        'src/Kept.ts': decorated('Kept'),
        'src/Kept.spec.ts': decorated('KeptSpec'),
        'src/__tests__/Helper.ts': decorated('Helper'),
        'src/types.d.ts': 'export declare class Declared {}',
        'src/di/app.bundle.ts': `// Generated by \`tic build\`. Do not edit by hand.\n${decorated('Stale')}`,
      });

      buildProject();

      expect(generated()).toContain('Registration.fromClass(Kept)');
      expect(generated()).not.toMatch(/KeptSpec|Helper|Declared|Stale/);
    });

    it('replaces the default excludes with the configured globs', () => {
      project = create({
        'app.bundle.json': module(['./src'], { glob: { exclude: ['src/legacy/**'] } }),
        'src/legacy/Old.ts': decorated('Old'),
        'src/Kept.spec.ts': decorated('KeptSpec'),
      });

      buildProject();

      expect(generated()).toContain('Registration.fromClass(KeptSpec)');
      expect(generated()).not.toContain('Old');
    });

    it('warns when a non-empty exclude drops the default test globs', () => {
      project = create({
        'app.bundle.json': module(['./src'], { glob: { exclude: ['src/legacy/**'] } }),
        'src/legacy/Old.ts': decorated('Old'),
      });

      const { warnings } = buildProject();

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('glob.exclude');
      expect(warnings[0]).toContain('**/*.spec.ts');
      expect(warnings[0]).toContain('add them back');
    });

    it('does not warn for a complete exclude or an explicit empty exclude', () => {
      const cases = [{ glob: { exclude: [...DEFAULT_EXCLUDE] } }, { glob: { exclude: [] } }];

      for (const extra of cases) {
        project = create({
          'app.bundle.json': module(['./src'], extra),
          'src/Kept.ts': decorated('Kept'),
        });

        expect(buildProject().warnings).toEqual([]);
      }
    });
  });

  describe('Story: Exclude files by path before parsing', () => {
    const sources = {
      'src/user.service.ts': decorated('UserService'),
      'src/user.repository.ts': decorated('UserRepository'),
      'src/legacy/old.service.ts': decorated('OldService'),
      'src/helpers.ts': decorated('Helper'),
    };
    const registered = () => [...generated().matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name);

    it('never reads an excluded file', () => {
      // A dangling `.ts` symlink fails the build the moment it is read.
      const withBrokenFile = (glob: object) => {
        project = create({ 'app.bundle.json': module(['./src'], { glob }), ...sources });
        symlinkSync(project.path('missing.ts'), project.path('src/broken.ts'));
      };

      withBrokenFile({});
      expect(() => buildProject()).toThrow(/ENOENT/);

      withBrokenFile({ exclude: [...DEFAULT_EXCLUDE, 'src/broken.ts'] });
      expect(() => buildProject()).not.toThrow();
    });

    it('takes a single exclude glob as a string, replacing the defaults', () => {
      project = create({ 'app.bundle.json': module(['./src'], { glob: { exclude: 'src/legacy/**' } }), ...sources });

      const { warnings } = buildProject();

      expect(registered()).toEqual(['Helper', 'UserRepository', 'UserService']);
      expect(warnings[0]).toContain('glob.exclude');
    });

    it('applies the class selector to the files that were parsed', () => {
      project = create({
        'app.bundle.json': module(['./src'], {
          glob: { exclude: [...DEFAULT_EXCLUDE, 'src/helpers.ts'] },
          className: { exclude: 'Old*' },
        }),
        ...sources,
      });

      buildProject();

      expect(registered()).toEqual(['UserRepository', 'UserService']);
    });

    describe('through a tsconfig paths alias, as glob.glob takes one', () => {
      const aliased = (exclude: string[], paths: Record<string, string[]> = {}) => {
        project = create({
          'tsconfig.json': {
            compilerOptions: { paths: { '@/*': ['./*'], '@legacy/*': ['./src/legacy/*'], ...paths } },
          },
          'app.bundle.json': module(['./src'], { glob: { exclude: [...DEFAULT_EXCLUDE, ...exclude] } }),
          ...sources,
        });
        buildProject();
      };

      it.each([['@legacy/**'], ['@legacy/'], ['@legacy'], ['@/src/legacy/**']])(
        'drops the folder %s names',
        (exclude) => {
          aliased([exclude]);

          expect(registered()).toEqual(['Helper', 'UserRepository', 'UserService']);
        },
      );

      it('keeps the glob after the alias', () => {
        aliased(['@/src/**/*.repository.ts']);

        expect(registered()).toEqual(['Helper', 'OldService', 'UserService']);
      });

      it('drops every target of an alias with several', () => {
        aliased(['@dropped/*.ts'], { '@dropped/*': ['./src/legacy/*', './src/*'] });

        expect(registered()).toEqual([]);
      });

      it('never reads a file through a catch-all alias', () => {
        aliased(['src/helpers.ts'], { '*': ['./src/legacy/*'] });

        expect(registered()).toEqual(['OldService', 'UserRepository', 'UserService']);
      });
    });

    it.each([
      [{ include: ['**/*.service.ts'] }, 'glob.include: unknown field'],
      [{ exclude: '' }, 'glob.exclude: expected a glob or an array of globs'],
      [{ exclude: [42] }, 'glob.exclude: expected a glob or an array of globs'],
      [{ only: ['**/*.ts'] }, 'glob.only: unknown field'],
    ])('rejects the file rule %j naming the field', (glob, message) => {
      project = create({ 'app.bundle.json': module(['./src'], { glob }) });

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

    // Each criterion in isolation: `decorators: []` lifts the default @register requirement.
    const selected = (select: object) => {
      project = create({
        'app.bundle.json': module(['./src'], { className: { decorators: [], ...select } }),
        'src/Classes.ts': classes,
      });
      buildProject();
      return [...generated().matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name);
    };

    it('registers classes decorated with @register by default', () => {
      project = create({ 'app.bundle.json': module(['./src']), 'src/Classes.ts': classes });
      buildProject();

      expect([...generated().matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name)).toEqual([
        'AuthService',
        'MainService',
      ]);
    });

    it('lifts the decorator requirement with an empty decorators list', () => {
      expect(selected({ decorators: [] })).toEqual(['UserService', 'AuthService', 'Helper', 'MainService']);
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
      expect(selected({ glob: '*Service' })).toEqual(['UserService', 'AuthService', 'MainService']);
    });

    it('requires the class name to match one of a list of globs', () => {
      expect(selected({ glob: ['Auth*', 'Helper'] })).toEqual(['AuthService', 'Helper']);
    });

    it('combines criteria: a class must meet every one', () => {
      expect(selected({ export: 'named', decorators: ['register'], glob: '*Service' })).toEqual(['AuthService']);
    });

    it('recognises decorators by name through renamed imports and member access', () => {
      project = create({
        'app.bundle.json': module(['./src'], { className: { decorators: ['register', 'service'] } }),
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
      project = create({
        'app.bundle.json': module(['./src'], { className: { decorators: [], glob: '*Service' } }),
        'src/user-service.ts': 'export default class {}\n',
      });

      buildProject();

      expect(generated()).toContain("import UserService from '@/src/user-service';");
    });

    it('drops classes whose name matches exclude', () => {
      expect(selected({ exclude: '*Service' })).toEqual(['Helper']);
    });

    it('drops classes matching any exclude glob: a plain name drops exactly that class', () => {
      expect(selected({ exclude: ['Helper', 'Auth*'] })).toEqual(['UserService', 'MainService']);
    });

    it.each([
      ['a glob', 'Auth*', ['AuthService']],
      ['a list of globs', ['Auth*', 'Helper'], ['AuthService']],
    ])(
      'takes className as %s: a shortcut for className.glob, keeping the default decorators',
      (_, className, expected) => {
        project = create({ 'app.bundle.json': module(['./src'], { className }), 'src/Classes.ts': classes });

        buildProject();

        expect([...generated().matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name)).toEqual(expected);
      },
    );

    it('applies exclusions after the positive criteria', () => {
      expect(selected({ decorators: ['register'], exclude: 'MainService' })).toEqual(['AuthService']);
    });

    it.each([
      [42, 'className: expected a glob, a non-empty array of globs or an object'],
      ['', 'className: expected a non-empty string'],
      [[], 'className: expected a non-empty array'],
      [['*Service', ''], 'className[1]: expected a non-empty string'],
      [{ export: 'all' }, 'className.export: expected "any", "named" or "default"'],
      [{ decorators: [''] }, 'className.decorators: expected an array of strings'],
      [{ glob: '' }, 'className.glob: expected a glob or a non-empty array of globs'],
      [{ glob: [] }, 'className.glob: expected a glob or a non-empty array of globs'],
      [{ exclude: [''] }, 'className.exclude: expected a glob or a non-empty array of globs'],
      [{ exclude: 1 }, 'className.exclude: expected a glob or a non-empty array of globs'],
      [{ excludeClasses: ['Helper'] }, 'className.excludeClasses: unknown field'],
      [{ exported: true }, 'className.exported: unknown field'],
      [{ nameGlob: '*Service' }, 'className.nameGlob: unknown field'],
      [{ excludeNameGlob: '*Mock' }, 'className.excludeNameGlob: unknown field'],
      [{ name: '*Service' }, 'className.name: unknown field'],
      [{ excludeName: '*Mock' }, 'className.excludeName: unknown field'],
    ])('rejects the rule %j naming the field', (select, message) => {
      project = create({ 'app.bundle.json': module(['./src'], { className: select }) });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(message);
    });
  });

  describe('Story: Warn about two classes binding the same token', () => {
    const repo = (name: string, token = 'IDashboardRepositoryToken') =>
      `import { repository } from 'ts-ioc-container';\n@repository(${token})\nexport class ${name} {}\n`;

    it('warns when two selected classes pass the same decorator identifier', () => {
      project = create({
        'app.bundle.json': module(['./src'], { className: { decorators: ['repository'] } }),
        'src/HttpDashboardRepository.ts': repo('HttpDashboardRepository'),
        'src/MockDashboardRepository.ts': repo('MockDashboardRepository'),
      });

      const { warnings } = buildProject();

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('decorator token');
      expect(warnings[0]).toContain('IDashboardRepositoryToken');
      expect(warnings[0]).toContain('HttpDashboardRepository, MockDashboardRepository');
      expect(warnings[0]).toContain('className.exclude');
    });

    it('does not warn once one colliding class is excluded', () => {
      project = create({
        'app.bundle.json': module(['./src'], {
          className: { decorators: ['repository'], exclude: 'MockDashboardRepository' },
        }),
        'src/HttpDashboardRepository.ts': repo('HttpDashboardRepository'),
        'src/MockDashboardRepository.ts': repo('MockDashboardRepository'),
      });

      expect(buildProject().warnings).toEqual([]);
      expect(generated()).not.toContain('MockDashboardRepository');
    });

    it('ignores decorators whose first argument is not a plain identifier', () => {
      project = create({
        'app.bundle.json': module(['./src'], { className: { decorators: ['repository'] } }),
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
      project = create({
        'app.bundle.json': module(['./src'], { className: { decorators: ['repository'] } }),
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
      project = create({
        'app.bundle.json': module(['./src'], { className: { decorators: ['repository'] } }),
        'src/A.ts': scoped('A'),
        'src/B.ts': scoped('B'),
      });

      expect(buildProject().warnings).toHaveLength(1);
    });
  });

  describe('Story: Name every input explicitly', () => {
    const registered = () => [...generated().matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name);

    it('never takes files from the tsconfig: only the glob folders are scanned', () => {
      project = create({
        'app.bundle.json': module(['./lib']),
        'tsconfig.json': { ...ROOT_ALIAS, include: ['src'] },
        'src/App.ts': decorated('App'),
        'lib/External.ts': decorated('External'),
      });

      buildProject();

      expect(registered()).toEqual(['External']);
    });

    it('writes the folders it scanned into the header of the bundle', () => {
      project = create({
        'app.bundle.json': module(['./src/services', '@app/infra']),
        'tsconfig.json': { compilerOptions: { paths: { '@app/*': ['./src/*'] } } },
        'src/services/Logger.ts': decorated('Logger'),
        'src/infra/Db.ts': decorated('Db'),
      });

      buildProject();

      expect(generated()).toContain('// Paths: ./src/services, @app/infra');
    });

    it('names the bundle after the config file: prod.bundle.json builds ProdBundle', () => {
      project = create({ 'prod.bundle.json': module(['./src']), 'src/Logger.ts': decorated('Logger') });

      expect(buildFrom('prod.bundle.json').bundle).toBe('ProdBundle');
    });

    it('requires a name when the config file is not named <name>.bundle.json', () => {
      project = create({
        'di.json': module(['./src']),
        'named.yml': 'name: admin\nglob:\n  glob: [./src]\n',
        'src/Logger.ts': decorated('Logger'),
      });

      expect(() => buildFrom('di.json')).toThrow(TicConfigError);
      expect(() => buildFrom('di.json')).toThrow(/^name: required/);
      expect(buildFrom('named.yml').bundle).toBe('AdminBundle');
    });
  });

  describe('Story: Address folders by tsconfig aliases', () => {
    const tsconfig = (compilerOptions: object) => ({ compilerOptions });

    it('resolves an alias namespace through inherited tsconfig paths and imports in alias form', () => {
      project = create({
        'app.bundle.json': module(['@app/services']),
        'tsconfig.base.json': tsconfig({ paths: { '@app/*': ['./src/*'], '@services/*': ['./src/services/*'] } }),
        'tsconfig.json': { extends: './tsconfig.base.json' },
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '@services/Logger';");
    });

    it('fails naming every class file no alias covers: the bundle has no location for a relative import', () => {
      project = create({
        'app.bundle.json': module(['./src', './lib']),
        'tsconfig.json': tsconfig({ paths: { '@app/*': ['./src/*'] } }),
        'src/Logger.ts': decorated('Logger'),
        'lib/External.ts': decorated('External'),
        'lib/Other.ts': decorated('Other'),
      });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(
        'no tsconfig paths alias covers lib/External.ts, lib/Other.ts; the bundle goes to stdout, so every import is written through an alias — add a "paths" entry to tsconfig.json',
      );
    });

    it('reads the aliases of the tsconfig named in the config', () => {
      project = create({
        'app.bundle.json': module(['@app/services'], { tsconfig: './tsconfig.app.json' }),
        'tsconfig.app.json': tsconfig({ baseUrl: '.', paths: { '@app/*': ['src/*'] } }),
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '@app/services/Logger';");
    });

    it('fails when the tsconfig it explicitly names does not exist', () => {
      project = create({
        'app.bundle.json': module(['./src'], { tsconfig: './tsconfig.app.json' }),
        'src/Logger.ts': decorated('Logger'),
      });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(/tsconfig not found: .*tsconfig\.app\.json/);
    });

    it('needs a tsconfig for its aliases: without one, no class can be imported', () => {
      project = TempProject.create({ 'app.bundle.json': module(['./src']), 'src/Logger.ts': decorated('Logger') });

      expect(() => buildProject()).toThrow('no tsconfig paths alias covers src/Logger.ts');
    });

    it('builds an empty bundle without a tsconfig when nothing is selected', () => {
      project = TempProject.create({ 'app.bundle.json': module(['./src']), 'src/helpers.ts': 'export const x = 1;\n' });

      expect(buildProject().registrations).toBe(0);
    });

    it('fails naming a namespace that is neither a folder nor an alias', () => {
      project = create({
        'app.bundle.json': module(['@app/missing']),
        'tsconfig.json': tsconfig({ paths: { '@app/*': ['./src/*'] } }),
      });

      expect(() => buildProject()).toThrow(NamespaceNotFoundError);
      expect(() => buildProject()).toThrow('@app/missing');
    });

    it('adds a .js extension under nodenext resolution', () => {
      project = create({
        'app.bundle.json': module(['@app/services']),
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
      project = create({
        'app.bundle.json': { importExtension: '', ...module(['./src/services']) },
        'tsconfig.json': tsconfig({ module: 'nodenext', moduleResolution: 'nodenext', paths: { '@/*': ['./*'] } }),
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '@/src/services/Logger';");
    });
  });

  describe('Story: Generate a plain container module', () => {
    it('imports same-named classes under distinct local names', () => {
      project = create({
        'app.bundle.json': module(['./src']),
        'src/a/Logger.ts': decorated('Logger'),
        'src/b/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '@/src/a/Logger';");
      expect(generated()).toContain("import { Logger as Logger_2 } from '@/src/b/Logger';");
      expect(generated()).toContain('Registration.fromClass(Logger_2)');
    });
  });

  describe('Story: Generate a plain container module (protocol)', () => {
    it('writes paths into the generated TypeScript verbatim, never HTML-escaped', () => {
      project = create({
        'app.bundle.json': module(['./src/a&b']),
        'src/a&b/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '@/src/a&b/Logger';");
      expect(generated()).not.toMatch(/&amp;|&#x27;|&quot;/);
    });
  });

  describe('Story: Keep bundles in sync in CI', () => {
    it('builds the same bundle every time, so a saved one can be diffed against a fresh build', () => {
      project = create({
        'app.bundle.json': module(['./src/services']),
        'src/services/Logger.ts': decorated('Logger'),
      });

      expect(buildProject().content).toBe(buildProject().content);
    });

    it('never registers a saved bundle that sits in a scanned folder', () => {
      project = create({ 'app.bundle.json': module(['./src']), 'src/Logger.ts': decorated('Logger') });
      project.write('src/app.bundle.ts', buildProject().content);

      expect(buildProject().content).not.toMatch(/fromClass\(AppBundle\)/);
    });
  });
});
