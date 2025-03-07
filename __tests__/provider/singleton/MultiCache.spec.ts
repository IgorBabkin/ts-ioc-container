import 'reflect-metadata';
import { MultiCache, multiCache } from '../../../lib';

describe('MultiCache', () => {
  it('should store and retrieve values', () => {
    const cache = new MultiCache<string, string>();
    cache.setValue('key1', 'value1');
    expect(cache.getValue('key1')).toBe('value1');
  });

  it('should check if value exists', () => {
    const cache = new MultiCache<string, string>();
    expect(cache.hasValue('key1')).toBe(false);
    cache.setValue('key1', 'value1');
    expect(cache.hasValue('key1')).toBe(true);
  });

  it('should handle custom key functions', () => {
    // Test the constructor parameter (getKey function)
    const getKeyFn = (...args: unknown[]) => args.join('-') as string;
    const cache = new MultiCache<string, string>(getKeyFn);

    // Verify the getKey function is stored
    expect(cache.getKey).toBe(getKeyFn);

    // Test with different arguments
    const key = cache.getKey('a', 'b', 'c');
    expect(key).toBe('a-b-c');
  });

  it('should use default key function if none provided', () => {
    const cache = new MultiCache<string, string>();
    expect(cache.getKey()).toBe('1');
  });

  it('should create cache with multiCache factory function', () => {
    const getKeyFn = (...args: unknown[]) => args.join('_') as string;
    const cache = multiCache<string, string>(getKeyFn);

    // Verify it's a MultiCache instance
    expect(cache).toBeInstanceOf(MultiCache);

    // Verify the getKey function is stored
    expect(cache.getKey).toBe(getKeyFn);

    // Test with different arguments
    const key = cache.getKey('x', 'y', 'z');
    expect(key).toBe('x_y_z');
  });
});
