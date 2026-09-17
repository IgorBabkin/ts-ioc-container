import * as fs from 'fs';
import * as path from 'path';
import { OpenAPIV3 } from 'openapi-types';

const PACKAGES = {
  '@ibabkin/openapi-to-server': path.resolve(__dirname, '../../openapi-to-server-interface/lib/templates'),
  '@ibabkin/openapi-to-zod': path.resolve(__dirname, '../../openapi-to-request-validator/lib/templates'),
};

/** Helpers both packages register today. Adding a name here means both must agree on what it does. */
const SHARED_HELPERS = [
  'array',
  'capitalize',
  'excludes',
  'filter_parameters',
  'get_methods',
  'get_methods_obj',
  'get_value_by_key',
  'has_property',
  'includes',
  'is_equal',
  'render_ref',
  'render_template',
  'some_parameters',
];

const templateNames = (dir: string) => fs.readdirSync(dir).filter((file) => file.endsWith('.hbs'));

const helperNames = (dir: string) =>
  [...fs.readFileSync(path.join(dir, 'index.ts'), 'utf8').matchAll(/registerHelper\(\s*'([^']+)'/g)].map(
    ([, name]) => name,
  );

const doc: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'registry', version: '1.0.0' },
  components: { schemas: { Thing: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } },
  paths: {
    '/things': {
      get: {
        operationId: 'getThings',
        tags: ['things'],
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'ok',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Thing' } } },
          },
        },
      },
    },
  },
};

/** Renders both packages in a fresh module registry, importing them in the given order. */
async function renderWith(first: 'server' | 'zod', loadBoth = true) {
  let types = '';
  let validators = '';

  await jest.isolateModulesAsync(async () => {
    const importServer = () => import('@ibabkin/openapi-to-server');
    const importZod = () => import('@ibabkin/openapi-to-zod');

    if (first === 'server') {
      const server = await importServer();
      types = server.renderComponents(doc);
      if (loadBoth) {
        validators = (await importZod()).renderValidators(doc);
      }
    } else {
      const zod = await importZod();
      validators = zod.renderValidators(doc);
      if (loadBoth) {
        types = (await importServer()).renderComponents(doc);
      }
    }
  });

  return { types, validators };
}

describe('SPEC-006 · shared Handlebars registry', () => {
  // TR-2 — one global template map, so a shared basename would silently shadow a template.
  it('gives every template a basename no other package uses', () => {
    const [server, zod] = Object.values(PACKAGES).map(templateNames);

    expect(server.length).toBeGreaterThan(0);
    expect(zod.length).toBeGreaterThan(0);
    expect(server.filter((name) => zod.includes(name))).toEqual([]);
  });

  // TR-4 — one global helper namespace, and the last registration wins.
  it('shares exactly the documented helper names between the packages', () => {
    const [server, zod] = Object.values(PACKAGES).map(helperNames);

    expect(server.filter((name) => zod.includes(name)).sort()).toEqual([...SHARED_HELPERS].sort());
  });

  // TR-5 — loading the other package must not change what a package renders, in either order.
  it('renders the same output whichever package is loaded first', async () => {
    const serverFirst = await renderWith('server');
    const zodFirst = await renderWith('zod');
    const serverAlone = await renderWith('server', false);
    const zodAlone = await renderWith('zod', false);

    expect(serverFirst.types).toBe(zodFirst.types);
    expect(serverFirst.validators).toBe(zodFirst.validators);
    expect(serverFirst.types).toBe(serverAlone.types);
    expect(serverFirst.validators).toBe(zodAlone.validators);
  });
});
