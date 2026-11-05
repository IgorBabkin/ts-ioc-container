import { build, type Bundle, TicConfigError, NamespaceNotFoundError } from '../../lib';
import { existsSync, symlinkSync } from 'node:fs';
import { decorated, TempProject } from '../project';

// The bundle goes to stdout, so every import is written through a tsconfig alias: each
// project gets one covering its root unless a test brings its own tsconfig.json.
const ROOT_ALIAS = { compilerOptions: { paths: { '@/*': ['./*'] } } };
const create = (files: Record<string, string | object>) =>
  TempProject.create({ 'tsconfig.json': ROOT_ALIAS, ...files });

// A config implies nothing, so each one spells out every field; a test overrides the fields it is about.
const module = (
  folders: unknown[],
  { paths, match, ...extra }: { paths?: object; match?: object; [field: string]: unknown } = {},
) => ({
  name: 'app',
  importExtension: '',
  paths: { include: folders, exclude: [], ...paths },
  match: { export: 'any', decorators: ['register'], ...match },
  ...extra,
});

describe('Folder registration', () => {
  let project: TempProject;

  afterEach(() => project?.dispose());

  let last: Bundle;
  const buildFrom = (config: string) => (last = build({ config, tsconfig: 'tsconfig.json', cwd: project.root }));
  const buildProject = () => buildFrom('app.bundle.json');
  const generated = () => last.content;

  describe('Story: Describe the container in a config file', () => {
    it('resolves relative paths against the config file, not the working directory', () => {
      project = create({
        'config/app.bundle.json': module(['../src/services']),
        'src/services/Logger.ts': decorated('Logger'),
      });

      last = build({
        config: project.path('config/app.bundle.json'),
        tsconfig: project.path('tsconfig.json'),
        cwd: '/',
      });

      expect(generated()).toContain("import { Logger } from '@/src/services/Logger';");
    });

    it('returns the bundle and writes nothing', () => {
      project = create({ 'app.bundle.json': module(['./src']), 'src/Logger.ts': decorated('Logger') });

      const result = buildProject();

      expect(result).toMatchObject({ bundle: 'AppBundle', registrations: 1 });
      expect(result.content).toContain('export class AppBundle implements IContainerModule');
      expect(existsSync(project.path('src/app.bundle.ts'))).toBe(false);
    });

    it.each([
      ['app.bundle.toml', 'expected a .json, .yaml or .yml config file'],
      ['missing.bundle.json', 'config file not found'],
    ])('rejects the config file %s', (file, message) => {
      project = create({ 'app.bundle.toml': 'paths = {}' });

      expect(() => buildFrom(file)).toThrow(TicConfigError);
      expect(() => buildFrom(file)).toThrow(message);
    });

    it.each([
      [{}, 'export class AppBundle implements IContainerModule'],
      [{ name: 'services' }, 'export class ServicesBundle implements IContainerModule'],
      [{ name: 'my-app_v2' }, 'export class MyAppV2Bundle implements IContainerModule'],
    ])('names the bundle class after the bundle name (%j)', (extra, expected) => {
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
      [{}, 'paths: expected an object with "include"'],
      [module(['./src'], { output: 'src/di/container.bundle.ts' }), 'output: unknown field'],
      [{ paths: {} }, 'paths.include: expected a folder or a non-empty array of folders'],
      [{ paths: { exclude: ['**/*.ts'] } }, 'paths.include: expected a folder or a non-empty array of folders'],
      [{ paths: './src' }, 'paths: expected an object with "include"'],
      [{ paths: ['./src'] }, 'paths: expected an object with "include"'],
      [{ paths: 42 }, 'paths: expected an object with "include"'],
      [{ paths: { include: [] } }, 'paths.include: expected a non-empty array'],
      [{ paths: { include: [{ path: './src' }] } }, 'paths.include[0]: expected a non-empty string'],
      [{ paths: { include: 42 } }, 'paths.include: expected a folder or a non-empty array of folders'],
      [module(['./src'], { name: 'not valid' }), 'name: expected letters, digits, "-" or "_", starting with a letter'],
      [module(['./src'], { name: '2fa' }), 'name: expected letters, digits, "-" or "_", starting with a letter'],
      [module(['./src'], { tags: ['production'] }), 'tags: unknown field'],
      [module(['./src'], { tsconfig: './tsconfig.json' }), 'tsconfig: unknown field'],
      [module(['./src'], { extends: './tsconfig.json' }), 'tsconfig.json: compilerOptions: unknown field'],
      [{ glob: ['./src'] }, 'glob: unknown field'],
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

  describe('Story: Name the scanned folders in paths.include', () => {
    it.each([
      ['a folder', './src/services'],
      ['a list of folders', ['./src/services', './src/infra']],
    ])('takes paths.include as %s', (_, include) => {
      project = create({
        'app.bundle.json': module([], { paths: { include } }),
        'src/services/Logger.ts': decorated('Logger'),
        'src/infra/Db.ts': decorated('Db'),
      });

      const { warnings } = buildProject();

      expect(generated()).toContain('Registration.fromClass(Logger)');
      expect(warnings).toEqual([]);
    });
  });

  describe('Story: Write the config in YAML', () => {
    const yaml = [
      'name: services',
      "importExtension: ''",
      'paths:',
      '  include:',
      '    - ./src/services',
      '  exclude: []',
      'match:',
      '  export: any',
      '  decorators: [register]',
      '',
    ].join('\n');

    it.each(['app.bundle.yaml', 'app.bundle.yml'])('reads %s like its JSON twin', (file) => {
      project = create({ [file]: yaml, 'src/services/Logger.ts': decorated('Logger') });

      expect(buildFrom(file).bundle).toBe('ServicesBundle');
      expect(generated()).toContain('Registration.fromClass(Logger)');
      expect(generated()).toContain('// Generated by `tic build`. Do not edit by hand.');
    });

    it('rejects an empty YAML file: paths must be written out', () => {
      project = create({ 'production.bundle.yaml': '', 'tsconfig.json': { include: ['src'] } });

      expect(() => buildFrom('production.bundle.yaml')).toThrow('paths: expected an object with "include"');
    });

    it.each([
      ['paths: [unclosed', /not valid YAML/],
      ['- paths: {}', 'config: expected an object'],
      ['paths:\n  include: [./src]\nselect: {}', 'select: unknown field'],
      ['output: src/di/app.bundle.ts', 'output: unknown field'],
      ["paths:\n  include: [./src]\nclassName: '*Service'", 'className: unknown field'],
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
          '  applyTo(container: IContainer): void {',
          '    container.addRegistration(Registration.fromClass(AuthService));',
          '    container.addRegistration(Registration.fromClass(TokenService));',
          '    container.addRegistration(Registration.fromClass(UserService));',
          '  }',
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
        'app.bundle.json': module(['./src'], { match: { decorators: [] } }),
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

    it('never registers excluded files, declaration files or a bundle tic build generated', () => {
      project = create({
        'app.bundle.json': module(['./src'], { paths: { exclude: ['**/*.spec.ts', '**/__tests__/**'] } }),
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

    it('excludes nothing it is not told to: with an empty exclude, test files are parsed too', () => {
      project = create({
        'app.bundle.json': module(['./src']),
        'src/Kept.ts': decorated('Kept'),
        'src/Kept.spec.ts': decorated('KeptSpec'),
        'src/__tests__/Double.ts': decorated('Double'),
      });

      const { warnings } = buildProject();

      expect(generated()).toContain('Registration.fromClass(KeptSpec)');
      expect(generated()).toContain('Registration.fromClass(Double)');
      expect(warnings).toEqual([]);
    });

    it('excludes exactly the configured globs, and warns about none it leaves out', () => {
      project = create({
        'app.bundle.json': module(['./src'], { paths: { exclude: ['src/legacy/**'] } }),
        'src/legacy/Old.ts': decorated('Old'),
        'src/Kept.spec.ts': decorated('KeptSpec'),
      });

      const { warnings } = buildProject();

      expect(generated()).toContain('Registration.fromClass(KeptSpec)');
      expect(generated()).not.toContain('Old');
      expect(warnings).toEqual([]);
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
      const withBrokenFile = (paths: object) => {
        project = create({ 'app.bundle.json': module(['./src'], { paths }), ...sources });
        symlinkSync(project.path('missing.ts'), project.path('src/broken.ts'));
      };

      withBrokenFile({});
      expect(() => buildProject()).toThrow(/ENOENT/);

      withBrokenFile({ exclude: ['src/broken.ts'] });
      expect(() => buildProject()).not.toThrow();
    });

    it('takes a single exclude glob as a string', () => {
      project = create({ 'app.bundle.json': module(['./src'], { paths: { exclude: 'src/legacy/**' } }), ...sources });

      buildProject();

      expect(registered()).toEqual(['Helper', 'UserRepository', 'UserService']);
    });

    it('applies the class selector to the files that were parsed', () => {
      project = create({
        'app.bundle.json': module(['./src'], {
          paths: { exclude: ['src/helpers.ts'] },
          match: { exclude: 'Old*' },
        }),
        ...sources,
      });

      buildProject();

      expect(registered()).toEqual(['UserRepository', 'UserService']);
    });

    describe('through a tsconfig paths alias, as paths.include takes one', () => {
      const aliased = (exclude: string[], paths: Record<string, string[]> = {}) => {
        project = create({
          'tsconfig.json': {
            compilerOptions: { paths: { '@/*': ['./*'], '@legacy/*': ['./src/legacy/*'], ...paths } },
          },
          'app.bundle.json': module(['./src'], { paths: { exclude } }),
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
      [{ glob: ['**/*.service.ts'] }, 'paths.glob: unknown field'],
      [{ exclude: '' }, 'paths.exclude: expected a glob or an array of globs'],
      [{ exclude: [42] }, 'paths.exclude: expected a glob or an array of globs'],
      [{ only: ['**/*.ts'] }, 'paths.only: unknown field'],
    ])('rejects the file rule %j naming the field', (paths, message) => {
      project = create({ 'app.bundle.json': module(['./src'], { paths }) });

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
        'app.bundle.json': module(['./src'], { match: { decorators: [], ...select } }),
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
        'app.bundle.json': module(['./src'], { match: { decorators: ['register', 'service'] } }),
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
        'app.bundle.json': module(['./src'], { match: { decorators: [], glob: '*Service' } }),
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

    it.each([[42], ['*Service'], [['*Service']]])('rejects match %j: it is always an object', (match) => {
      project = create({ 'app.bundle.json': { ...module(['./src']), match } });

      expect(() => buildProject()).toThrow('match: expected an object');
    });

    it('applies exclusions after the positive criteria', () => {
      expect(selected({ decorators: ['register'], exclude: 'MainService' })).toEqual(['AuthService']);
    });

    it.each([
      [{ export: 'all' }, 'match.export: expected "any", "named" or "default"'],
      [{ decorators: [''] }, 'match.decorators: expected an array of strings'],
      [{ glob: '' }, 'match.glob: expected a glob or a non-empty array of globs'],
      [{ glob: [] }, 'match.glob: expected a glob or a non-empty array of globs'],
      [{ exclude: [''] }, 'match.exclude: expected a glob or a non-empty array of globs'],
      [{ exclude: 1 }, 'match.exclude: expected a glob or a non-empty array of globs'],
      [{ excludeClasses: ['Helper'] }, 'match.excludeClasses: unknown field'],
      [{ exported: true }, 'match.exported: unknown field'],
      [{ nameGlob: '*Service' }, 'match.nameGlob: unknown field'],
      [{ excludeNameGlob: '*Mock' }, 'match.excludeNameGlob: unknown field'],
      [{ name: '*Service' }, 'match.name: unknown field'],
      [{ excludeName: '*Mock' }, 'match.excludeName: unknown field'],
    ])('rejects the rule %j naming the field', (select, message) => {
      project = create({ 'app.bundle.json': module(['./src'], { match: select }) });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(message);
    });
  });

  describe('Story: Warn about two classes binding the same token', () => {
    const repo = (name: string, token = 'IDashboardRepositoryToken') =>
      `import { repository } from 'ts-ioc-container';\n@repository(${token})\nexport class ${name} {}\n`;

    it('warns when two selected classes pass the same decorator identifier', () => {
      project = create({
        'app.bundle.json': module(['./src'], { match: { decorators: ['repository'] } }),
        'src/HttpDashboardRepository.ts': repo('HttpDashboardRepository'),
        'src/MockDashboardRepository.ts': repo('MockDashboardRepository'),
      });

      const { warnings } = buildProject();

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('decorator token');
      expect(warnings[0]).toContain('IDashboardRepositoryToken');
      expect(warnings[0]).toContain('HttpDashboardRepository, MockDashboardRepository');
      expect(warnings[0]).toContain('match.exclude');
    });

    it('does not warn once one colliding class is excluded', () => {
      project = create({
        'app.bundle.json': module(['./src'], {
          match: { decorators: ['repository'], exclude: 'MockDashboardRepository' },
        }),
        'src/HttpDashboardRepository.ts': repo('HttpDashboardRepository'),
        'src/MockDashboardRepository.ts': repo('MockDashboardRepository'),
      });

      expect(buildProject().warnings).toEqual([]);
      expect(generated()).not.toContain('MockDashboardRepository');
    });

    it('ignores decorators whose first argument is not a plain identifier', () => {
      project = create({
        'app.bundle.json': module(['./src'], { match: { decorators: ['repository'] } }),
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
        'app.bundle.json': module(['./src'], { match: { decorators: ['repository'] } }),
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
        'app.bundle.json': module(['./src'], { match: { decorators: ['repository'] } }),
        'src/A.ts': scoped('A'),
        'src/B.ts': scoped('B'),
      });

      expect(buildProject().warnings).toHaveLength(1);
    });
  });

  describe('Story: Name every input explicitly', () => {
    const registered = () => [...generated().matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name);

    it('never takes files from the tsconfig: only the paths folders are scanned', () => {
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

    it('never takes the name from the config file', () => {
      project = create({
        'prod.bundle.json': module(['./src'], { name: 'admin' }),
        'src/Logger.ts': decorated('Logger'),
      });

      expect(buildFrom('prod.bundle.json').bundle).toBe('AdminBundle');
    });

    it('reads a config file of any name', () => {
      project = create({ 'di.json': module(['./src']), 'src/Logger.ts': decorated('Logger') });

      expect(buildFrom('di.json').bundle).toBe('AppBundle');
    });

    it.each([
      ['name', { name: undefined }, 'name: expected letters, digits, "-" or "_", starting with a letter'],
      ['importExtension', { importExtension: undefined }, 'importExtension: expected a string'],
      ['paths.exclude', { paths: { exclude: undefined } }, 'paths.exclude: expected a glob or an array of globs'],
      ['match.export', { match: { export: undefined } }, 'match.export: expected "any", "named" or "default"'],
      ['match.decorators', { match: { decorators: undefined } }, 'match.decorators: expected an array of strings'],
    ])('requires %s: no field has a default', (_, overrides, message) => {
      project = create({ 'app.bundle.json': module(['./src'], overrides), 'src/Logger.ts': decorated('Logger') });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(message);
    });

    it('requires the match object itself', () => {
      project = create({ 'app.bundle.json': { ...module(['./src']), match: undefined } });

      expect(() => buildProject()).toThrow('match: expected an object');
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

    it('reads the aliases of the tsconfig it is given', () => {
      project = create({
        'app.bundle.json': module(['@app/services']),
        'tsconfig.app.json': tsconfig({ baseUrl: '.', paths: { '@app/*': ['src/*'] } }),
        'src/services/Logger.ts': decorated('Logger'),
      });

      last = build({ config: 'app.bundle.json', tsconfig: 'tsconfig.app.json', cwd: project.root });

      expect(generated()).toContain("import { Logger } from '@app/services/Logger';");
    });

    it('resolves the tsconfig against the working directory, not the config file', () => {
      project = create({
        'config/app.bundle.json': module(['../src']),
        'src/Logger.ts': decorated('Logger'),
      });

      last = build({ config: 'config/app.bundle.json', tsconfig: 'tsconfig.json', cwd: project.root });

      expect(generated()).toContain("import { Logger } from '@/src/Logger';");
    });

    it('fails when the tsconfig it is given does not exist', () => {
      project = create({
        'app.bundle.json': module(['./src']),
        'src/Logger.ts': decorated('Logger'),
      });
      const buildWithMissing = () =>
        build({ config: 'app.bundle.json', tsconfig: 'tsconfig.app.json', cwd: project.root });

      expect(buildWithMissing).toThrow(TicConfigError);
      expect(buildWithMissing).toThrow(/tsconfig not found: .*tsconfig\.app\.json/);
    });

    it('never falls back to a tsconfig it was not given: a missing one fails even when nothing is selected', () => {
      project = TempProject.create({ 'app.bundle.json': module(['./src']), 'src/helpers.ts': 'export const x = 1;\n' });

      expect(() => buildProject()).toThrow(/tsconfig not found: .*tsconfig\.json/);
    });

    it('fails naming a namespace that is neither a folder nor an alias', () => {
      project = create({
        'app.bundle.json': module(['@app/missing']),
        'tsconfig.json': tsconfig({ paths: { '@app/*': ['./src/*'] } }),
      });

      expect(() => buildProject()).toThrow(NamespaceNotFoundError);
      expect(() => buildProject()).toThrow('@app/missing');
    });

    it('writes importExtension into every generated import', () => {
      project = create({
        'app.bundle.json': module(['@app/services'], { importExtension: '.js' }),
        'tsconfig.json': tsconfig({ paths: { '@app/*': ['./src/*'] } }),
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '@app/services/Logger.js';");
    });

    it('never infers the extension from the tsconfig: an empty importExtension stays empty under nodenext', () => {
      project = create({
        'app.bundle.json': module(['./src/services']),
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

  describe('Story: Merge configs, like webpack-merge', () => {
    const BASE = {
      name: 'app',
      importExtension: '',
      paths: { exclude: [] },
      match: { export: 'any', decorators: ['register'] },
    };
    const createMerged = (files: Record<string, string | object>) => create({ 'base.bundle.yml': BASE, ...files });
    const buildMerged = (...configs: string[]) =>
      (last = build({ config: ['base.bundle.yml', ...configs], tsconfig: 'tsconfig.json', cwd: project.root }));

    it('concatenates paths.include in order, without duplicates, a later name replacing an earlier one', () => {
      project = createMerged({
        'common.bundle.yml': "paths:\n  include: ['./src/services']\n",
        'prod.bundle.yml': "name: prod\npaths:\n  include: ['./src/services', './src/infra']\n",
        'src/services/Greeter.ts': decorated('Greeter'),
        'src/infra/Logger.ts': decorated('Logger'),
      });

      const result = buildMerged('common.bundle.yml', 'prod.bundle.yml');

      expect(result).toMatchObject({ bundle: 'ProdBundle', registrations: 2 });
      expect(generated()).toContain('// Paths: ./src/services, ./src/infra');
    });

    it('returns the bundled files once each, even when two paths reach one', () => {
      project = createMerged({
        'app.bundle.yml': "paths:\n  include: ['./src', './src/infra']\n",
        'src/services/Greeter.ts': decorated('Greeter'),
        'src/infra/Logger.ts': decorated('Logger'),
      });

      expect(buildMerged('app.bundle.yml').files).toEqual([
        project.path('src/infra/Logger.ts'),
        project.path('src/services/Greeter.ts'),
      ]);
    });

    it('returns the bundled classes with their files, in file order', () => {
      project = createMerged({
        'app.bundle.yml': "paths:\n  include: ['./src']\n",
        'src/services/Greeter.ts': decorated('Greeter'),
        'src/infra/Logger.ts': decorated('Logger'),
      });

      expect(buildMerged('app.bundle.yml').classes).toEqual([
        { file: project.path('src/infra/Logger.ts'), className: 'Logger' },
        { file: project.path('src/services/Greeter.ts'), className: 'Greeter' },
      ]);
    });

    it('keeps what an earlier config sets, and lets a later one override a value', () => {
      project = createMerged({
        'common.bundle.yml': "importExtension: '.mjs'\npaths:\n  include: ['./src']\n",
        'prod.bundle.yml': "importExtension: '.js'\n",
        'dev.bundle.yml': 'name: development\n',
        'src/Logger.ts': decorated('Logger'),
      });

      buildMerged('common.bundle.yml', 'prod.bundle.yml', 'dev.bundle.yml');

      expect(generated()).toContain("import { Logger } from '@/src/Logger.js';");
      expect(generated()).toContain('export class DevelopmentBundle implements IContainerModule');
    });

    it('merges match field by field', () => {
      project = createMerged({
        'common.bundle.yml': "paths:\n  include: ['./src']\nmatch:\n  glob: '*Service'\n",
        'prod.bundle.yml': "match:\n  exclude: 'Old*'\n",
        'src/Services.ts': `${decorated('UserService')}\n@register()\nexport class OldService {}\n\n@register()\nexport class Helper {}\n`,
      });

      buildMerged('common.bundle.yml', 'prod.bundle.yml');

      expect(generated()).toContain('Registration.fromClass(UserService)');
      expect(generated()).not.toContain('OldService');
      expect(generated()).not.toContain('Helper');
    });

    it('concatenates paths.exclude: a later config adds to the globs an earlier one lists', () => {
      project = createMerged({
        'common.bundle.yml': { paths: { include: ['./src'], exclude: ['**/*.spec.ts'] } },
        'prod.bundle.yml': { paths: { exclude: ['**/*.dev.ts'] } },
        'src/Logger.ts': decorated('Logger'),
        'src/Logger.dev.ts': decorated('DevLogger'),
        'src/Logger.spec.ts': decorated('LoggerSpec'),
      });

      const result = buildMerged('common.bundle.yml', 'prod.bundle.yml');

      expect(result.registrations).toBe(1);
      expect(result.warnings).toEqual([]);
    });

    it('lets a shared config leave paths out, but the merged config must have paths.include', () => {
      project = createMerged({
        'common.bundle.yml': "match:\n  glob: '*Service'\n",
        'prod.bundle.yml': "importExtension: '.js'\n",
      });

      expect(() => buildMerged('common.bundle.yml', 'prod.bundle.yml')).toThrow(
        'paths.include: expected a folder or a non-empty array of folders',
      );
    });

    it('names the config file an invalid field is in', () => {
      project = createMerged({
        'common.bundle.yml': "paths:\n  include: ['./src']\nmatch:\n  export: all\n",
        'prod.bundle.yml': 'paths: {}\n',
      });

      expect(() => buildMerged('common.bundle.yml', 'prod.bundle.yml')).toThrow(
        'common.bundle.yml: match.export: expected "any", "named" or "default"',
      );
    });

    it('rejects configs in different folders, since their relative paths resolve against one', () => {
      project = createMerged({
        'common.bundle.yml': "paths:\n  include: ['./src']\n",
        'config/prod.bundle.yml': 'paths: {}\n',
      });

      expect(() => buildMerged('common.bundle.yml', 'config/prod.bundle.yml')).toThrow(TicConfigError);
      expect(() => buildMerged('common.bundle.yml', 'config/prod.bundle.yml')).toThrow(
        'configs merged into one bundle must sit in one folder',
      );
    });
  });

  describe('Story: Extend another config', () => {
    const registered = () => [...generated().matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name);
    const sources = { 'src/services/Logger.ts': decorated('Logger'), 'src/infra/Db.ts': decorated('Db') };

    it('merges the config on top of the one it extends, as tic build base app would', () => {
      project = create({
        'base.bundle.yml': module(['./src/services'], { name: 'base', importExtension: '.mjs' }),
        'app.bundle.yml': "extends: ./base.bundle.yml\nname: app\npaths:\n  include: ['./src/infra']\n",
        ...sources,
      });

      const result = buildFrom('app.bundle.yml');

      expect(result.bundle).toBe('AppBundle');
      expect(registered()).toEqual(['Db', 'Logger']);
      expect(generated()).toContain("import { Db } from '@/src/infra/Db.mjs';");
    });

    it('lets a config that only extends change nothing', () => {
      project = create({
        'base.bundle.json': module(['./src/services']),
        'app.bundle.json': { extends: 'base.bundle.json' },
        ...sources,
      });

      expect(buildProject().bundle).toBe('AppBundle');
      expect(registered()).toEqual(['Logger']);
    });

    it('follows a chain of extends, the furthest config merged first', () => {
      project = create({
        'root.bundle.yml': module(['./src/services'], { importExtension: '.root' }),
        'mid.bundle.yml': "extends: ./root.bundle.yml\nimportExtension: '.mid'\nname: mid\n",
        'app.bundle.yml': 'extends: ./mid.bundle.yml\nname: leaf\n',
        ...sources,
      });

      expect(buildFrom('app.bundle.yml').bundle).toBe('LeafBundle');
      expect(generated()).toContain("import { Logger } from '@/src/services/Logger.mid';");
    });

    it('extends across formats: YAML from JSON', () => {
      project = create({
        'base.bundle.json': module(['./src/services']),
        'app.bundle.yml': 'extends: ./base.bundle.json\n',
        ...sources,
      });

      expect(buildFrom('app.bundle.yml').registrations).toBe(1);
    });

    it('resolves extends against the config file, not the working directory', () => {
      project = create({
        'config/base.bundle.yml': module(['../src/services']),
        'config/app.bundle.yml': 'extends: ./base.bundle.yml\n',
        ...sources,
      });

      expect(buildFrom('config/app.bundle.yml').registrations).toBe(1);
    });

    it('applies a config extended twice once: several configs share a base', () => {
      project = create({
        'base.bundle.yml': module(['./src/services']),
        'a.bundle.yml': "extends: ./base.bundle.yml\nimportExtension: '.a'\n",
        'b.bundle.yml': 'extends: ./base.bundle.yml\nname: b\n',
        ...sources,
      });

      last = build({ config: ['a.bundle.yml', 'b.bundle.yml'], tsconfig: 'tsconfig.json', cwd: project.root });

      expect(last.bundle).toBe('BBundle');
      expect(generated()).toContain("import { Logger } from '@/src/services/Logger.a';");
    });

    it('checks the merged config: a required field may come from either file, but must come', () => {
      project = create({
        'base.bundle.yml': "importExtension: ''\n",
        'app.bundle.yml': 'extends: ./base.bundle.yml\nname: app\n',
      });

      expect(() => buildFrom('app.bundle.yml')).toThrow('paths: expected an object with "include"');
    });

    it('names the extended file an invalid field is in', () => {
      project = create({
        'base.bundle.yml': 'match:\n  export: all\n',
        'app.bundle.yml': 'extends: ./base.bundle.yml\n',
      });

      expect(() => buildFrom('app.bundle.yml')).toThrow(
        'base.bundle.yml: match.export: expected "any", "named" or "default"',
      );
    });

    it.each([
      ['extends: ./missing.bundle.yml\n', /config file not found: .*missing\.bundle\.yml/],
      ['extends: ./base.toml\n', 'expected a .json, .yaml or .yml config file'],
      ['extends: 42\n', 'extends: expected a non-empty string'],
      ["extends: ''\n", 'extends: expected a non-empty string'],
      ['extends: [./a.bundle.yml]\n', 'extends: expected a non-empty string'],
      ['extends: ./app.bundle.yml\n', 'circular extends: app.bundle.yml -> app.bundle.yml'],
    ])('rejects %j', (source, message) => {
      project = create({ 'app.bundle.yml': source });

      expect(() => buildFrom('app.bundle.yml')).toThrow(TicConfigError);
      expect(() => buildFrom('app.bundle.yml')).toThrow(message);
    });

    it('rejects a cycle, naming it', () => {
      project = create({
        'a.bundle.yml': 'extends: ./b.bundle.yml\n',
        'b.bundle.yml': 'extends: ./a.bundle.yml\n',
      });

      expect(() => buildFrom('a.bundle.yml')).toThrow('circular extends: a.bundle.yml -> b.bundle.yml -> a.bundle.yml');
    });

    it('rejects a config in another folder: relative paths resolve against one', () => {
      project = create({
        'shared/base.bundle.yml': module(['./src']),
        'app.bundle.yml': 'extends: ./shared/base.bundle.yml\n',
      });

      expect(() => buildFrom('app.bundle.yml')).toThrow('configs merged into one bundle must sit in one folder');
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
