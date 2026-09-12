import 'reflect-metadata';
import {
  append,
  Container,
  hook,
  HookContext,
  type HookFn,
  type IContainer,
  ParallelAsync,
  SequentialAsync,
  SequentialSync,
} from '../../lib';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const record =
  (log: string[], label: string, ms?: number): HookFn =>
  async () => {
    if (ms !== undefined) {
      await sleep(ms);
    }
    log.push(label);
  };

const recordSync =
  (log: string[], label: string): HookFn =>
  () => {
    log.push(label);
  };

describe('HookExecutionStrategy', () => {
  describe('SequentialSync', () => {
    it('runs members and their hooks in declaration order before execute returns', () => {
      const log: string[] = [];

      class Service {
        @hook('start', append(recordSync(log, 'a1'), recordSync(log, 'a2')))
        a() {}

        @hook('start', append(recordSync(log, 'b1')))
        b() {}
      }

      const scope = new Container();

      new SequentialSync({ key: 'start' }).execute(scope.resolve(Service), { scope });

      expect(log).toEqual(['a1', 'a2', 'b1']);
    });

    it('starts a promise-returning hook but does not wait for it', () => {
      const log: string[] = [];

      class Service {
        @hook('start', append(record(log, 'async', 1), recordSync(log, 'sync')))
        a() {}
      }

      const scope = new Container();

      new SequentialSync({ key: 'start' }).execute(scope.resolve(Service), { scope });

      expect(log).toEqual(['sync']);
    });
  });

  describe('SequentialAsync', () => {
    it('awaits a member before starting the next one', async () => {
      const log: string[] = [];

      class Service {
        @hook('start', append(record(log, 'slow', 10)))
        a() {}

        @hook('start', append(record(log, 'fast', 1)))
        b() {}
      }

      const scope = new Container();

      new SequentialAsync({ key: 'start', methodStrategy: 'sequential' }).execute(scope.resolve(Service), { scope });

      await vi.waitFor(() => expect(log).toEqual(['slow', 'fast']));
    });

    it('stays synchronous until a hook returns a promise', () => {
      const log: string[] = [];

      class Service {
        @hook('start', append(recordSync(log, 'a1'), recordSync(log, 'a2')))
        a() {}

        @hook('start', append(recordSync(log, 'b1'), record(log, 'b2', 0), recordSync(log, 'b3')))
        b() {}

        @hook('start', append(recordSync(log, 'c1')))
        c() {}
      }

      const scope = new Container();

      new SequentialAsync({ key: 'start', methodStrategy: 'sequential' }).execute(scope.resolve(Service), { scope });

      // everything ahead of the first async hook has already run; the rest waits on it
      expect(log).toEqual(['a1', 'a2', 'b1']);
    });

    it('starts the hooks of one member at once with methodStrategy parallel', async () => {
      const log: string[] = [];

      class Service {
        @hook('start', append(record(log, 'slow', 10), record(log, 'fast', 1)))
        a() {}
      }

      const scope = new Container();

      new SequentialAsync({ key: 'start', methodStrategy: 'parallel' }).execute(scope.resolve(Service), { scope });

      await vi.waitFor(() => expect(log).toEqual(['fast', 'slow']));
    });
  });

  describe('ParallelAsync', () => {
    it('starts every member without waiting for the previous one', async () => {
      const log: string[] = [];

      class Service {
        @hook('start', append(record(log, 'slow', 10)))
        a() {}

        @hook('start', append(record(log, 'fast', 1)))
        b() {}
      }

      const scope = new Container();

      new ParallelAsync({ key: 'start', methodStrategy: 'sequential' }).execute(scope.resolve(Service), { scope });

      await vi.waitFor(() => expect(log).toEqual(['fast', 'slow']));
    });

    it('keeps the hooks of one member in order unless methodStrategy is parallel', async () => {
      const log: string[] = [];

      class Service {
        @hook('start', append(record(log, 'slow', 10), record(log, 'fast', 1)))
        a() {}
      }

      const scope = new Container();

      new ParallelAsync({ key: 'start', methodStrategy: 'sequential' }).execute(scope.resolve(Service), { scope });

      await vi.waitFor(() => expect(log).toEqual(['slow', 'fast']));
    });
  });

  describe('onError', () => {
    const failure = new Error('boom');

    class Broken {
      @hook(
        'start',
        append(() => {
          throw failure;
        }),
      )
      sync() {}

      @hook('start', append(() => Promise.reject(failure)))
      async() {}
    }

    it('receives what a sync hook threw, with the scope, from every strategy', () => {
      const scope = new Container();
      const reported: [IContainer, unknown][] = [];
      const onError = (s: IContainer) => (ex: unknown) => {
        reported.push([s, ex]);
      };

      for (const strategy of [
        new SequentialSync({ key: 'start', onError, predicate: (m) => m === 'sync' }),
        new SequentialAsync({ key: 'start', methodStrategy: 'sequential', onError, predicate: (m) => m === 'sync' }),
        new ParallelAsync({ key: 'start', methodStrategy: 'sequential', onError, predicate: (m) => m === 'sync' }),
      ]) {
        strategy.execute(scope.resolve(Broken), { scope });
      }

      expect(reported).toEqual([
        [scope, failure],
        [scope, failure],
        [scope, failure],
      ]);
    });

    it('receives what an async hook rejected with from the async strategies', async () => {
      const scope = new Container();
      const reported: unknown[] = [];
      const onError = () => (ex: unknown) => {
        reported.push(ex);
      };

      for (const strategy of [
        new SequentialAsync({ key: 'start', methodStrategy: 'sequential', onError, predicate: (m) => m === 'async' }),
        new ParallelAsync({ key: 'start', methodStrategy: 'sequential', onError, predicate: (m) => m === 'async' }),
      ]) {
        strategy.execute(scope.resolve(Broken), { scope });
      }

      await vi.waitFor(() => expect(reported).toEqual([failure, failure]));
    });

    it('drops the failure when no handler is set', () => {
      const scope = new Container();

      expect(() =>
        new SequentialSync({ key: 'start', predicate: (m) => m === 'sync' }).execute(scope.resolve(Broken), { scope }),
      ).not.toThrow();
    });
  });

  describe('options', () => {
    class Service {
      received: unknown[][] = [];

      @hook(
        'start',
        append((ctx) => {
          ctx.invokeMethod({ args: ctx.getInitialArgs() });
        }),
      )
      a(...args: unknown[]) {
        this.received.push(args);
      }

      @hook(
        'start',
        append((ctx) => {
          ctx.invokeMethod({ args: ctx.getInitialArgs() });
        }),
      )
      b(...args: unknown[]) {
        this.received.push(args);
      }
    }

    it('applies the createExecutionContext, mapExecutionContext and predicate set on the strategy', () => {
      const scope = new Container();
      const instance = scope.resolve(Service);

      new SequentialSync({
        key: 'start',
        createExecutionContext: (target, s, methodName) =>
          new HookContext(target, s, methodName).setInitialArgs('created'),
        mapExecutionContext: (ctx) => ctx.setInitialArgs(...ctx.getInitialArgs(), 'mapped'),
        predicate: (methodName) => methodName === 'a',
      }).execute(instance, { scope });

      expect(instance.received).toEqual([['created', 'mapped']]);
    });

    it('lets a call override the options set on the strategy', () => {
      const scope = new Container();
      const instance = scope.resolve(Service);

      new SequentialSync({ key: 'start', predicate: (methodName) => methodName === 'a' }).execute(instance, {
        scope,
        predicate: (methodName) => methodName === 'b',
        mapExecutionContext: (ctx) => ctx.setInitialArgs('overridden'),
      });

      expect(instance.received).toEqual([['overridden']]);
    });

    it('reads a class’s hook metadata once and reuses it on later runs', () => {
      const scope = new Container();
      const strategy = new SequentialSync({ key: 'start' });
      const first = scope.resolve(Service);
      const second = scope.resolve(Service);
      const getOwnMetadata = vi.spyOn(Reflect, 'getOwnMetadata');

      strategy.execute(first, { scope });
      const reads = getOwnMetadata.mock.calls.length;
      strategy.execute(second, { scope });

      expect(getOwnMetadata.mock.calls.length).toBe(reads);
      expect([first.received.length, second.received.length]).toEqual([2, 2]);

      getOwnMetadata.mockRestore();
    });
  });
});
