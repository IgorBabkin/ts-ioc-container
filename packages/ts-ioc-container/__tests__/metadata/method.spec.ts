import { addMethodLabel, getMethodLabels, addMethodTag, getMethodTags } from '../../lib';

describe('method metadata', () => {
  describe('addMethodLabel / getMethodLabels', () => {
    it('should add a label and retrieve it by constructor', () => {
      class MyService {
        @addMethodLabel('env', 'production')
        start() {}
      }

      expect(getMethodLabels(MyService, 'start').get('env')).toBe('production');
    });

    it('should add a label and retrieve it by instance', () => {
      class MyService {
        @addMethodLabel('env', 'production')
        start() {}
      }

      expect(getMethodLabels(new MyService(), 'start').get('env')).toBe('production');
    });

    it('should support multiple labels on the same method', () => {
      class MyService {
        @addMethodLabel('region', 'us-east')
        @addMethodLabel('env', 'staging')
        start() {}
      }

      const labels = getMethodLabels(MyService, 'start');
      expect(labels.get('env')).toBe('staging');
      expect(labels.get('region')).toBe('us-east');
    });

    it('should return empty map when no labels are set', () => {
      class MyService {
        start() {}
      }

      expect(getMethodLabels(MyService, 'start').size).toBe(0);
    });

    it('should not bleed across methods', () => {
      class MyService {
        @addMethodLabel('env', 'production')
        start() {}
        stop() {}
      }

      expect(getMethodLabels(MyService, 'stop').size).toBe(0);
    });
  });

  describe('addMethodTag / getMethodTags', () => {
    it('should add a tag and retrieve it by constructor', () => {
      class MyService {
        @addMethodTag('deprecated')
        start() {}
      }

      expect(getMethodTags(MyService, 'start').has('deprecated')).toBe(true);
    });

    it('should add a tag and retrieve it by instance', () => {
      class MyService {
        @addMethodTag('deprecated')
        start() {}
      }

      expect(getMethodTags(new MyService(), 'start').has('deprecated')).toBe(true);
    });

    it('should support multiple tags', () => {
      class MyService {
        @addMethodTag('deprecated')
        @addMethodTag('public')
        start() {}
      }

      const tags = getMethodTags(MyService, 'start');
      expect(tags.has('deprecated')).toBe(true);
      expect(tags.has('public')).toBe(true);
    });

    it('should return empty set when no tags are set', () => {
      class MyService {
        start() {}
      }

      expect(getMethodTags(MyService, 'start').size).toBe(0);
    });

    it('should not duplicate tags', () => {
      class MyService {
        @addMethodTag('deprecated')
        @addMethodTag('deprecated')
        start() {}
      }

      expect(getMethodTags(MyService, 'start').size).toBe(1);
    });

    it('should not bleed across methods', () => {
      class MyService {
        @addMethodTag('deprecated')
        start() {}
        stop() {}
      }

      expect(getMethodTags(MyService, 'stop').size).toBe(0);
    });
  });
});
