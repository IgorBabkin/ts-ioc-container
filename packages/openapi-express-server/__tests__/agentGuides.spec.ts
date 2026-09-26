import 'reflect-metadata';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import type { Server } from 'http';
import * as YAML from 'yaml';
import { Container, IContainer, register, Registration as R } from 'ts-ioc-container';
import { z } from 'zod';
import { AppService, IAppServiceToken, ILoggerToken } from './agentRecipes/AppService';
import { OnConstructModule } from './agentRecipes/lifecycle';

const PACKAGES = ['openapi-express-server', 'openapi-to-server-interface', 'openapi-to-request-validator'];

const packageDir = (dir: string) => path.resolve(__dirname, '../..', dir);
const readGuide = (dir: string) => fs.readFileSync(path.join(packageDir(dir), 'AGENTS.md'), 'utf8');

/** Names re-exported from `lib/index.ts` (`export { a, b as c } from '...'`). */
function exportedNames(dir: string): string[] {
  const source = fs.readFileSync(path.join(packageDir(dir), 'lib/index.ts'), 'utf8');
  return [...source.matchAll(/export\s*{([^}]*)}/g)]
    .flatMap(([, list]) => list.split(','))
    .map((name) =>
      name
        .replace(/^\s*type\s+/, '')
        .replace(/^.*\s+as\s+/, '')
        .trim(),
    )
    .filter(Boolean);
}

describe('AGENTS.md', () => {
  describe.each(PACKAGES)('%s', (dir) => {
    it('ships in the npm package', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(packageDir(dir), 'package.json'), 'utf8'));

      expect(pkg.files).toContain('AGENTS.md');
      expect(pkg.exports['./AGENTS.md']).toBe('./AGENTS.md');
    });

    it('names every public export', () => {
      const guide = readGuide(dir);

      for (const name of exportedNames(dir)) {
        expect(guide).toContain(`\`${name}`);
      }
    });
  });

  describe('openapi-express-server recipe "Wire every operation"', () => {
    it('is the code this test runs', () => {
      const recipe = fs
        .readFileSync(path.resolve(__dirname, 'agentRecipes/AppService.ts'), 'utf8')
        .split('// region recipe\n')[1]
        .split('// endregion recipe')[0]
        .replace(/^export /gm, '');

      expect(readGuide('openapi-express-server')).toContain(recipe);
    });

    @register('getItem')
    class GetItem {
      async handle(payload: { params: { id: string } }, scope: IContainer) {
        return { status: 200, headers: { 'x-tags': String(scope.hasTag('items')) }, body: { id: payload.params.id } };
      }
    }

    @register('deleteItem')
    class DeleteItem {
      async handle() {
        return { status: 204, headers: {} };
      }
    }

    const logged: string[] = [];
    const container = new Container({ tags: ['application'] })
      .useModule(OnConstructModule)
      .addRegistration(R.fromValue({ log: (message: string) => logged.push(message) }).bindTo(ILoggerToken))
      .addRegistration(R.fromClass(GetItem))
      .addRegistration(R.fromClass(DeleteItem))
      .addRegistration(R.fromClass(AppService));

    const appService = IAppServiceToken.resolve(container);
    appService.applyRoutes(YAML.parse(fs.readFileSync(path.resolve(__dirname, 'swagger.yaml'), 'utf8')), {
      getItem: z.object({ params: z.object({ id: z.string().min(2) }) }),
      deleteItem: z.object({ params: z.object({ id: z.string() }) }),
    });

    let app: Server;
    beforeAll(() => {
      app = appService.start(0);
    });
    afterAll((done) => {
      app.close(done);
    });

    it('runs the @onConstruct modules: JSON parsing, request logging with an injected logger, health check', async () => {
      await request(app).get('/health').expect(200, { status: 'ok' });

      expect(logged).toContain('GET /health');
    });

    it('serves a registered operation from a request scope carrying its tags', async () => {
      const response = await request(app).get('/items/42').expect(200);

      expect(response.body).toEqual({ id: '42' });
      expect(response.headers['x-tags']).toBe('true');
    });

    it('ends a response without a body', async () => {
      await request(app).delete('/items/42').expect(204);
    });

    it('turns a validation failure into a 400 through the error middleware', async () => {
      await request(app).get('/items/1').expect(400);
    });

    it('skips an operation with nothing registered', async () => {
      await request(app).get('/items').expect(404);
    });
  });
});
