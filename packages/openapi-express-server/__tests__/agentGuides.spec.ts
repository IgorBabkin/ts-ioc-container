import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { Container, IContainer, Registration as R } from 'ts-ioc-container';
import { z, ZodError } from 'zod';
import { applyRoutes } from './agentRecipes/applyRoutes';

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
        .readFileSync(path.resolve(__dirname, 'agentRecipes/applyRoutes.ts'), 'utf8')
        .split('// region recipe\n')[1]
        .split('// endregion recipe')[0]
        .replace('export function', 'function');

      expect(readGuide('openapi-express-server')).toContain(recipe);
    });

    class GetItem {
      async handle(payload: { params: { id: string } }, scope: IContainer) {
        return { status: 200, headers: { 'x-tags': String(scope.hasTag('items')) }, body: { id: payload.params.id } };
      }
    }

    class DeleteItem {
      async handle() {
        return { status: 204, headers: {} };
      }
    }

    const app = express();
    const container = new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(GetItem).bindToKey('getItem'))
      .addRegistration(R.fromClass(DeleteItem).bindToKey('deleteItem'));
    const spec = YAML.parse(fs.readFileSync(path.resolve(__dirname, 'swagger.yaml'), 'utf8'));

    app.use(express.json());
    applyRoutes(app, container, spec, {
      getItem: z.object({ params: z.object({ id: z.string().min(2) }) }),
      deleteItem: z.object({ params: z.object({ id: z.string() }) }),
    });
    // Express recognises an error handler by its four parameters.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(error instanceof ZodError ? 400 : 500).json({ error: error.message });
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
