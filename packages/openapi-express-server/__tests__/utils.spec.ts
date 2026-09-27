import { buildPayload, convertOpenAPIPathToExpress } from '../lib';
import { Request } from 'express';

describe('Utility functions', () => {
  describe('SPEC-005 · convertOpenAPIPathToExpress', () => {
    // URL-5
    it('should convert OpenAPI path parameters to Express format', () => {
      expect(convertOpenAPIPathToExpress('/users/{id}')).toBe('/users/:id');
      expect(convertOpenAPIPathToExpress('/users/{userId}/posts/{postId}')).toBe('/users/:userId/posts/:postId');
      expect(convertOpenAPIPathToExpress('/items')).toBe('/items');
    });
  });

  // RP-8 — buildPayload is the validator-free projection: it carries headers, which the generated
  // payload type does not have, and drops params/query when they are empty, which the generated
  // payload type requires whenever the operation declares them.
  describe('SPEC-003 · buildPayload', () => {
    it('should build payload from request with params', () => {
      const req = {
        params: { id: '123' },
        query: {},
        body: undefined,
        headers: {},
      } as unknown as Request;

      const payload = buildPayload(req);

      expect(payload).toEqual({
        params: { id: '123' },
      });
    });

    it('should build payload from request with query', () => {
      const req = {
        params: {},
        query: { limit: '10', offset: '20' },
        body: undefined,
        headers: {},
      } as unknown as Request;

      const payload = buildPayload(req);

      expect(payload).toEqual({
        query: { limit: '10', offset: '20' },
      });
    });

    it('should build payload from request with body', () => {
      const req = {
        params: {},
        query: {},
        body: { name: 'Test' },
        headers: {},
      } as unknown as Request;

      const payload = buildPayload(req);

      expect(payload).toEqual({
        body: { name: 'Test' },
      });
    });

    it('should build payload with all parts', () => {
      const req = {
        params: { id: '123' },
        query: { filter: 'active' },
        body: { name: 'Test' },
        headers: { authorization: 'Bearer token' },
      } as unknown as Request;

      const payload = buildPayload(req);

      expect(payload).toEqual({
        params: { id: '123' },
        query: { filter: 'active' },
        body: { name: 'Test' },
        headers: { authorization: 'Bearer token' },
      });
    });
  });
});
