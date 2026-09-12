import 'reflect-metadata';
import {
  HookCollector,
  Container,
  hook,
  HookContext,
  type HookFn,
  type IContainer,
  parallel,
  sequential,
  toTask,
} from '../../lib';
import { perform, runParallel, runSequential, runSync } from './runners';

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

describe('HookCollector', () => {
  describe('the collected model', () => {
    it('returns one action per decorated member, in declaration order', () => {
      const hookA: HookFn = () => {};
      const hookB: HookFn = () => {};

      class Service {
        @hook('start', hookA)
        a() {}

        @hook('start', hookB)
        b() {}

        @hook('other', hookA)
        c() {}
      }

      const scope = new Container();
      const instance = scope.resolve(Service);

      const actions = new HookCollector({ key: 'start' }).getActions(instance, { scope });

      expect(actions.map(({ context, hook: fn }) => [context.methodName, fn])).toEqual([
        ['a', hookA],
        ['b', hookB],
      ]);
    });

    it('binds each action to a context over the target, the scope and the member', () => {
      class Service {
        @hook('start', () => {})
        a() {}
      }

      const scope = new Container();
      const instance = scope.resolve(Service);

      const [action] = new HookCollector({ key: 'start' }).getActions(instance, { scope });

      expect(action.context.instance).toBe(instance);
      expect(action.context.scope).toBe(scope);
      expect(action.context.methodName).toBe('a');
    });

    it('runs nothing while collecting — the caller performs the actions', () => {
      const log: string[] = [];

      class Service {
        @hook('start', recordSync(log, 'a'))
        a() {}
      }

      const scope = new Container();
      const actions = new HookCollector({ key: 'start' }).getActions(scope.resolve(Service), { scope });

      expect(log).toEqual([]);

      actions.map(toTask).forEach((task) => task());

      expect(log).toEqual(['a']);
    });

    it('returns no actions for a target which declares none under the key', () => {
      class Service {
        @hook('other', () => {})
        a() {}
      }

      const scope = new Container();

      expect(new HookCollector({ key: 'start' }).getActions(scope.resolve(Service), { scope })).toEqual([]);
    });

    it('resolves a hook class against the scope when the action is performed', () => {
      const log: string[] = [];

      class Greet {
        execute() {
          log.push('greeted');
        }
      }

      class Service {
        @hook('start', Greet)
        a() {}
      }

      const scope = new Container();
      const [action] = new HookCollector({ key: 'start' }).getActions(scope.resolve(Service), { scope });

      expect(log).toEqual([]);

      toTask(action)();

      expect(log).toEqual(['greeted']);
    });
  });

  describe('running the collected actions', () => {
    it('runs actions and their hooks in declaration order when the caller never awaits', () => {
      const log: string[] = [];

      class Service {
        @hook('start', sequential(recordSync(log, 'a1'), recordSync(log, 'a2')))
        a() {}

        @hook('start', recordSync(log, 'b1'))
        b() {}
      }

      const scope = new Container();

      perform(runSync(), new HookCollector({ key: 'start' }))(scope.resolve(Service), { scope });

      expect(log).toEqual(['a1', 'a2', 'b1']);
    });

    it('starts a promise-returning action but does not wait for it when the caller never awaits', () => {
      const log: string[] = [];

      class Service {
        @hook('start', record(log, 'async', 1))
        a() {}

        @hook('start', recordSync(log, 'sync'))
        b() {}
      }

      const scope = new Container();

      perform(runSync(), new HookCollector({ key: 'start' }))(scope.resolve(Service), { scope });

      expect(log).toEqual(['sync']);
    });

    it('awaits an action before starting the next one when the caller runs them in order', async () => {
      const log: string[] = [];

      class Service {
        @hook('start', record(log, 'slow', 10))
        a() {}

        @hook('start', record(log, 'fast', 1))
        b() {}
      }

      const scope = new Container();

      perform(runSequential(), new HookCollector({ key: 'start' }))(scope.resolve(Service), { scope });

      await vi.waitFor(() => expect(log).toEqual(['slow', 'fast']));
    });

    it('stays synchronous until a hook returns a promise', () => {
      const log: string[] = [];

      class Service {
        @hook('start', sequential(recordSync(log, 'a1'), recordSync(log, 'a2')))
        a() {}

        @hook('start', sequential(recordSync(log, 'b1'), record(log, 'b2', 0), recordSync(log, 'b3')))
        b() {}

        @hook('start', recordSync(log, 'c1'))
        c() {}
      }

      const scope = new Container();

      perform(runSequential(), new HookCollector({ key: 'start' }))(scope.resolve(Service), { scope });

      // everything ahead of the first async hook has already run; the rest waits on it
      expect(log).toEqual(['a1', 'a2', 'b1']);
    });

    it('starts the hooks of one member at once when they are combined with parallel', async () => {
      const log: string[] = [];

      class Service {
        @hook('start', parallel(record(log, 'slow', 10), record(log, 'fast', 1)))
        a() {}
      }

      const scope = new Container();

      perform(runSequential(), new HookCollector({ key: 'start' }))(scope.resolve(Service), { scope });

      await vi.waitFor(() => expect(log).toEqual(['fast', 'slow']));
    });

    it('starts every action without waiting for the previous one when the caller runs them at once', async () => {
      const log: string[] = [];

      class Service {
        @hook('start', record(log, 'slow', 10))
        a() {}

        @hook('start', record(log, 'fast', 1))
        b() {}
      }

      const scope = new Container();

      perform(runParallel(), new HookCollector({ key: 'start' }))(scope.resolve(Service), { scope });

      await vi.waitFor(() => expect(log).toEqual(['fast', 'slow']));
    });

    it('keeps the hooks of one member in order when they are combined with sequential', async () => {
      const log: string[] = [];

      class Service {
        @hook('start', sequential(record(log, 'slow', 10), record(log, 'fast', 1)))
        a() {}
      }

      const scope = new Container();

      perform(runParallel(), new HookCollector({ key: 'start' }))(scope.resolve(Service), { scope });

      await vi.waitFor(() => expect(log).toEqual(['slow', 'fast']));
    });
  });

  describe('failures are the caller’s to handle', () => {
    const failure = new Error('boom');

    class Broken {
      @hook('start', () => {
        throw failure;
      })
      sync() {}

      @hook('start', () => Promise.reject(failure))
      async() {}
    }

    it('lets a sync hook throw out of the call which performed it', () => {
      const scope = new Container();
      const onlySync = new HookCollector({ key: 'start', predicate: (m) => m === 'sync' });

      expect(() =>
        onlySync
          .getActions(scope.resolve(Broken), { scope })
          .map(toTask)
          .forEach((task) => task()),
      ).toThrow(failure);
    });

    it('reports what a sync hook threw, with the scope, to a caller which catches it', () => {
      const scope = new Container();
      const reported: [IContainer, unknown][] = [];
      const onError = (s: IContainer) => (ex: unknown) => {
        reported.push([s, ex]);
      };
      const onlySync = new HookCollector({ key: 'start', predicate: (m) => m === 'sync' });

      for (const run of [runSync(onError), runSequential(onError), runParallel(onError)]) {
        perform(run, onlySync)(scope.resolve(Broken), { scope });
      }

      expect(reported).toEqual([
        [scope, failure],
        [scope, failure],
        [scope, failure],
      ]);
    });

    it('reports what an async hook rejected with to a caller which awaits it', async () => {
      const scope = new Container();
      const reported: unknown[] = [];
      const onError = () => (ex: unknown) => {
        reported.push(ex);
      };
      const onlyAsync = new HookCollector({ key: 'start', predicate: (m) => m === 'async' });

      for (const run of [runSequential(onError), runParallel(onError)]) {
        perform(run, onlyAsync)(scope.resolve(Broken), { scope });
      }

      await vi.waitFor(() => expect(reported).toEqual([failure, failure]));
    });
  });

  describe('options', () => {
    class Service {
      received: unknown[][] = [];

      @hook('start', (ctx) => {
        ctx.invokeMethod({ args: ctx.getInitialArgs() });
      })
      a(...args: unknown[]) {
        this.received.push(args);
      }

      @hook('start', (ctx) => {
        ctx.invokeMethod({ args: ctx.getInitialArgs() });
      })
      b(...args: unknown[]) {
        this.received.push(args);
      }
    }

    it('applies the createExecutionContext, mapExecutionContext and predicate set on the collector', () => {
      const scope = new Container();
      const instance = scope.resolve(Service);

      const collect = new HookCollector({
        key: 'start',
        createExecutionContext: (target, s, methodName) =>
          new HookContext(target, s, methodName).setInitialArgs('created'),
        mapExecutionContext: (ctx) => ctx.setInitialArgs(...ctx.getInitialArgs(), 'mapped'),
        predicate: (methodName) => methodName === 'a',
      });

      perform(runSync(), collect)(instance, { scope });

      expect(instance.received).toEqual([['created', 'mapped']]);
    });

    it('lets a call override the options set on the collector', () => {
      const scope = new Container();
      const instance = scope.resolve(Service);
      const collect = new HookCollector({ key: 'start', predicate: (methodName) => methodName === 'a' });

      perform(runSync(), collect)(instance, {
        scope,
        predicate: (methodName) => methodName === 'b',
        mapExecutionContext: (ctx) => ctx.setInitialArgs('overridden'),
      });

      expect(instance.received).toEqual([['overridden']]);
    });

    it('reads a class’s hook metadata once and reuses it on later collections', () => {
      const scope = new Container();
      const collect = new HookCollector({ key: 'start' });
      const first = scope.resolve(Service);
      const second = scope.resolve(Service);
      const getOwnMetadata = vi.spyOn(Reflect, 'getOwnMetadata');

      const run = perform(runSync(), collect);
      run(first, { scope });
      const reads = getOwnMetadata.mock.calls.length;
      run(second, { scope });

      expect(getOwnMetadata.mock.calls.length).toBe(reads);
      expect([first.received.length, second.received.length]).toEqual([2, 2]);

      getOwnMetadata.mockRestore();
    });
  });
});
