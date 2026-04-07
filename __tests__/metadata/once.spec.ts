import { describe, it, expect, vi } from 'vitest';
import { once } from '../../lib';

describe('once', () => {
  it('calls the method on first invocation', () => {
    const fn = vi.fn(() => 42);

    class Service {
      @once
      getValue() {
        return fn();
      }
    }

    expect(new Service().getValue()).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns cached result on subsequent calls', () => {
    const fn = vi.fn(() => 42);

    class Service {
      @once
      getValue() {
        return fn();
      }
    }

    const s = new Service();
    s.getValue();
    s.getValue();
    s.getValue();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('caches undefined for void methods', () => {
    const fn = vi.fn();

    class Service {
      @once
      doWork() {
        fn();
      }
    }

    const s = new Service();
    expect(s.doWork()).toBeUndefined();
    s.doWork();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('caches falsy return values', () => {
    const fn = vi.fn(() => 0);

    class Service {
      @once
      getValue() {
        return fn();
      }
    }

    const s = new Service();
    expect(s.getValue()).toBe(0);
    expect(s.getValue()).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('caches independently per instance', () => {
    const fn = vi.fn(() => 42);

    class Service {
      @once
      getValue() {
        return fn();
      }
    }

    const a = new Service();
    const b = new Service();
    a.getValue();
    b.getValue();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('passes arguments to the first call', () => {
    let received: unknown[] = [];

    class Service {
      @once
      doWork(x: number, y: string) {
        received = [x, y];
      }
    }

    new Service().doWork(1, 'hello');
    expect(received).toEqual([1, 'hello']);
  });
});
