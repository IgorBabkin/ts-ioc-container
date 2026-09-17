import { renderClient, renderComponents, renderServer } from '@ibabkin/openapi-to-server';
import { renderValidators } from '@ibabkin/openapi-to-zod';
import { OpenAPIV3 } from 'openapi-types';
import { extractRoutes } from '../lib';

const METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'] as const;

/** One path item declaring every method, each with an operationId named after it. */
const doc: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'methods', version: '1.0.0' },
  paths: {
    '/things': Object.fromEntries(
      METHODS.map((method) => [
        method,
        { operationId: `${method}Thing`, tags: ['things'], responses: { '200': { description: 'ok' } } },
      ]),
    ),
  },
};

const types = renderComponents(doc);
const server = renderServer(doc);
const validators = renderValidators(doc);
const routes = extractRoutes(doc);

const capitalize = (method: string) => method.charAt(0).toUpperCase() + method.slice(1);

describe('SPEC-004 · HTTP method coverage', () => {
  // HM-1 — for these four every consumer agrees, which is what makes them usable end to end.
  it.each([['get'], ['post'], ['put'], ['delete']])('fully supports %p', (method) => {
    const operationId = `${method}Thing`;

    expect(types).toContain(`export type ${capitalize(operationId)}Payload = {`);
    expect(types).toContain(`export interface ${capitalize(operationId)}UseCase extends UseCase<`);
    expect(server).toContain(`${operationId}: constructor<${capitalize(operationId)}UseCase>;`);
    expect(validators).toContain(`${operationId}: z.object(`);
    expect(renderClient(doc)).toContain(`async ${operationId}(`);
    expect(routes.map((route) => route.operationId)).toContain(operationId);
  });

  // HM-2 — the two hard-coded method lists, asserted where they are observable.
  it('covers put, delete, post and get in the type, use case, server, validator and client generators', () => {
    for (const method of METHODS) {
      const generated = ['put', 'delete', 'post', 'get'].includes(method);

      expect(types.includes(`${capitalize(method)}ThingPayload`)).toBe(generated);
      expect(types.includes(`${capitalize(method)}ThingUseCase extends`)).toBe(generated);
      expect(server.includes(`${method}Thing: constructor<`)).toBe(generated);
      expect(validators.includes(`${method}Thing: z.object(`)).toBe(generated);
    }
  });

  // HM-2
  it('covers get, post, put, patch, delete, options and head in extractRoutes', () => {
    expect(routes.map((route) => route.method).sort()).toEqual(
      ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'].sort(),
    );
  });

  // HM-3 — upper-case in the metadata, the document's own lower-case key on the wire.
  it('reports the method upper-cased and sends it lower-cased', () => {
    expect(routes.find((route) => route.operationId === 'getThing')!.method).toBe('GET');
    expect(renderClient(doc)).toContain("method: 'get',");
  });

  // HM-4 — emission order inside a path item is fixed, not the document's order.
  it('emits put, delete, post, get in that order', () => {
    const positions = ['Put', 'Delete', 'Post', 'Get'].map((method) =>
      types.indexOf(`export type ${method}ThingPayload`),
    );

    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  // HM-5, known divergence — PATCH, OPTIONS and HEAD become runtime routes with no use case, types
  // or validator behind them.
  it.each([['patchThing'], ['optionsThing'], ['headThing']])(
    'returns a route for %p with no use case or validator',
    (operationId) => {
      const capitalized = capitalize(operationId);

      expect(routes.map((route) => route.operationId)).toContain(operationId);
      expect(types).not.toContain(capitalized);
      expect(server).not.toContain(operationId);
      expect(validators).not.toContain(operationId);
    },
  );

  // HM-5 — TRACE is invisible to every consumer.
  it('ignores trace everywhere', () => {
    expect(types).not.toContain('TraceThing');
    expect(server).not.toContain('traceThing');
    expect(validators).not.toContain('traceThing');
    expect(routes.map((route) => route.operationId)).not.toContain('traceThing');
  });
});
