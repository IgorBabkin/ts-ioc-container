import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { debounce } from '../../lib';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call the method immediately', () => {
    const calls: number[] = [];

    class Service {
      @debounce(100)
      doWork(n: number) {
        calls.push(n);
      }
    }

    const s = new Service();
    s.doWork(1);
    expect(calls).toEqual([]);
  });

  it('calls the method after the delay', () => {
    const calls: number[] = [];

    class Service {
      @debounce(100)
      doWork(n: number) {
        calls.push(n);
      }
    }

    const s = new Service();
    s.doWork(1);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1]);
  });

  it('resets the timer on each call, only the last fires', () => {
    const calls: number[] = [];

    class Service {
      @debounce(100)
      doWork(n: number) {
        calls.push(n);
      }
    }

    const s = new Service();
    s.doWork(1);
    vi.advanceTimersByTime(50);
    s.doWork(2);
    vi.advanceTimersByTime(50);
    s.doWork(3);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([3]);
  });

  it('fires again after a new call following the settled window', () => {
    const calls: number[] = [];

    class Service {
      @debounce(100)
      doWork(n: number) {
        calls.push(n);
      }
    }

    const s = new Service();
    s.doWork(1);
    vi.advanceTimersByTime(100);
    s.doWork(2);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1, 2]);
  });

  it('debounces independently per instance', () => {
    const calls: string[] = [];

    class Service {
      constructor(private readonly name: string) {}

      @debounce(100)
      doWork() {
        calls.push(this.name);
      }
    }

    const a = new Service('a');
    const b = new Service('b');
    a.doWork();
    b.doWork();
    vi.advanceTimersByTime(100);
    expect(calls).toEqual(['a', 'b']);
  });

  it('passes the latest arguments to the method', () => {
    let received: unknown[] = [];

    class Service {
      @debounce(100)
      doWork(x: number, y: string) {
        received = [x, y];
      }
    }

    const s = new Service();
    s.doWork(1, 'first');
    s.doWork(2, 'second');
    vi.advanceTimersByTime(100);
    expect(received).toEqual([2, 'second']);
  });
});
