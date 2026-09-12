import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { Container, hook, type HookFn, once, SequentialSync } from '../../lib';

const invokeMethod: HookFn = (ctx) => {
  ctx.invokeMethod();
};

describe('once', () => {
  it('calls the method on first invocation', () => {
    const fn = vi.fn(() => 42);

    class Service {
      @once()
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
      @once()
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
      @once()
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
      @once()
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
      @once()
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
      @once()
      doWork(x: number, y: string) {
        received = [x, y];
      }
    }

    new Service().doWork(1, 'hello');
    expect(received).toEqual([1, 'hello']);
  });

  describe('onRepeat callback', () => {
    it('does not fire on the first call', () => {
      const onRepeat = vi.fn();

      class Service {
        @once({ onRepeat })
        getValue() {
          return 1;
        }
      }

      new Service().getValue();
      expect(onRepeat).not.toHaveBeenCalled();
    });

    it('fires on each repeat call with the args passed to that call', () => {
      const onRepeat = vi.fn();

      class Service {
        @once({ onRepeat })
        getValue(_label: string) {
          return 1;
        }
      }

      const s = new Service();
      s.getValue('first');
      s.getValue('second');
      s.getValue('third');

      expect(onRepeat).toHaveBeenCalledTimes(2);
      expect(onRepeat).toHaveBeenNthCalledWith(1, { index: 1, args: ['second'] });
      expect(onRepeat).toHaveBeenNthCalledWith(2, { index: 2, args: ['third'] });
    });
  });

  describe('combined with @hook', () => {
    // `hook(key, ...)` only records metadata for a `HookExecutionStrategy` to read later - it never
    // touches the method descriptor, so it composes with `@once`, which does, regardless
    // of which decorator is declared first.
    it('memoizes the method body even though the hook invokes it on every run', () => {
      const onStartStrategy = new SequentialSync({ key: 'onStart' });
      const fn = vi.fn(() => 42);

      class Service {
        @hook('onStart', invokeMethod)
        @once()
        getValue() {
          return fn();
        }
      }

      const root = new Container({ tags: ['root'] });
      const instance = root.resolve(Service);

      onStartStrategy.execute(instance, { scope: root });
      onStartStrategy.execute(instance, { scope: root });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('memoizes the same way regardless of decorator order', () => {
      const onStartStrategy = new SequentialSync({ key: 'onStart' });
      const fn = vi.fn(() => 42);

      class Service {
        @once()
        @hook('onStart', invokeMethod)
        getValue() {
          return fn();
        }
      }

      const root = new Container({ tags: ['root'] });
      const instance = root.resolve(Service);

      onStartStrategy.execute(instance, { scope: root });
      onStartStrategy.execute(instance, { scope: root });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('caches independently per instance when several instances share the hook', () => {
      const onStartStrategy = new SequentialSync({ key: 'onStart' });
      const fn = vi.fn(() => 42);

      class Service {
        @hook('onStart', invokeMethod)
        @once()
        getValue() {
          return fn();
        }
      }

      const root = new Container({ tags: ['root'] });
      const first = root.resolve(Service);
      const second = root.resolve(Service);

      onStartStrategy.execute(first, { scope: root });
      onStartStrategy.execute(second, { scope: root });

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('returns the cached result through the hook on the repeat run', () => {
      const onStartStrategy = new SequentialSync({ key: 'onStart' });
      let received: unknown;

      class Service {
        @hook('onStart', (context) => {
          received = context.invokeMethod();
        })
        @once()
        getValue() {
          return 42;
        }
      }

      const root = new Container({ tags: ['root'] });
      const instance = root.resolve(Service);

      onStartStrategy.execute(instance, { scope: root });
      onStartStrategy.execute(instance, { scope: root });

      expect(received).toBe(42);
    });
  });
});
