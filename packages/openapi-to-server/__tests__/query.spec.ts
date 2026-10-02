import { addPathParams, addQueryParams, createUrl } from '../lib';

describe('SPEC-005 · query utils', () => {
  // URL-3
  describe('addPathParams', () => {
    it('should substitute and encode path parameters', () => {
      expect(addPathParams('/users/{id}/posts/{postId}', { id: 'a b', postId: 42 })).toBe('/users/a%20b/posts/42');
    });

    it('should skip null and undefined values', () => {
      expect(addPathParams('/users/{id}', { id: undefined as unknown as string })).toBe('/users/{id}');
    });
  });

  // URL-4
  describe('addQueryParams', () => {
    it('should build an encoded query string', () => {
      expect(addQueryParams('/items', { q: 'x&y', limit: 10, active: true })).toBe(
        '/items?q=x%26y&limit=10&active=true',
      );
    });

    it('should skip null and undefined values', () => {
      expect(addQueryParams('/items', { q: undefined as unknown as string, limit: 10 })).toBe('/items?limit=10');
    });

    it('should return the url untouched when there is nothing to add', () => {
      expect(addQueryParams('/items', {})).toBe('/items');
    });
  });

  // URL-2
  describe('createUrl', () => {
    it('should combine path and query parameters', () => {
      expect(createUrl('/users/{id}', { params: { id: 1 }, query: { expand: 'posts' } })).toBe('/users/1?expand=posts');
    });

    it('should tolerate missing params and query', () => {
      expect(createUrl('/users', {})).toBe('/users');
      expect(createUrl('/users', { body: { name: 'x' } })).toBe('/users');
    });
  });
});
