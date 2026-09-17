import { renderServer } from '@ibabkin/openapi-to-server';
import { OpenAPIV3 } from 'openapi-types';
import { extractRoutes } from '../lib';

function specWithTags(tags?: string[]): OpenAPIV3.Document {
  return {
    openapi: '3.0.0',
    info: { title: 'tags', version: '1.0.0' },
    paths: {
      '/network-health': {
        get: {
          operationId: 'getNetworkHealth',
          ...(tags ? { tags } : {}),
          responses: { '200': { description: 'ok' } },
        },
      },
    },
  };
}

describe('SPEC-001 · extractRoutes', () => {
  // CN-3, CN-6
  it('turns a tag into a valid identifier', () => {
    const [route] = extractRoutes(specWithTags(['Network Health']));

    expect(route.controllerName).toBe('Network');
    expect(route.methodName).toBe('getNetworkHealth');
  });

  // CN-1
  it('names the controller after the first tag and carries the rest through', () => {
    const [route] = extractRoutes(specWithTags(['Network Health', 'Diagnostics', 'v1/admin']));

    expect(route.controllerName).toBe('Network');
    expect(route.tags).toEqual(['Network Health', 'Diagnostics', 'v1/admin']);
  });

  // CN-2
  it('skips operations without tags', () => {
    expect(extractRoutes(specWithTags())).toEqual([]);
  });

  // CN-7 — the runtime lookup key and the generated IServer key are derived from one helper,
  // so a controller registered under the generated key resolves.
  it.each([['Network Health'], ['station-groups'], ['v1/admin'], ['items'], ['2fa']])(
    'derives the same controller name as the generated IServer key for tag %p',
    (tag) => {
      const doc = specWithTags([tag]);
      const [route] = extractRoutes(doc);

      expect(renderServer(doc)).toContain(`${route.controllerName}: constructor<I${route.controllerName}Controller>`);
    },
  );
});
