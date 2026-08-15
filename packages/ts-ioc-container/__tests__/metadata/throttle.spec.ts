import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { throttle } from '../../lib';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the method immediately on first invocation', () => {
    const calls: number[] = [];

    class Service {
      @throttle(100)
      doWork(n: number) {
        calls.push(n);
      }
    }

    const s = new Service();
    s.doWork(1);
    expect(calls).toEqual([1]);
  });

  it('ignores calls within the throttle window', () => {
    const calls: number[] = [];

    class Service {
      @throttle(100)
      doWork(n: number) {
        calls.push(n);
      }
    }

    const s = new Service();
    s.doWork(1);
    s.doWork(2);
    s.doWork(3);
    expect(calls).toEqual([1]);
  });

  it('allows the method to be called again after the window expires', () => {
    const calls: number[] = [];

    class Service {
      @throttle(100)
      doWork(n: number) {
        calls.push(n);
      }
    }

    const s = new Service();
    s.doWork(1);
    vi.advanceTimersByTime(100);
    s.doWork(2);
    expect(calls).toEqual([1, 2]);
  });

  it('throttles independently per instance', () => {
    const calls: string[] = [];

    class Service {
      constructor(private readonly name: string) {}

      @throttle(100)
      doWork() {
        calls.push(this.name);
      }
    }

    const a = new Service('a');
    const b = new Service('b');
    a.doWork();
    b.doWork();
    a.doWork(); // throttled
    b.doWork(); // throttled
    expect(calls).toEqual(['a', 'b']);
  });

  it('passes arguments to the method', () => {
    let received: unknown[] = [];

    class Service {
      @throttle(100)
      doWork(x: number, y: string) {
        received = [x, y];
      }
    }

    const s = new Service();
    s.doWork(42, 'hello');
    expect(received).toEqual([42, 'hello']);
  });

  it('preserves the return value of the first call', () => {
    class Service {
      @throttle(100)
      getValue(n: number) {
        return n * 2;
      }
    }

    const s = new Service();
    expect(s.getValue(5)).toBe(10);
    expect(s.getValue(6)).toBeUndefined(); // throttled
  });
});
