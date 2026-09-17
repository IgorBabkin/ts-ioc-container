import { renderServer } from '@ibabkin/openapi-to-server';
import { OpenAPIV3 } from 'openapi-types';
import { extractRoutes } from '../lib';

function specWithTags(tags?: string[], operationId = 'getNetworkHealth'): OpenAPIV3.Document {
  return {
    openapi: '3.0.0',
    info: { title: 'tags', version: '1.0.0' },
    paths: {
      '/network-health': {
        get: {
          operationId,
          ...(tags ? { tags } : {}),
          responses: { '200': { description: 'ok' } },
        },
      },
    },
  };
}

describe('SPEC-007 · extractRoutes', () => {
  // UC-4 — the metadata is the path, the method, the operationId and the tags; nothing else is
  // derived from the document.
  it('describes a route by its operationId only', () => {
    const [route] = extractRoutes(specWithTags(['Network Health']));

    expect(route).toEqual({
      path: '/network-health',
      method: 'GET',
      operationId: 'getNetworkHealth',
      tags: ['Network Health'],
    });
  });

  // UC-5 — tags are carried verbatim: not normalised, not truncated, not reordered.
  it('carries every tag through untouched', () => {
    const [route] = extractRoutes(specWithTags(['Network Health', 'v1/admin', '2fa', 'Diagnostics']));

    expect(route.tags).toEqual(['Network Health', 'v1/admin', '2fa', 'Diagnostics']);
  });

  // UC-5 — an untagged operation is still a route, with no tags.
  it('returns an untagged operation with an empty tag list', () => {
    const [route] = extractRoutes(specWithTags());

    expect(route.operationId).toBe('getNetworkHealth');
    expect(route.tags).toEqual([]);
  });

  // UC-3, UC-4 — the runtime lookup key and the generated IServer key are the same string, so a
  // use case registered under the generated key resolves at runtime.
  it.each([['getNetworkHealth'], ['get_network_health'], ['GETNetworkHealth']])(
    'uses the same key as the generated IServer for operation %p',
    (operationId) => {
      const doc = specWithTags(['Network Health'], operationId);
      const [route] = extractRoutes(doc);
      const capitalized = operationId.charAt(0).toUpperCase() + operationId.slice(1);

      expect(renderServer(doc)).toContain(`${route.operationId}: constructor<${capitalized}UseCase>;`);
    },
  );
});
