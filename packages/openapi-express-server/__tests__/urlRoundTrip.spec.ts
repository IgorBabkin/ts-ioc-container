import { createUrl, renderClient } from '@ibabkin/openapi-to-server';
import { OpenAPIV3 } from 'openapi-types';
import express, { type Express, type Request, type Response } from 'express';
import request from 'supertest';
import { convertOpenAPIPathToExpress } from '../lib';

const PATTERN = '/users/{id}/posts/{postId}';

const doc: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'urls', version: '1.0.0' },
  paths: {
    [PATTERN]: {
      get: {
        operationId: 'getPost',
        tags: ['posts'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'expand', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'ok' } },
      },
    },
  },
};

describe('SPEC-005 · URL construction', () => {
  // URL-1 — the client keeps the path as written and substitutes at call time.
  it('embeds the OpenAPI path verbatim in the generated client', () => {
    expect(renderClient(doc)).toContain(`url: createUrl('${PATTERN}', data),`);
  });
});

describe('SPEC-005 · client and server agree on the URL', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    // The server registers what convertOpenAPIPathToExpress produces …
    app.get(convertOpenAPIPathToExpress(PATTERN), (req: Request, res: Response) => {
      res.json({ params: req.params, query: req.query });
    });
  });

  // URL-6 — … and the client calls what createUrl produces, from the same path.
  it.each([
    [{ id: '42', postId: '7' }, {}],
    [{ id: 'a b', postId: 'c/d' }, {}],
    [{ id: '42', postId: '7' }, { expand: 'author' }],
  ])('round trips params %p and query %p', async (params, query) => {
    const url = createUrl(PATTERN, { params, query });

    const response = await request(app).get(url).expect(200);

    expect(response.body.params).toEqual(params);
    expect(response.body.query).toEqual(query);
  });

  // URL-2 — the body never reaches the URL.
  it('leaves the body out of the URL', () => {
    expect(createUrl(PATTERN, { params: { id: '1', postId: '2' }, body: { name: 'x' } })).toBe('/users/1/posts/2');
  });
});
