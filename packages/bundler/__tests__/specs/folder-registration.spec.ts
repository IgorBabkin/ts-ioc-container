import { build, type InclusionContext, TicConfigError, NamespaceNotFoundError } from '../../lib';
import { decorated, TempProject } from '../project';

const module = (namespaces: unknown[], extra: object = {}) => ({
  bundles: [{ output: 'src/di/container.bundle.ts', namespaces, ...extra }],
});

describe('Folder registration', () => {
  let project: TempProject;

  afterEach(() => project?.dispose());

  const generated = () => project.read('src/di/container.bundle.ts');
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

    it('exports the bundle class under its configured name, Bundle by default', () => {
      project = TempProject.create({
        'tic.config.json': {
          bundles: [
            { output: 'src/di/a.bundle.ts', namespaces: ['./src/services'] },
            { output: 'src/di/b.bundle.ts', namespaces: ['./src/services'], name: 'ServicesBundle' },
          ],
        },
        'src/services/Logger.ts': decorated('Logger'),
      });

      buildProject();

      expect(project.read('src/di/a.bundle.ts')).toContain('export class Bundle implements IContainerModule');
      expect(project.read('src/di/b.bundle.ts')).toContain('export class ServicesBundle implements IContainerModule');
    });

    it.each([
      [{}, 'bundles: expected a non-empty array'],
      [{ bundles: [{ namespaces: ['./src'] }] }, 'bundles[0].output: expected a non-empty string'],
      [{ bundles: [{ output: 'a.ts', namespaces: [] }] }, 'bundles[0].namespaces: expected a non-empty array'],
      [{ bundles: [{ output: 'a.ts', namespaces: [{ recursive: true }] }] }, 'bundles[0].namespaces[0].path'],
      [{ bundles: [{ output: 'a.ts', namespaces: ['./src'], name: 'not valid' }] }, 'bundles[0].name'],
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

    it('registers every exported class by default, skipping non-exported and abstract ones', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src']),
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
        'src/di/container.bundle.ts': decorated('Stale'),
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

  describe('Story: Decide which files take part with a predicate', () => {
    const files = {
      'src/Kept.ts': decorated('Kept'),
      'src/legacy/Old.ts': decorated('Old'),
      'src/Kept.spec.ts': decorated('KeptSpec'),
    };
    const registered = () => [...generated().matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name);

    it.each([
      ['tic.include.cjs', "module.exports = ({ filename }) => !filename.startsWith('src/legacy/');\n"],
      ['tic.include.mjs', "export default ({ filename }) => !filename.startsWith('src/legacy/');\n"],
      [
        'tic.include.ts',
        "export default ({ filename }: { filename: string }): boolean => !filename.startsWith('src/legacy/');\n",
      ],
    ])('applies %s next to the config by convention, without configuring it', (file, source) => {
      project = TempProject.create({ 'tic.config.json': module(['./src']), [file]: source, ...files });

      buildProject();

      expect(registered()).toEqual(['Kept']);
    });

    it('keeps every file the globs allow when there is no predicate', () => {
      project = TempProject.create({ 'tic.config.json': module(['./src']), ...files });

      buildProject();

      expect(registered()).toEqual(['Kept', 'Old']);
    });

    it('still applies exclude globs: a file must pass both', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src']),
        'tic.include.cjs': 'module.exports = () => true;\n',
        ...files,
      });

      buildProject();

      expect(registered()).not.toContain('KeptSpec');
    });

    it('lets a module name its predicate file, overriding the conventional one', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src'], { include: './tools/only-legacy.cjs' }),
        'tic.include.cjs': 'module.exports = () => false;\n',
        'tools/only-legacy.cjs': "module.exports = ({ filename }) => filename.startsWith('src/legacy/');\n",
        ...files,
      });

      buildProject();

      expect(registered()).toEqual(['Old']);
    });

    it('takes a predicate function in build(), overriding both, with filenames relative to the config', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src'], { include: './missing.cjs' }),
        'tic.include.cjs': 'module.exports = () => false;\n',
        ...files,
      });
      const seen: InclusionContext[] = [];

      build({
        config: project.path('tic.config.json'),
        include: (context) => {
          seen.push(context);
          return context.filename === 'src/legacy/Old.ts';
        },
      });

      expect(registered()).toEqual(['Old']);
      expect(seen.map((c) => c.filename).sort()).toEqual(['src/Kept.ts', 'src/legacy/Old.ts']);
    });

    it.each([
      [{ include: './missing.cjs' }, {}, /predicate file not found: .*missing\.cjs/],
      [
        { include: './not-a-function.cjs' },
        { 'not-a-function.cjs': 'module.exports = 42;\n' },
        /not-a-function\.cjs.*function/,
      ],
      [{ include: '' }, {}, 'bundles[0].include: expected a non-empty string'],
    ])('fails naming the predicate file for %j', (extra, more, message) => {
      project = TempProject.create({ 'tic.config.json': module(['./src'], extra), ...more, ...files });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(message);
    });
  });

  describe('Recipe: generate per environment (README)', () => {
    // The helper the README recipe ships: `*.<env>.ts` joins only that environment, the rest is shared.
    const forEnv = [
      "const { byTags } = require('@ts-ioc-container/bundler');",
      "const ENVS = ['development', 'production', 'test'];",
      'module.exports = (env) => byTags((tags) => tags.filter((tag) => ENVS.includes(tag)).every((tag) => tag === env));',
    ].join('\n');
    const sources = {
      'src/services/Shared.ts': decorated('Shared'),
      'src/services/StripeGateway.production.ts': decorated('StripeGateway'),
      'src/services/FakeGateway.development.ts': decorated('FakeGateway'),
    };
    const registeredIn = (file: string) =>
      [...project.read(file).matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name);

    it('one bundle per environment, picked at runtime', () => {
      project = TempProject.create({
        'tic.config.json': {
          bundles: ['production', 'development'].map((env) => ({
            output: `src/di/app.${env}.bundle.ts`,
            name: 'AppBundle',
            namespaces: ['./src/services'],
            include: `./tic/${env}.cjs`,
          })),
        },
        'tic/for-env.cjs': forEnv,
        'tic/production.cjs': "module.exports = require('./for-env.cjs')('production');\n",
        'tic/development.cjs': "module.exports = require('./for-env.cjs')('development');\n",
        ...sources,
      }).linkBundler();

      buildProject();

      expect(registeredIn('src/di/app.production.bundle.ts')).toEqual(['Shared', 'StripeGateway']);
      expect(registeredIn('src/di/app.development.bundle.ts')).toEqual(['FakeGateway', 'Shared']);
    });

    it('one output, environment chosen when tic build runs (TIC_ENV)', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src/services']),
        'tic/for-env.cjs': forEnv,
        // Read TIC_ENV per call: a predicate file is loaded once per process.
        'tic.include.cjs': [
          "const forEnv = require('./tic/for-env.cjs');",
          "module.exports = (context) => forEnv(process.env.TIC_ENV ?? 'development')(context);",
        ].join('\n'),
        ...sources,
      }).linkBundler();
      const previous = process.env.TIC_ENV;

      try {
        process.env.TIC_ENV = 'production';
        buildProject();
        expect(registeredIn('src/di/container.bundle.ts')).toEqual(['Shared', 'StripeGateway']);

        delete process.env.TIC_ENV;
        buildProject();
        expect(registeredIn('src/di/container.bundle.ts')).toEqual(['FakeGateway', 'Shared']);
      } finally {
        if (previous === undefined) delete process.env.TIC_ENV;
        else process.env.TIC_ENV = previous;
      }
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
      project = TempProject.create({ 'tic.config.json': module(['./src'], { select }), 'src/Classes.ts': classes });
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
        'tic.config.json': module(['./src'], { select: { decorators: ['register', 'service'] } }),
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
        'tic.config.json': module(['./src'], { select: { nameGlob: '*Service' } }),
        'src/user-service.ts': 'export default class {}\n',
      });

      buildProject();

      expect(generated()).toContain("import UserService from '../user-service';");
    });

    it.each([
      ['decorated', 'bundles[0].select: expected an object'],
      [{ export: 'all' }, 'bundles[0].select.export: expected "any", "named" or "default"'],
      [{ decorators: [] }, 'bundles[0].select.decorators: expected a non-empty array of strings'],
      [{ nameGlob: '' }, 'bundles[0].select.nameGlob: expected a non-empty string'],
      [{ exported: true }, 'bundles[0].select.exported: unknown field'],
    ])('rejects the rule %j naming the field', (select, message) => {
      project = TempProject.create({ 'tic.config.json': module(['./src'], { select }) });

      expect(() => buildProject()).toThrow(TicConfigError);
      expect(() => buildProject()).toThrow(message);
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

  describe('Story: Generate a plain container module (protocol)', () => {
    it('writes paths into the generated TypeScript verbatim, never HTML-escaped', () => {
      project = TempProject.create({
        'tic.config.json': module(['./src/a&b']),
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
