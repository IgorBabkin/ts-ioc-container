import 'reflect-metadata';
import {
  getMetadata,
  getMethodMetadata,
  getParameterMetadata,
  setMetadata,
  setMethodMetadata,
  setParameterMetadata,
} from '../lib';

describe('metadata', () => {
  describe('setMethodMetadata and getMethodMetadata', () => {
    it('should set and get method metadata', () => {
      // Create a class with a decorated method
      class TestClass {
        @setMethodMetadata('test-key', 'test-value')
        testMethod() {}
      }

      // Get the metadata
      const metadata = getMethodMetadata('test-key', new TestClass(), 'testMethod');

      // Verify the metadata was set correctly
      expect(metadata).toBe('test-value');
    });

    it('should return undefined for non-existent method metadata', () => {
      class TestClass {
        testMethod() {}
      }

      // Get metadata that doesn't exist
      const metadata = getMethodMetadata('non-existent', new TestClass(), 'testMethod');

      // Verify it returns undefined
      expect(metadata).toBeUndefined();
    });
  });

  describe('setParameterMetadata and getParameterMetadata', () => {
    it('should set and get parameter metadata', () => {
      // Create a class with a decorated parameter
      class TestClass {
        constructor(@setParameterMetadata('param-key', 'param-value') param: string) {}
      }

      // Get the metadata
      const metadata = getParameterMetadata('param-key', TestClass);

      // Verify the metadata was set correctly
      expect(metadata).toEqual(['param-value']);
    });

    it('should return empty array for non-existent parameter metadata', () => {
      class TestClass {
        constructor(param: string) {}
      }

      // Get metadata that doesn't exist
      const metadata = getParameterMetadata('non-existent', TestClass);

      // Verify it returns an empty array
      expect(metadata).toEqual([]);
    });
  });

  describe('setMetadata and getMetadata', () => {
    it('should set and get class metadata', () => {
      // Create a decorated class
      @setMetadata('class-key', 'class-value')
      class TestClass {}

      // Get the metadata
      const metadata = getMetadata(TestClass, 'class-key');

      // Verify the metadata was set correctly
      expect(metadata).toBe('class-value');
    });
  });
});
