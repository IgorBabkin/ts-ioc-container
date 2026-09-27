import { build, byTags, fileTags, type InclusionPredicate, type TagInclusionPredicate } from '../../lib';
import { TempProject } from '../project';

/**
 * Usage examples for choosing which files take part in `tic build`. Each test is one scenario a
 * project might have; the README's "Including files" and "generate per environment" sections point here.
 */
describe('Examples: deciding which files take part', () => {
  let project: TempProject;

  afterEach(() => project?.dispose());

  /** A project with one class per file, all named after their file. */
  const projectWith = (...files: string[]) =>
    TempProject.create({
      'tic.config.json': { bundles: [{ output: 'src/di/app.bundle.ts', namespaces: ['./src'] }] },
      ...Object.fromEntries(files.map((file) => [file, `export class ${file.replace(/^.*\/|\..*$/g, '')} {}\n`])),
    });

  const registered = () =>
    [...project.read('src/di/app.bundle.ts').matchAll(/fromClass\((\w+)\)/g)].map(([, name]) => name);

  const buildWith = (include: InclusionPredicate) => build({ config: project.path('tic.config.json'), include });

  describe('InclusionPredicate: a plain function of the file name', () => {
    it('skips a folder', () => {
      project = projectWith('src/Billing.ts', 'src/legacy/OldBilling.ts');

      buildWith(({ filename }) => !filename.startsWith('src/legacy/'));

      expect(registered()).toEqual(['Billing']);
    });

    it('allows only files named by a convention', () => {
      project = projectWith('src/UserService.ts', 'src/UserMapper.ts', 'src/AuthService.ts');

      buildWith(({ filename }) => filename.endsWith('Service.ts'));

      expect(registered()).toEqual(['AuthService', 'UserService']);
    });
  });

  describe('TagInclusionPredicate: a function of the tags in the file name', () => {
    it('reads tags between the base name and the extension', () => {
      expect(fileTags('src/Shared.ts')).toEqual([]);
      expect(fileTags('src/StripeGateway.production.ts')).toEqual(['production']);
      expect(fileTags('src/Report.production.eu.ts')).toEqual(['production', 'eu']);
    });

    it('keeps opt-out files out of every build', () => {
      project = projectWith('src/Mailer.ts', 'src/Scheduler.manual.ts');

      buildWith(byTags((tags) => !tags.includes('manual')));

      expect(registered()).toEqual(['Mailer']);
    });

    it('generates per environment: tagged files join their environment, untagged ones every environment', () => {
      project = projectWith('src/Shared.ts', 'src/StripeGateway.production.ts', 'src/FakeGateway.development.ts');
      const ENVS = ['development', 'production', 'test'];
      const forEnv = (env: string) =>
        byTags((tags) => tags.filter((tag) => ENVS.includes(tag)).every((t) => t === env));

      buildWith(forEnv('production'));
      expect(registered()).toEqual(['Shared', 'StripeGateway']);

      buildWith(forEnv('development'));
      expect(registered()).toEqual(['FakeGateway', 'Shared']);
    });

    it('combines tag dimensions: environment and region', () => {
      project = projectWith('src/Report.ts', 'src/Report.production.eu.ts', 'src/Tax.production.us.ts');
      const matches =
        (wanted: Record<string, string[]>, env: string, region: string): TagInclusionPredicate =>
        (tags) =>
          tags.every((tag) =>
            wanted.envs.includes(tag) ? tag === env : wanted.regions.includes(tag) ? tag === region : true,
          );
      const dimensions = { envs: ['development', 'production'], regions: ['eu', 'us'] };

      buildWith(byTags(matches(dimensions, 'production', 'eu')));

      expect(registered()).toEqual(['Report', 'Report_2']);
    });

    it('receives the full context too, for rules mixing tags and folders', () => {
      project = projectWith('src/api/Client.mock.ts', 'src/tests/Fixture.mock.ts');

      buildWith(byTags((tags, { filename }) => !tags.includes('mock') || filename.startsWith('src/api/')));

      expect(registered()).toEqual(['Client']);
    });
  });

  describe('By convention: a tic.include file next to the config, importing the package', () => {
    it.each([
      [
        'tic.include.ts',
        [
          "import { byTags } from '@ts-ioc-container/bundler';",
          '',
          "export default byTags((tags: string[]) => !tags.includes('manual'));",
        ],
      ],
      [
        'tic.include.cjs',
        [
          "const { byTags } = require('@ts-ioc-container/bundler');",
          '',
          "module.exports = byTags((tags) => !tags.includes('manual'));",
        ],
      ],
    ])('%s', (file, lines) => {
      project = projectWith('src/Mailer.ts', 'src/Scheduler.manual.ts').linkBundler();
      project.write(file, lines.join('\n'));

      build({ config: project.path('tic.config.json') });

      expect(registered()).toEqual(['Mailer']);
    });
  });
});
