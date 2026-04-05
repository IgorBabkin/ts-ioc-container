import { paramLabel, getParamLabels, paramTag, getParamTags, getParamMeta, paramMeta } from '../../lib';

describe('getParamMeta', () => {
  it('should resolve metadata from a constructor', () => {
    class MyService {
      constructor(@paramMeta('role', () => 'db') _db: unknown) {}
    }

    expect(getParamMeta('role', MyService)[0]).toBe('db');
  });

  it('should resolve metadata from an instance', () => {
    class MyService {
      constructor(@paramMeta('role', () => 'db') _db: unknown) {}
    }

    expect(getParamMeta('role', new MyService(null))[0]).toBe('db');
  });

  it('should return empty array when no metadata is set', () => {
    class MyService {
      constructor(_db: unknown) {}
    }

    expect(getParamMeta('role', MyService)).toEqual([]);
  });
});

describe('parameter metadata', () => {
  describe('paramLabel / getParamLabels', () => {
    it('should add a label and retrieve it by constructor', () => {
      class MyService {
        constructor(@paramLabel('env', 'production') _db: unknown) {}
      }

      expect(getParamLabels(MyService, 0).get('env')).toBe('production');
    });

    it('should add a label and retrieve it by instance', () => {
      class MyService {
        constructor(@paramLabel('env', 'production') _db: unknown) {}
      }

      expect(getParamLabels(new MyService(null), 0).get('env')).toBe('production');
    });

    it('should support multiple labels on the same parameter', () => {
      class MyService {
        constructor(
          @paramLabel('region', 'us-east')
          @paramLabel('env', 'staging')
          _db: unknown,
        ) {}
      }

      const labels = getParamLabels(MyService, 0);
      expect(labels.get('env')).toBe('staging');
      expect(labels.get('region')).toBe('us-east');
    });

    it('should return empty map when no labels are set', () => {
      class MyService {
        constructor(_db: unknown) {}
      }

      expect(getParamLabels(MyService, 0).size).toBe(0);
    });

    it('should not bleed across parameters', () => {
      class MyService {
        constructor(@paramLabel('env', 'production') _db: unknown, _cache: unknown) {}
      }

      expect(getParamLabels(MyService, 1).size).toBe(0);
    });

    it('should support labels on different parameters independently', () => {
      class MyService {
        constructor(@paramLabel('env', 'production') _db: unknown, @paramLabel('env', 'staging') _cache: unknown) {}
      }

      expect(getParamLabels(MyService, 0).get('env')).toBe('production');
      expect(getParamLabels(MyService, 1).get('env')).toBe('staging');
    });
  });

  describe('paramTag / getParamTags', () => {
    it('should add a tag and retrieve it by constructor', () => {
      class MyService {
        constructor(@paramTag('inject') _db: unknown) {}
      }

      expect(getParamTags(MyService, 0).has('inject')).toBe(true);
    });

    it('should add a tag and retrieve it by instance', () => {
      class MyService {
        constructor(@paramTag('inject') _db: unknown) {}
      }

      expect(getParamTags(new MyService(null), 0).has('inject')).toBe(true);
    });

    it('should support multiple tags on the same parameter', () => {
      class MyService {
        constructor(
          @paramTag('inject')
          @paramTag('optional')
          _db: unknown,
        ) {}
      }

      const tags = getParamTags(MyService, 0);
      expect(tags.has('inject')).toBe(true);
      expect(tags.has('optional')).toBe(true);
    });

    it('should return empty set when no tags are set', () => {
      class MyService {
        constructor(_db: unknown) {}
      }

      expect(getParamTags(MyService, 0).size).toBe(0);
    });

    it('should not duplicate tags', () => {
      class MyService {
        constructor(
          @paramTag('inject')
          @paramTag('inject')
          _db: unknown,
        ) {}
      }

      expect(getParamTags(MyService, 0).size).toBe(1);
    });

    it('should not bleed across parameters', () => {
      class MyService {
        constructor(@paramTag('inject') _db: unknown, _cache: unknown) {}
      }

      expect(getParamTags(MyService, 1).size).toBe(0);
    });
  });
});
