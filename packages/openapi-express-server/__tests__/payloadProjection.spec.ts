import { renderClient, renderComponents } from '@ibabkin/openapi-to-server';
import { renderValidators } from '@ibabkin/openapi-to-zod';
import { OpenAPIV3 } from 'openapi-types';
import * as fs from 'fs';
import * as path from 'path';
import type { ZodObject } from 'zod';

const GENERATED_DIR = path.resolve(__dirname, './.generated');
const GENERATED_VALIDATORS = path.resolve(GENERATED_DIR, 'payload-validators.ts');

const doc: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'payloads', version: '1.0.0' },
  components: {
    schemas: {
      Thing: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' }, size: { type: 'integer' } },
      },
    },
  },
  paths: {
    '/things/{id}': {
      get: {
        operationId: 'getThing',
        tags: ['things'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'trace', in: 'header', required: true, schema: { type: 'string' } },
          { name: 'session', in: 'cookie', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'ok' } },
      },
      post: {
        operationId: 'createThing',
        tags: ['things'],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Thing' } } } },
        responses: { '201': { description: 'created' } },
      },
      delete: {
        operationId: 'dropThing',
        tags: ['things'],
        responses: { '204': { description: 'gone' } },
      },
    },
    // A path item that declares its parameters once, for every operation under it.
    '/shared/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { operationId: 'getShared', tags: ['things'], responses: { '200': { description: 'ok' } } },
    },
  },
};

/** The member names declared directly inside the outermost `{ … }` of a generated type. */
function topLevelMembers(block: string): string[] {
  let depth = 0;
  let flattened = '';

  for (const char of block) {
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      continue;
    }
    if (depth === 1) {
      flattened += char;
    }
  }

  return [...flattened.matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].map(([, name]) => name);
}

function payloadType(generated: string, operationId: string): string {
  const capitalized = operationId.charAt(0).toUpperCase() + operationId.slice(1);
  const start = generated.indexOf(`export type ${capitalized}Payload = {`);

  expect(start).toBeGreaterThanOrEqual(0);

  return generated.slice(start, generated.indexOf('};', start) + 2);
}

describe('SPEC-003 · request payload projection', () => {
  const types = renderComponents(doc);
  const client = renderClient(doc);

  // RP-1, RP-2, RP-5
  it.each([
    ['getThing', ['query', 'params']],
    ['createThing', ['body']],
    ['dropThing', []],
  ])('gives %p exactly the members %p', (operationId, members) => {
    expect(topLevelMembers(payloadType(types, operationId))).toEqual(members);
  });

  // RP-3
  it('makes a parameter optional unless it is required', () => {
    const payload = payloadType(types, 'getThing');

    expect(payload).toContain('id: string');
    expect(payload).toContain('limit?: number');
  });

  // RP-5 — header and cookie parameters never reach the payload.
  it('leaves header and cookie parameters out of the payload', () => {
    const payload = payloadType(types, 'getThing');

    expect(payload).not.toContain('trace');
    expect(payload).not.toContain('session');
    expect(renderValidators(doc)).not.toContain('trace');
  });

  // RP-7 — the client and the server describe one payload, so a value built for one satisfies the
  // other.
  it.each([['getThing'], ['createThing'], ['dropThing']])('describes %p identically for client and server', (id) => {
    const collapse = (block: string) => block.replace(/\s+/g, ' ').trim();

    expect(collapse(payloadType(client, id))).toBe(collapse(payloadType(types, id)));
  });

  // SPEC-003, known divergence — parameters declared on the path item are invisible to both
  // generators, so a templated path can end up with no `params` member at all.
  it('ignores parameters declared on the path item', () => {
    expect(topLevelMembers(payloadType(types, 'getShared'))).toEqual([]);
    expect(renderValidators(doc)).toContain('getShared: z.object({\n})');
  });
});

describe('SPEC-003 · the validator projects the request', () => {
  let PAYLOADS: Record<string, ZodObject>;

  beforeAll(async () => {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
    fs.writeFileSync(GENERATED_VALIDATORS, renderValidators(doc));

    PAYLOADS = (await import('./.generated/payload-validators' as any)).PAYLOADS;
  });

  afterAll(() => {
    fs.rmSync(GENERATED_DIR, { recursive: true, force: true });
  });

  // RP-6 — parsing an Express request yields exactly the payload and nothing else.
  it('strips everything the payload does not declare', () => {
    const parsed = PAYLOADS.getThing.parse({
      params: { id: '42' },
      query: { limit: '10' },
      body: { unexpected: true },
      headers: { trace: 'abc' },
      method: 'GET',
      url: '/things/42',
    });

    expect(parsed).toEqual({ params: { id: '42' }, query: { limit: 10 } });
  });

  // RP-3 — a required parameter is required, an unrequired one is optional.
  it('requires a required parameter and accepts a missing optional one', () => {
    expect(PAYLOADS.getThing.parse({ params: { id: '42' }, query: {} })).toEqual({ params: { id: '42' }, query: {} });
    expect(() => PAYLOADS.getThing.parse({ params: {}, query: {} })).toThrow();
  });

  // RP-4 — `requestBody.required` is not read: the body is always required.
  it('requires the body even when the document does not', () => {
    expect(doc.paths['/things/{id}']!.post!.requestBody).not.toHaveProperty('required');
    expect(() => PAYLOADS.createThing.parse({ body: undefined })).toThrow();
    expect(PAYLOADS.createThing.parse({ body: { name: 'thing' } })).toEqual({ body: { name: 'thing' } });
  });

  // RP-6 — an operation with no parameters and no body projects to an empty payload.
  it('projects an operation without inputs to an empty payload', () => {
    expect(PAYLOADS.dropThing.parse({ params: { id: '42' }, headers: { trace: 'abc' } })).toEqual({});
  });
});
