import { build, TicConfigError } from '../../lib';
import { chmodSync } from 'node:fs';
import { decorated, TempProject } from '../project';

// A bundle config is a tsconfig: `include` picks the files, `compilerOptions` carries the bundler's options.
const module = (include: unknown[], { classes, importExtension, ...extra }: Record<string, unknown> = {}) => ({
  output: 'src/di/container.bundle.ts',
  include,
  compilerOptions: { classes, importExtension },
  ...extra,
});

describe('Folder registration', () => {
  let project: TempProject;

  afterEach(() => project?.dispose());

  const generated = () => project.read('src/di/container.bundle.ts');
  const buildProject = (options: { check?: boolean } = {}) =>
    build({ config: project.path('app.bundle.json'), ...options });

  describe('Story: Describe the container in a config file', () => {
    it('resolves relative paths against the config file, not the working directory', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src/services']),
        'src/services/Logger.ts': decorated('Logger'),
      });

      build({ config: project.path('app.bundle.json'), cwd: '/' });

      expect(generated()).toContain("import { Logger } from '../services/Logger';");
    });

    it.each([
      [{}, 'export class AppBundle implements IContainerModule'],
      [{ name: 'services' }, 'export class ServicesBundle implements IContainerModule'],
      [{ name: 'my-app_v2' }, 'export class MyAppV2Bundle implements IContainerModule'],
    ])('names the bundle class after the bundle name, by default the config file stem (%j)', (extra, expected) => {
      project = TempProject.create({
        'app.bundle.json': module(['./src/services'], extra),
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain(expected);
    });

    it('describes exactly one bundle: a bundles list is an unknown field', () => {
      project = TempProject.create({ 'app.bundle.json': { bundles: [module(['./src'])] } });

      expect(() => buildProject()).toThrow('bundles: unknown field');
    });

    it.each([
      [[], 'config: expected an object'],
      [module(['./src'], { output: '' }), 'output: expected a non-empty string'],
      [module(['./src'], { name: 'not valid' }), 'name: expected letters, digits, "-" or "_", starting with a letter'],
      [module(['./src'], { name: '2fa' }), 'name: expected letters, digits, "-" or "_", starting with a letter'],
      [module(['./src'], { tags: ['production'] }), 'tags: unknown field'],
      [module(['./src'], { extends: '' }), 'extends: expected a non-empty string'],
      [module(['./src'], { include: 'src/**' }), 'include: expected an array of strings'],
      [module(['./src'], { exclude: [1] }), 'exclude: expected an array of strings'],
      [module(['./src'], { compilerOptions: 'strict' }), 'compilerOptions: expected an object'],
      [module(['./src'], { importExtension: 1 }), 'compilerOptions.importExtension: expected a string'],
      [{ output: 'a.ts', files: { paths: ['./src'] } }, 'files: unknown field'],
      [{ output: 'a.ts', classes: {} }, 'classes: unknown field'],
      [{ output: 'a.ts', importExtension: '.js' }, 'importExtension: unknown field'],
      [{ output: 'a.ts', paths: ['./src'] }, 'paths: unknown field'],
      [{ output: 'a.ts', namespaces: ['./src'] }, 'namespaces: unknown field'],
      [module(['./src'], { select: {} }), 'select: unknown field'],
      [module(['./src'], { tsconfig: './tsconfig.json' }), 'tsconfig: unknown field'],
    ])('rejects an invalid config %j naming the field', (config, message) => {
      project = TempProject.create({ 'app.bundle.json': config });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(message);
    });

    it('fails when the config file does not exist', () => {
      project = TempProject.create({});

      expect(() => buildProject()).toThrow(TicConfigError);
    });

    it.each([
      [{ output: 'a.ts' }, "Unknown compiler option 'output'"],
      [{ pathz: {} }, "Unknown compiler option 'pathz'. Did you mean 'paths'?"],
    ])('hands the other compilerOptions %j to TypeScript, which validates them', (compilerOptions, message) => {
      project = TempProject.create({ 'app.bundle.json': module(['./src'], { compilerOptions }) });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(message);
    });
  });

  describe('Story: Write the config in YAML', () => {
    const yaml = [
      'output: src/di/container.bundle.ts',
      'name: services',
      'include:',
      '  - ./src/services',
      'compilerOptions:',
      '  classes:',
      '    decorators: [register]',
      '',
    ].join('\n');

    it.each(['app.bundle.yaml', 'app.bundle.yml'])('reads %s like its JSON twin', (file) => {
      project = TempProject.create({ [file]: yaml, 'src/services/Logger.ts': decorated('Logger') });

      const { output } = build({ config: file, cwd: project.root });

      expect(output.bundle).toBe('ServicesBundle');
      expect(generated()).toContain('Registration.fromClass(Logger)');
      expect(generated()).toContain(`// Generated by \`tic build\` from ../../${file}.`);
    });

    it('takes an empty YAML file as every setting at its default', () => {
      project = TempProject.create({
        'production.bundle.yaml': '',
        'tsconfig.json': { include: ['src'] },
        'src/Logger.ts': decorated('Logger'),
      });

      const { output } = build({ config: 'production.bundle.yaml', cwd: project.root });

      expect(output.file).toBe(project.path('src/production.bundle.ts'));
    });

    it.each([
      ['output: [unclosed', /app\.bundle\.yaml is not valid YAML/],
      ['- output: a.ts', 'config: expected an object'],
      ['output: a.ts\nselect: {}', 'select: unknown field'],
    ])('rejects %j naming the problem', (source, message) => {
      project = TempProject.create({ 'app.bundle.yaml': source });

      expect(() => build({ config: 'app.bundle.yaml', cwd: project.root })).toThrow(TicConfigError);
      expect(() => build({ config: 'app.bundle.yaml', cwd: project.root })).toThrow(message);
    });
  });

  describe('Story: Register the classes of the files compiled', () => {
    it('registers every decorated class of a folder recursively, ordered by file path', () => {
      project = TempProject.create({
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

    it('limits the scan to one folder level with a single-star glob, as tsc does', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src/services/*']),
        'src/services/Logger.ts': decorated('Logger'),
        'src/services/nested/Hidden.ts': decorated('Hidden'),
      });

      buildProject();

      expect(generated()).toContain('Registration.fromClass(Logger)');
      expect(generated()).not.toContain('Hidden');
    });

    it('registers exported classes, skipping non-exported and abstract ones', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src'], { classes: { decorators: [] } }),
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
        'app.bundle.json': module(['./src']),
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
        'app.bundle.json': module(['./src']),
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

    it('excludes the configured globs on top of the default excludes', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src'], { exclude: ['src/legacy/**'] }),
        'src/Kept.ts': decorated('Kept'),
        'src/legacy/Old.ts': decorated('Old'),
        'src/Kept.spec.ts': decorated('KeptSpec'),
      });

      buildProject();

      expect(generated()).toContain('Registration.fromClass(Kept)');
      expect(generated()).not.toMatch(/Old|KeptSpec/);
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
        'app.bundle.json': module(['src/**/*.service.ts', 'src/**/*.repository.ts']),
        ...sources,
      });

      buildProject();

      expect(registered()).toEqual(['OldService', 'UserRepository', 'UserService']);
    });

    it('never reads a file outside the include globs', () => {
      // An unreadable `.ts` file is listed by tsc but fails the build the moment it is read.
      const withBrokenFile = (include: string[]) => {
        project = TempProject.create({ 'app.bundle.json': module(include), ...sources, 'src/broken.ts': '' });
        chmodSync(project.path('src/broken.ts'), 0o000);
      };

      withBrokenFile(['src']);
      expect(() => buildProject()).toThrow(/EACCES/);

      withBrokenFile(['src/**/*.service.ts']);
      expect(() => buildProject()).not.toThrow();
    });

    it('drops files matching exclude even when include matches them', () => {
      project = TempProject.create({
        'app.bundle.json': module(['src/**/*.service.ts'], { exclude: ['src/legacy/**'] }),
        ...sources,
      });

      buildProject();

      expect(registered()).toEqual(['UserService']);
    });

    it('keeps the default excludes when only include is given', () => {
      project = TempProject.create({
        'app.bundle.json': module(['src/**/*.service.ts']),
        'src/user.service.ts': decorated('UserService'),
        'src/user.service.spec.ts': decorated('UserServiceSpec'),
      });

      buildProject();

      expect(registered()).toEqual(['UserService']);
    });

    it('applies the class selector to the files that were parsed', () => {
      project = TempProject.create({
        'app.bundle.json': module(['src/**/*.service.ts'], { classes: { excludeName: 'Old*' } }),
        ...sources,
      });

      buildProject();

      expect(registered()).toEqual(['UserService']);
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
      project = TempProject.create({
        'app.bundle.json': module(['./src'], { classes: { decorators: [], ...select } }),
        'src/Classes.ts': classes,
      });
      buildProject();
      return [...generated().matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name);
    };

    it('registers classes decorated with @register by default', () => {
      project = TempProject.create({ 'app.bundle.json': module(['./src']), 'src/Classes.ts': classes });
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
      expect(selected({ name: '*Service' })).toEqual(['UserService', 'AuthService', 'MainService']);
    });

    it('combines criteria: a class must meet every one', () => {
      expect(selected({ export: 'named', decorators: ['register'], name: '*Service' })).toEqual(['AuthService']);
    });

    it('recognises decorators by name through renamed imports and member access', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src'], { classes: { decorators: ['register', 'service'] } }),
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
        'app.bundle.json': module(['./src'], { classes: { decorators: [], name: '*Service' } }),
        'src/user-service.ts': 'export default class {}\n',
      });

      buildProject();

      expect(generated()).toContain("import UserService from '../user-service';");
    });

    it('drops classes by exact name with excludeClasses', () => {
      expect(selected({ excludeClasses: ['Helper', 'AuthService'] })).toEqual(['UserService', 'MainService']);
    });

    it('drops classes whose name matches excludeName', () => {
      expect(selected({ excludeName: '*Service' })).toEqual(['Helper']);
    });

    it('applies exclusions after the positive criteria', () => {
      expect(selected({ decorators: ['register'], excludeClasses: ['MainService'] })).toEqual(['AuthService']);
    });

    it.each([
      ['decorated', 'compilerOptions.classes: expected an object'],
      [{ export: 'all' }, 'compilerOptions.classes.export: expected "any", "named" or "default"'],
      [{ decorators: [''] }, 'compilerOptions.classes.decorators: expected an array of strings'],
      [{ name: '' }, 'compilerOptions.classes.name: expected a non-empty string'],
      [{ excludeClasses: [] }, 'compilerOptions.classes.excludeClasses: expected a non-empty array of strings'],
      [{ excludeName: '' }, 'compilerOptions.classes.excludeName: expected a non-empty string'],
      [{ exported: true }, 'compilerOptions.classes.exported: unknown field'],
      [{ nameGlob: '*Service' }, 'compilerOptions.classes.nameGlob: unknown field'],
      [{ excludeNameGlob: '*Mock' }, 'compilerOptions.classes.excludeNameGlob: unknown field'],
    ])('rejects the rule %j naming the field', (select, message) => {
      project = TempProject.create({ 'app.bundle.json': module(['./src'], { classes: select }) });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(message);
    });
  });

  describe('Story: Warn about two classes binding the same token', () => {
    const repo = (name: string, token = 'IDashboardRepositoryToken') =>
      `import { repository } from 'ts-ioc-container';\n@repository(${token})\nexport class ${name} {}\n`;

    it('warns when two selected classes pass the same decorator identifier', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src'], { classes: { decorators: ['repository'] } }),
        'src/HttpDashboardRepository.ts': repo('HttpDashboardRepository'),
        'src/MockDashboardRepository.ts': repo('MockDashboardRepository'),
      });

      const { warnings } = buildProject();

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('decorator token');
      expect(warnings[0]).toContain('IDashboardRepositoryToken');
      expect(warnings[0]).toContain('HttpDashboardRepository, MockDashboardRepository');
      expect(warnings[0]).toContain('compilerOptions.classes.excludeClasses');
    });

    it('does not warn once one colliding class is excluded', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src'], {
          classes: { decorators: ['repository'], excludeClasses: ['MockDashboardRepository'] },
        }),
        'src/HttpDashboardRepository.ts': repo('HttpDashboardRepository'),
        'src/MockDashboardRepository.ts': repo('MockDashboardRepository'),
      });

      expect(buildProject().warnings).toEqual([]);
      expect(generated()).not.toContain('MockDashboardRepository');
    });

    it('ignores decorators whose first argument is not a plain identifier', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src'], { classes: { decorators: ['repository'] } }),
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
        'app.bundle.json': module(['./src'], { classes: { decorators: ['repository'] } }),
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
        'app.bundle.json': module(['./src'], { classes: { decorators: ['repository'] } }),
        'src/A.ts': scoped('A'),
        'src/B.ts': scoped('B'),
      });

      expect(buildProject().warnings).toHaveLength(1);
    });
  });

  describe('Story: Build from tsconfig.json alone', () => {
    const registeredIn = (file: string) => [...project.read(file).matchAll(/fromClass\((\w+)\)/g)].map(([, n]) => n);

    it('builds a bundle from ./tsconfig.json with default settings when no config is given', () => {
      project = TempProject.create({
        'tsconfig.json': { include: ['src'] },
        'src/services/Logger.ts': decorated('Logger'),
        'src/services/Helper.ts': 'export class Helper {}\n',
        'src/index.ts': 'export {};\n',
      });

      const { output } = build({ cwd: project.root });

      expect(output.file).toBe(project.path('src/base.bundle.ts'));
      expect(output.bundle).toBe('BaseBundle');
      expect(registeredIn('src/base.bundle.ts')).toEqual(['Logger']);
      expect(project.read('src/base.bundle.ts')).toContain('// Generated by `tic build` from ../tsconfig.json.');
      expect(project.read('src/base.bundle.ts')).toContain('export class BaseBundle implements IContainerModule');
      expect(build({ cwd: project.root }).output.status).toBe('unchanged');
    });

    it('uses the tsconfig.json of the package it is invoked in, from any of its folders', () => {
      project = TempProject.create({
        'package.json': { name: 'app' },
        'tsconfig.json': { include: ['src'] },
        'src/index.ts': 'export {};\n',
        'src/services/Logger.ts': decorated('Logger'),
      });

      const { output } = build({ cwd: project.path('src/services') });

      expect(output.file).toBe(project.path('src/base.bundle.ts'));
    });

    it('fails when there is neither a config nor a tsconfig.json', () => {
      project = TempProject.create({ 'src/Logger.ts': decorated('Logger') });

      expect(() => build({ cwd: project.root })).toThrow(TicConfigError);
      expect(() => build({ cwd: project.root })).toThrow(/tsconfig not found/);
    });

    it("puts the bundle in the tsconfig's rootDir", () => {
      project = TempProject.create({
        'tsconfig.json': { compilerOptions: { rootDir: './lib' }, include: ['lib'] },
        'lib/deep/Logger.ts': decorated('Logger'),
      });

      build({ cwd: project.root });

      expect(registeredIn('lib/base.bundle.ts')).toEqual(['Logger']);
    });

    it('names the default output after the config: production.bundle.json writes production.bundle.ts', () => {
      project = TempProject.create({
        'production.bundle.json': {},
        'tsconfig.json': { include: ['src'] },
        'src/a/Logger.ts': decorated('Logger'),
        'src/b/Mailer.ts': decorated('Mailer'),
      });

      build({ config: 'production.bundle.json', cwd: project.root });

      expect(registeredIn('src/production.bundle.ts')).toEqual(['Logger', 'Mailer']);
      expect(project.read('src/production.bundle.ts')).toContain('export class ProductionBundle');
    });

    it('names the default output after the bundle name when one is set', () => {
      project = TempProject.create({
        'app.bundle.json': { name: 'admin' },
        'tsconfig.json': { include: ['src'] },
        'src/Logger.ts': decorated('Logger'),
      });

      const { output } = build({ config: 'app.bundle.json', cwd: project.root });

      expect(output.file).toBe(project.path('src/admin.bundle.ts'));
      expect(output.bundle).toBe('AdminBundle');
    });
  });

  describe('Story: A bundle extends a tsconfig', () => {
    const bundle = (extra: object = {}) => ({ output: 'src/di/container.bundle.ts', ...extra });
    const registered = () => [...generated().matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name);

    it('scans what the tsconfig compiles when the bundle names no paths', () => {
      project = TempProject.create({
        'app.bundle.json': bundle(),
        'tsconfig.json': { include: ['src'], exclude: ['src/legacy'] },
        'src/Kept.ts': decorated('Kept'),
        'src/legacy/Old.ts': decorated('Old'),
        'scripts/Tool.ts': decorated('Tool'),
      });

      buildProject();

      expect(registered()).toEqual(['Kept']);
    });

    it('scans the files a tsconfig lists, following its own extends', () => {
      project = TempProject.create({
        'app.bundle.json': bundle({ extends: './tsconfig.app.json' }),
        'tsconfig.base.json': { files: ['src/Listed.ts'] },
        'tsconfig.app.json': { extends: './tsconfig.base.json' },
        'src/Listed.ts': decorated('Listed'),
        'src/Unlisted.ts': decorated('Unlisted'),
      });

      buildProject();

      expect(registered()).toEqual(['Listed']);
    });

    it('lets include override the file set of the tsconfig, as a child tsconfig does', () => {
      project = TempProject.create({
        'app.bundle.json': bundle({ include: ['lib'] }),
        'tsconfig.json': { include: ['src'] },
        'src/App.ts': decorated('App'),
        'lib/External.ts': decorated('External'),
      });

      buildProject();

      expect(registered()).toEqual(['External']);
    });

    it('lets exclude override the excludes of the tsconfig, keeping the default excludes', () => {
      project = TempProject.create({
        'app.bundle.json': bundle({ exclude: ['src/helpers.ts'] }),
        'tsconfig.json': { include: ['src'], exclude: ['src/user.service.ts'] },
        'src/user.service.ts': decorated('UserService'),
        'src/user.service.spec.ts': decorated('UserServiceSpec'),
        'src/helpers.ts': decorated('Helper'),
      });

      buildProject();

      expect(registered()).toEqual(['UserService']);
    });
  });

  describe('Story: Write imports in tsconfig alias form', () => {
    const tsconfig = (compilerOptions: object) => ({ compilerOptions });

    it('imports in the form of the most specific inherited tsconfig paths alias', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src/services', './lib']),
        'tsconfig.base.json': tsconfig({ paths: { '@app/*': ['./src/*'], '@services/*': ['./src/services/*'] } }),
        'tsconfig.json': { extends: './tsconfig.base.json' },
        'src/services/Logger.ts': decorated('Logger'),
        'lib/External.ts': decorated('External'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '@services/Logger';");
      expect(generated()).toContain("import { External } from '../../lib/External';");
    });

    it('extends the tsconfig named in the config', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src/services'], { extends: './tsconfig.app.json' }),
        'tsconfig.app.json': tsconfig({ baseUrl: '.', paths: { '@app/*': ['src/*'] } }),
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '@app/services/Logger';");
    });

    it('fails when the tsconfig it explicitly extends does not exist', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src'], { extends: './tsconfig.app.json' }),
        'src/Logger.ts': decorated('Logger'),
      });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(/tsconfig not found: .*tsconfig\.app\.json/);
    });

    it('builds without a tsconfig when it extends the default one and there is none', () => {
      project = TempProject.create({ 'app.bundle.json': module(['./src']), 'src/Logger.ts': decorated('Logger') });

      buildProject();

      expect(generated()).toContain("import { Logger } from '../Logger';");
    });

    it('takes paths aliases from its own compilerOptions, on top of the tsconfig', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src/services'], { compilerOptions: { paths: { '@app/*': ['./src/*'] } } }),
        'tsconfig.json': tsconfig({ module: 'nodenext', moduleResolution: 'nodenext' }),
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(generated()).toContain("import { Logger } from '@app/services/Logger.js';");
    });

    it('adds a .js extension under nodenext resolution', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src/services']),
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
        'app.bundle.json': module(['./src/services'], { importExtension: '' }),
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
        'app.bundle.json': module(['./src']),
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
        'app.bundle.json': module(['./src/a&b']),
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
        'app.bundle.json': module(['./src/services']),
        'src/services/Logger.ts': decorated('Logger'),
      });

      const result = buildProject({ check: true });

      expect(result.output.status).toBe('stale');
      expect(() => generated()).toThrow();
    });

    it('leaves an up-to-date output untouched', () => {
      project = TempProject.create({
        'app.bundle.json': module(['./src/services']),
        'src/services/Logger.ts': decorated('Logger'),
      });

      expect(buildProject().output.status).toBe('written');
      expect(buildProject().output.status).toBe('unchanged');
      expect(buildProject({ check: true }).output.status).toBe('unchanged');
    });
  });
});
