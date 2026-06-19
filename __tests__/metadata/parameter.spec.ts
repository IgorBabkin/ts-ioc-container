import { addParamLabel, getParamLabels, addParamTag, getParamTags, getParamMeta, addParamMeta } from '../../lib';

describe('getParamMeta', () => {
  it('should resolve metadata from a constructor', () => {
    class MyService {
      constructor(@addParamMeta('role', () => 'db') _db: unknown) {}
    }

    expect(getParamMeta('role', MyService)[0]).toBe('db');
  });

  it('should resolve metadata from an instance', () => {
    class MyService {
      constructor(@addParamMeta('role', () => 'db') _db: unknown) {}
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
  describe('addParamLabel / getParamLabels', () => {
    it('should add a label and retrieve it by constructor', () => {
      class MyService {
        constructor(@addParamLabel('env', 'production') _db: unknown) {}
      }

      expect(getParamLabels(MyService, 0).get('env')).toBe('production');
    });

    it('should add a label and retrieve it by instance', () => {
      class MyService {
        constructor(@addParamLabel('env', 'production') _db: unknown) {}
      }

      expect(getParamLabels(new MyService(null), 0).get('env')).toBe('production');
    });

    it('should support multiple labels on the same parameter', () => {
      class MyService {
        constructor(
          @addParamLabel('region', 'us-east')
          @addParamLabel('env', 'staging')
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
        constructor(@addParamLabel('env', 'production') _db: unknown, _cache: unknown) {}
      }

      expect(getParamLabels(MyService, 1).size).toBe(0);
    });

    it('should support labels on different parameters independently', () => {
      class MyService {
        constructor(
          @addParamLabel('env', 'production') _db: unknown,
          @addParamLabel('env', 'staging') _cache: unknown,
        ) {}
      }

      expect(getParamLabels(MyService, 0).get('env')).toBe('production');
      expect(getParamLabels(MyService, 1).get('env')).toBe('staging');
    });
  });

  describe('addParamTag / getParamTags', () => {
    it('should add a tag and retrieve it by constructor', () => {
      class MyService {
        constructor(@addParamTag('inject') _db: unknown) {}
      }

      expect(getParamTags(MyService, 0).has('inject')).toBe(true);
    });

    it('should add a tag and retrieve it by instance', () => {
      class MyService {
        constructor(@addParamTag('inject') _db: unknown) {}
      }

      expect(getParamTags(new MyService(null), 0).has('inject')).toBe(true);
    });

    it('should support multiple tags on the same parameter', () => {
      class MyService {
        constructor(
          @addParamTag('inject')
          @addParamTag('optional')
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
          @addParamTag('inject')
          @addParamTag('inject')
          _db: unknown,
        ) {}
      }

      expect(getParamTags(MyService, 0).size).toBe(1);
    });

    it('should not bleed across parameters', () => {
      class MyService {
        constructor(@addParamTag('inject') _db: unknown, _cache: unknown) {}
      }

      expect(getParamTags(MyService, 1).size).toBe(0);
    });
  });
});
