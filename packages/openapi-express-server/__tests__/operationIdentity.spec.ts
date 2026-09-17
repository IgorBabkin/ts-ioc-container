import { renderClient, renderComponents, renderServer } from '@ibabkin/openapi-to-server';
import { renderValidators } from '@ibabkin/openapi-to-zod';
import { OpenAPIV3 } from 'openapi-types';
import { extractRoutes } from '../lib';

const doc: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'operations', version: '1.0.0' },
  paths: {
    '/things': {
      get: { operationId: 'listThings', tags: ['things'], responses: { '200': { description: 'ok' } } },
      post: { operationId: 'create_thing', tags: ['things'], responses: { '201': { description: 'created' } } },
    },
  },
};

const withoutOperationId: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'anonymous', version: '1.0.0' },
  paths: {
    '/things': {
      get: { tags: ['things'], responses: { '200': { description: 'ok' } } },
    },
  },
};

describe('SPEC-002 · operationId as the cross-package join key', () => {
  // OP-1 — one string reaches the generated types, the use case, IServer, the validator, the
  // client and the runtime metadata; a consumer that holds it can find all of them.
  it.each([['listThings'], ['create_thing']])('joins every artefact of operation %p', (operationId) => {
    const capitalized = operationId.charAt(0).toUpperCase() + operationId.slice(1);
    const [route] = extractRoutes(doc).filter((candidate) => candidate.operationId === operationId);

    expect(route.operationId).toBe(operationId);
    expect(renderComponents(doc)).toContain(`${operationId}: ${capitalized}UseCase;`);
    expect(renderServer(doc)).toContain(`${operationId}: constructor<${capitalized}UseCase>;`);
    expect(renderClient(doc)).toContain(`async ${operationId}(data: ${capitalized}Payload)`);
    expect(renderValidators(doc)).toContain(`${operationId}: z.object(`);
  });

  // OP-5
  it('skips an operation without an operationId', () => {
    expect(extractRoutes(withoutOperationId)).toEqual([]);
  });

  // OP-5, known divergence — the type, server, client and validator templates do not skip it. The
  // first three crash on `capitalize(undefined)`, the fourth emits an entry with an empty key.
  // This pins today's behaviour: changing it is a behaviour change, and this test changes with it.
  it('breaks the type, server, client and validator generators on an operation without an operationId', () => {
    expect(() => renderComponents(withoutOperationId)).toThrow(TypeError);
    expect(() => renderServer(withoutOperationId)).toThrow(TypeError);
    expect(() => renderClient(withoutOperationId)).toThrow(TypeError);
    expect(renderValidators(withoutOperationId)).toContain(': z.object(');
    expect(renderValidators(withoutOperationId)).not.toMatch(/\w+: z\.object\(/);
  });
});
