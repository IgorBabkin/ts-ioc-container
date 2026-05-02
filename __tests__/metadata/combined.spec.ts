import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import {
  once,
  throttle,
  shallowCache,
  debounce,
  handleError,
  HandleErrorParams,
  onConstruct,
  AddOnConstructHookModule,
  Container,
  IHookContext,
  HookFn,
} from '../../lib';

const execute: HookFn = (ctx: IHookContext) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

// ─── @onConstruct compatibility ───────────────────────────────────────────────

describe('@onConstruct + method decorators', () => {
  it('@onConstruct + @once: hook fires once; manual calls are no-ops', () => {
    const fn = vi.fn();

    class Service {
      initialized = false;

      @onConstruct(execute)
      @once()
      init() {
        fn();
        this.initialized = true;
      }
    }

    const container = new Container().useModule(new AddOnConstructHookModule());
    const s = container.resolve(Service);

    expect(s.initialized).toBe(true);

    // Subsequent manual calls go through @once and are suppressed
    s.init();
    s.init();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('@onConstruct + @throttle: hook fires on construction; subsequent calls within window are blocked', () => {
    vi.useFakeTimers();

    const calls: string[] = [];

    class Service {
      @onConstruct(execute)
      @throttle(100)
      init() {
        calls.push('ran');
      }
    }

    const container = new Container().useModule(new AddOnConstructHookModule());
    container.resolve(Service);

    expect(calls).toEqual(['ran']); // hook fired, throttle allowed it

    // Calling manually within the throttle window is blocked
    const s = container.resolve(Service);
    s.init(); // throttled — within window of hook call above? No, new instance, independent state

    // Each instance has independent throttle state
    expect(calls).toEqual(['ran', 'ran']); // second resolve triggered hook again

    vi.useRealTimers();
  });

  it('@onConstruct + @shallowCache: hook fires and result is cached; same-args manual calls return cache', () => {
    const fn = vi.fn((x: number) => x * 10);

    class Service {
      @onConstruct(execute)
      @shallowCache((...args) => args[0])
      compute(x: number) {
        return fn(x);
      }
    }

    const container = new Container().useModule(new AddOnConstructHookModule());
    // onConstruct calls compute() with no args (x = undefined)
    const s = container.resolve(Service);

    expect(fn).toHaveBeenCalledTimes(1);

    // Calling with the same undefined key hits the cache
    s.compute(undefined as any);
    expect(fn).toHaveBeenCalledTimes(1);

    // Different arg misses cache
    s.compute(5);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('@onConstruct + @handleError: errors thrown in init method are caught; constructor does not throw', () => {
    const errors: unknown[] = [];
    const handler: HandleErrorParams = (e) => errors.push(e);

    class Service {
      @onConstruct(execute)
      @handleError(handler)
      init() {
        throw new Error('init failed');
      }
    }

    const container = new Container().useModule(new AddOnConstructHookModule());

    // Resolving should not propagate the error because @handleError catches it
    expect(() => container.resolve(Service)).not.toThrow();
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('init failed');
  });

  it('@onConstruct + @debounce: hook fires and schedules deferred execution', () => {
    vi.useFakeTimers();

    const fn = vi.fn();

    class Service {
      @onConstruct(execute)
      @debounce(100)
      init() {
        fn();
      }
    }

    const container = new Container().useModule(new AddOnConstructHookModule());
    container.resolve(Service);

    expect(fn).not.toHaveBeenCalled(); // debounce deferred it

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

// ─── Pure method decorator combinations ───────────────────────────────────────

describe('combined method decorators', () => {
  describe('@once (outer) + @handleError (inner)', () => {
    it('error from inner method is handled; once caches the undefined result', () => {
      const errors: unknown[] = [];
      const handler: HandleErrorParams = (e) => errors.push(e);
      const fn = vi.fn(() => {
        throw new Error('boom');
      });

      class Service {
        @once()
        @handleError(handler)
        fetch() {
          return fn();
        }
      }

      const s = new Service();
      s.fetch(); // handleError catches, returns undefined; once caches undefined
      s.fetch(); // once returns cached undefined — fn and handler not called again
      s.fetch();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(errors).toHaveLength(1);
    });
  });

  describe('@handleError (outer) + @once (inner)', () => {
    it('error propagates through once (no caching); handleError catches on every call', () => {
      const errors: unknown[] = [];
      const handler: HandleErrorParams = (e) => errors.push(e);
      const fn = vi.fn(() => {
        throw new Error('boom');
      });

      class Service {
        @handleError(handler)
        @once()
        fetch() {
          return fn();
        }
      }

      const s = new Service();
      s.fetch(); // once calls fn (throws), error propagates out of once, handleError catches
      s.fetch(); // once has no cached value, calls fn again
      s.fetch();

      // fn called every time because once never cached (exception before cacheMap.set)
      expect(fn).toHaveBeenCalledTimes(3);
      expect(errors).toHaveLength(3);
    });
  });

  describe('@shallowCache (outer) + @handleError (inner)', () => {
    it('error on cache miss is caught; undefined is cached so subsequent same-key calls skip the method', () => {
      const errors: unknown[] = [];
      const handler: HandleErrorParams = (e) => errors.push(e);
      const fn = vi.fn((id: number) => {
        if (id === 99) throw new Error('not found');
        return id * 2;
      });

      class Service {
        @shallowCache((...args) => args[0])
        @handleError(handler)
        load(id: number) {
          return fn(id);
        }
      }

      const s = new Service();
      expect(s.load(1)).toBe(2); // succeeds, cached
      expect(s.load(1)).toBe(2); // cache hit
      s.load(99); // handleError catches, returns undefined; shallowCache caches undefined for key 99
      s.load(99); // cache hit — fn not called again

      expect(fn).toHaveBeenCalledTimes(2); // once for id=1, once for id=99
      expect(errors).toHaveLength(1);
    });
  });

  describe('@throttle (outer) + @handleError (inner)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('first call may throw and be caught; calls within window are blocked by throttle', () => {
      const errors: unknown[] = [];
      const handler: HandleErrorParams = (e) => errors.push(e);

      let shouldThrow = true;
      const fn = vi.fn(() => {
        if (shouldThrow) throw new Error('transient');
        return 42;
      });

      class Service {
        @throttle(100)
        @handleError(handler)
        fetch() {
          return fn();
        }
      }

      const s = new Service();
      s.fetch(); // handleError catches, throttle records the call time
      s.fetch(); // within window — throttle blocks (fn not called)

      expect(fn).toHaveBeenCalledTimes(1);
      expect(errors).toHaveLength(1);

      shouldThrow = false;
      vi.advanceTimersByTime(100);
      expect(s.fetch()).toBe(42); // throttle window expired, succeeds
      expect(fn).toHaveBeenCalledTimes(2);
      expect(errors).toHaveLength(1); // no new error
    });
  });

  describe('@shallowCache (outer) + @once (inner)', () => {
    it('once dominates: once caches the first result for all subsequent keys', () => {
      const fn = vi.fn((x: number) => x * 10);

      class Service {
        @shallowCache((...args) => args[0])
        @once()
        compute(x: number) {
          return fn(x);
        }
      }

      const s = new Service();
      expect(s.compute(1)).toBe(10); // once calls fn(1)=10, caches it; shallowCache caches key=1→10
      expect(s.compute(1)).toBe(10); // shallowCache hit for key=1
      expect(s.compute(2)).toBe(10); // shallowCache miss for key=2, but once returns cached 10
      expect(s.compute(3)).toBe(10); // shallowCache miss for key=3, once still returns cached 10

      expect(fn).toHaveBeenCalledTimes(1); // once prevents any further calls
    });
  });
});
