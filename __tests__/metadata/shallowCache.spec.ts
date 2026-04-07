import { describe, it, expect, vi } from 'vitest';
import { shallowCache } from '../../lib';

describe('shallowCache', () => {
  it('calls the method on the first invocation', () => {
    const fn = vi.fn((n: number) => n * 2);

    class Service {
      @shallowCache((...args) => args[0])
      compute(n: number) {
        return fn(n);
      }
    }

    const s = new Service();
    expect(s.compute(3)).toBe(6);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns cached result on repeated call with same key', () => {
    const fn = vi.fn((n: number) => n * 2);

    class Service {
      @shallowCache((...args) => args[0])
      compute(n: number) {
        return fn(n);
      }
    }

    const s = new Service();
    s.compute(3);
    s.compute(3);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls the method again for a different key', () => {
    const fn = vi.fn((n: number) => n * 2);

    class Service {
      @shallowCache((...args) => args[0])
      compute(n: number) {
        return fn(n);
      }
    }

    const s = new Service();
    expect(s.compute(3)).toBe(6);
    expect(s.compute(4)).toBe(8);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('caches independently per instance', () => {
    const fn = vi.fn((n: number) => n * 2);

    class Service {
      @shallowCache((...args) => args[0])
      compute(n: number) {
        return fn(n);
      }
    }

    const a = new Service();
    const b = new Service();
    a.compute(3);
    b.compute(3);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('uses the key returned by getKeyByArgs', () => {
    const fn = vi.fn((x: number, y: number) => x + y);

    class Service {
      @shallowCache((x, y) => `${x}:${y}`)
      add(x: number, y: number) {
        return fn(x, y);
      }
    }

    const s = new Service();
    s.add(1, 2);
    s.add(1, 2);
    s.add(2, 1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('caches falsy return values', () => {
    const fn = vi.fn(() => 0);

    class Service {
      @shallowCache(() => 'key')
      getValue() {
        return fn();
      }
    }

    const s = new Service();
    expect(s.getValue()).toBe(0);
    expect(s.getValue()).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
