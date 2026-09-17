import { renderClient, renderComponents, renderControllers, renderServer } from '@ibabkin/openapi-to-server';
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
const controllers = renderControllers(doc);
const validators = renderValidators(doc);
const routes = extractRoutes(doc);

const capitalize = (method: string) => method.charAt(0).toUpperCase() + method.slice(1);

describe('SPEC-004 · HTTP method coverage', () => {
  // HM-1 — for these four every consumer agrees, which is what makes them usable end to end.
  it.each([['get'], ['post'], ['put'], ['delete']])('fully supports %p', (method) => {
    const operationId = `${method}Thing`;

    expect(types).toContain(`export type ${capitalize(operationId)}Payload = {`);
    expect(controllers).toContain(`${operationId}(payload: ${capitalize(operationId)}Payload)`);
    expect(validators).toContain(`${operationId}: z.object(`);
    expect(renderClient(doc)).toContain(`async ${operationId}(`);
    expect(routes.map((route) => route.operationId)).toContain(operationId);
  });

  // HM-2 — the three hard-coded method lists, asserted where they are observable.
  it('covers put, delete, post and get in the type, validator and client generators', () => {
    for (const method of METHODS) {
      const generated = ['put', 'delete', 'post', 'get'].includes(method);

      expect(types.includes(`${capitalize(method)}ThingPayload`)).toBe(generated);
      expect(validators.includes(`${method}Thing: z.object(`)).toBe(generated);
    }
  });

  // HM-2
  it('covers get, post, put, delete and patch in the controller generator', () => {
    for (const method of METHODS) {
      const generated = ['get', 'post', 'put', 'delete', 'patch'].includes(method);

      expect(controllers.includes(`${method}Thing(payload:`)).toBe(generated);
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

  // HM-5, known divergence — a PATCH operation generates a controller method whose types and
  // validator were never generated, so the output does not compile.
  it('generates a patch controller method without its types or validator', () => {
    expect(controllers).toContain('patchThing(payload: PatchThingPayload)');
    expect(renderServer(doc)).toContain('Things: constructor<IThingsController>');
    expect(types).not.toContain('PatchThingPayload');
    expect(validators).not.toContain('patchThing');
  });

  // HM-5, known divergence — OPTIONS and HEAD become runtime routes with no validator behind them,
  // which the reference RouteBuilder reports as `Validator for operation "…" not found`.
  it.each([['optionsThing'], ['headThing']])('returns a route for %p with no validator', (operationId) => {
    expect(routes.map((route) => route.operationId)).toContain(operationId);
    expect(validators).not.toContain(operationId);
  });

  // HM-5 — TRACE is invisible to every consumer.
  it('ignores trace everywhere', () => {
    expect(types).not.toContain('TraceThing');
    expect(controllers).not.toContain('traceThing');
    expect(validators).not.toContain('traceThing');
    expect(routes.map((route) => route.operationId)).not.toContain('traceThing');
  });
});
