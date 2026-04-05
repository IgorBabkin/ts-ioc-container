import { classLabel, getClassLabels, classTag, getClassTags, getClassMeta, classMeta } from '../../lib';

describe('getClassMeta', () => {
  it('should resolve metadata from a constructor', () => {
    @classMeta('role', () => 'service')
    class MyService {}

    expect(getClassMeta(MyService, 'role')).toBe('service');
  });

  it('should resolve metadata from an instance', () => {
    @classMeta('role', () => 'service')
    class MyService {}

    expect(getClassMeta(new MyService(), 'role')).toBe('service');
  });

  it('should return undefined when no metadata is set', () => {
    class MyService {}

    expect(getClassMeta(MyService, 'role')).toBeUndefined();
  });
});

describe('class metadata', () => {
  describe('classLabel / getClassLabels', () => {
    it('should add a label and retrieve it', () => {
      @classLabel('env', 'production')
      class MyService {}

      const labels = getClassLabels(MyService);
      expect(labels.get('env')).toBe('production');
    });

    it('should support multiple labels', () => {
      @classLabel('region', 'us-east')
      @classLabel('env', 'staging')
      class MyService {}

      const labels = getClassLabels(MyService);
      expect(labels.get('env')).toBe('staging');
      expect(labels.get('region')).toBe('us-east');
    });

    it('should return empty map when no labels are set', () => {
      class MyService {}

      expect(getClassLabels(MyService).size).toBe(0);
    });

    it('should retrieve labels from an instance', () => {
      @classLabel('env', 'production')
      class MyService {}

      expect(getClassLabels(new MyService()).get('env')).toBe('production');
    });

    it('should overwrite label with same key', () => {
      @classLabel('env', 'production')
      @classLabel('env', 'staging')
      class MyService {}

      const labels = getClassLabels(MyService);
      expect(labels.get('env')).toBe('production');
    });
  });

  describe('classTag / getTags', () => {
    it('should add a tag and retrieve it', () => {
      @classTag('singleton')
      class MyService {}

      expect(getClassTags(MyService).has('singleton')).toBe(true);
    });

    it('should support multiple tags', () => {
      @classTag('singleton')
      @classTag('service')
      class MyService {}

      const tags = getClassTags(MyService);
      expect(tags.has('singleton')).toBe(true);
      expect(tags.has('service')).toBe(true);
    });

    it('should return empty set when no tags are set', () => {
      class MyService {}

      expect(getClassTags(MyService).size).toBe(0);
    });

    it('should retrieve tags from an instance', () => {
      @classTag('singleton')
      class MyService {}

      expect(getClassTags(new MyService()).has('singleton')).toBe(true);
    });

    it('should not duplicate tags', () => {
      @classTag('singleton')
      @classTag('singleton')
      class MyService {}

      expect(getClassTags(MyService).size).toBe(1);
    });
  });
});
