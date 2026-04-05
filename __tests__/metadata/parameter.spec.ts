import {
  parameterLabel,
  getParameterLabels,
  parameterTag,
  getParameterTags,
  getParameterMeta,
  parameterMeta,
} from '../../lib';

describe('getParameterMeta', () => {
  it('should resolve metadata from a constructor', () => {
    class MyService {
      constructor(@parameterMeta('role', () => 'db') _db: unknown) {}
    }

    expect(getParameterMeta('role', MyService)[0]).toBe('db');
  });

  it('should resolve metadata from an instance', () => {
    class MyService {
      constructor(@parameterMeta('role', () => 'db') _db: unknown) {}
    }

    expect(getParameterMeta('role', new MyService(null))[0]).toBe('db');
  });

  it('should return empty array when no metadata is set', () => {
    class MyService {
      constructor(_db: unknown) {}
    }

    expect(getParameterMeta('role', MyService)).toEqual([]);
  });
});

describe('parameter metadata', () => {
  describe('parameterLabel / getParameterLabels', () => {
    it('should add a label and retrieve it by constructor', () => {
      class MyService {
        constructor(@parameterLabel('env', 'production') _db: unknown) {}
      }

      expect(getParameterLabels(MyService, 0).get('env')).toBe('production');
    });

    it('should add a label and retrieve it by instance', () => {
      class MyService {
        constructor(@parameterLabel('env', 'production') _db: unknown) {}
      }

      expect(getParameterLabels(new MyService(null), 0).get('env')).toBe('production');
    });

    it('should support multiple labels on the same parameter', () => {
      class MyService {
        constructor(
          @parameterLabel('region', 'us-east')
          @parameterLabel('env', 'staging')
          _db: unknown,
        ) {}
      }

      const labels = getParameterLabels(MyService, 0);
      expect(labels.get('env')).toBe('staging');
      expect(labels.get('region')).toBe('us-east');
    });

    it('should return empty map when no labels are set', () => {
      class MyService {
        constructor(_db: unknown) {}
      }

      expect(getParameterLabels(MyService, 0).size).toBe(0);
    });

    it('should not bleed across parameters', () => {
      class MyService {
        constructor(@parameterLabel('env', 'production') _db: unknown, _cache: unknown) {}
      }

      expect(getParameterLabels(MyService, 1).size).toBe(0);
    });

    it('should support labels on different parameters independently', () => {
      class MyService {
        constructor(
          @parameterLabel('env', 'production') _db: unknown,
          @parameterLabel('env', 'staging') _cache: unknown,
        ) {}
      }

      expect(getParameterLabels(MyService, 0).get('env')).toBe('production');
      expect(getParameterLabels(MyService, 1).get('env')).toBe('staging');
    });
  });

  describe('parameterTag / getParameterTags', () => {
    it('should add a tag and retrieve it by constructor', () => {
      class MyService {
        constructor(@parameterTag('inject') _db: unknown) {}
      }

      expect(getParameterTags(MyService, 0).has('inject')).toBe(true);
    });

    it('should add a tag and retrieve it by instance', () => {
      class MyService {
        constructor(@parameterTag('inject') _db: unknown) {}
      }

      expect(getParameterTags(new MyService(null), 0).has('inject')).toBe(true);
    });

    it('should support multiple tags on the same parameter', () => {
      class MyService {
        constructor(
          @parameterTag('inject')
          @parameterTag('optional')
          _db: unknown,
        ) {}
      }

      const tags = getParameterTags(MyService, 0);
      expect(tags.has('inject')).toBe(true);
      expect(tags.has('optional')).toBe(true);
    });

    it('should return empty set when no tags are set', () => {
      class MyService {
        constructor(_db: unknown) {}
      }

      expect(getParameterTags(MyService, 0).size).toBe(0);
    });

    it('should not duplicate tags', () => {
      class MyService {
        constructor(
          @parameterTag('inject')
          @parameterTag('inject')
          _db: unknown,
        ) {}
      }

      expect(getParameterTags(MyService, 0).size).toBe(1);
    });

    it('should not bleed across parameters', () => {
      class MyService {
        constructor(@parameterTag('inject') _db: unknown, _cache: unknown) {}
      }

      expect(getParameterTags(MyService, 1).size).toBe(0);
    });
  });
});
