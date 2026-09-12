import 'reflect-metadata';
import {
  Container,
  type HookFn,
  type IContainer,
  hook,
  HookCollector,
  type HookType,
  inject,
  OnConstructModule,
  Registration as R,
  runInOrder,
  toTask,
  type HookRunner,
} from '../../lib';

const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

const executeAsync: HookFn = async (ctx) => {
  await ctx.invokeMethod({ args: ctx.resolveArgs() });
};

// The library ships no construct decorator: the key, the decorator which writes
// it and the collector which reads it are all ours.
const onConstruct = (fn: HookType) => hook('onConstruct', fn);
const onConstructHooks = new HookCollector({ key: 'onConstruct' });

// The module collects the hooks; running them is ours. This runner keeps the
// actions in declaration order, stays synchronous until one returns a promise,
// and reports a throw and a rejection alike.
const run =
  (onError: (scope: IContainer) => (ex: unknown) => void = () => () => {}): HookRunner =>
  (actions, { scope }) => {
    try {
      runInOrder(actions.map(toTask))?.catch(onError(scope));
    } catch (ex) {
      onError(scope)(ex);
    }
  };

describe('onConstruct', function () {
  it('should run initialization method after dependencies are resolved', function () {
    class DatabaseConnection {
      isConnected = false;
      connectionString = '';

      @onConstruct(execute)
      connect(@inject('ConnectionString') connectionString: string) {
        this.connectionString = connectionString;
        this.isConnected = true;
      }
    }

    // The module takes the runner which performs the collected hooks.
    const container = new Container()
      .useModule(new OnConstructModule(run(), onConstructHooks))
      .addRegistration(R.fromValue('postgres://localhost:5432').bindTo('ConnectionString'));

    const db = container.resolve(DatabaseConnection);

    expect(db.isConnected).toBe(true);
    expect(db.connectionString).toBe('postgres://localhost:5432');
  });

  it('should forward hook exceptions to the runner’s error handler with the scope', function () {
    const failure = new Error('boom');

    class BrokenService {
      @onConstruct(() => {
        throw failure;
      })
      init() {}
    }

    let captured: { ex: unknown; scope: IContainer } | undefined;
    const container = new Container().useModule(
      new OnConstructModule(
        run((scope) => (ex) => {
          captured = { ex, scope };
        }),
        onConstructHooks,
      ),
    );

    expect(() => container.resolve(BrokenService)).not.toThrow();
    expect(captured?.ex).toBe(failure);
    expect(captured?.scope).toBe(container);
  });

  it('should expose the resolving scope to the runner’s error handler', function () {
    class BrokenService {
      @onConstruct(() => {
        throw new Error('boom');
      })
      init() {}
    }

    let scope: IContainer | undefined;
    const container = new Container().useModule(
      new OnConstructModule(
        run((s) => () => {
          scope = s;
        }),
        onConstructHooks,
      ),
    );
    const child = container.createScope();

    child.resolve(BrokenService);

    expect(scope).toBe(child);
  });

  it('should run an async initialization method after the instance is created', async function () {
    class DatabaseConnection {
      isConnected = false;
      connectionString = '';
      readonly ready: Promise<void>;

      private markReady!: () => void;

      constructor() {
        this.ready = new Promise((resolve) => {
          this.markReady = resolve;
        });
      }

      @onConstruct(executeAsync)
      async connect(@inject('ConnectionString') connectionString: string) {
        await Promise.resolve();
        this.connectionString = connectionString;
        this.isConnected = true;
        this.markReady();
      }
    }

    // The runner awaits the hooks; resolution itself still does not wait for them.
    const container = new Container()
      .useModule(new OnConstructModule(run(), onConstructHooks))
      .addRegistration(R.fromValue('postgres://localhost:5432').bindTo('ConnectionString'));

    const db = container.resolve(DatabaseConnection);

    // resolution does not wait for async hooks
    expect(db.isConnected).toBe(false);

    await db.ready;

    expect(db.isConnected).toBe(true);
    expect(db.connectionString).toBe('postgres://localhost:5432');
  });

  it('should forward rejected hooks to the runner’s error handler with the scope', async function () {
    const failure = new Error('boom');

    class BrokenService {
      @onConstruct(() => Promise.reject(failure))
      init() {}
    }

    let captured: { ex: unknown; scope: IContainer } | undefined;
    const container = new Container().useModule(
      new OnConstructModule(
        run((scope) => (ex) => {
          captured = { ex, scope };
        }),
        onConstructHooks,
      ),
    );

    const child = container.createScope();
    child.resolve(BrokenService);

    await vi.waitFor(() => expect(captured).toBeDefined());

    expect(captured?.ex).toBe(failure);
    expect(captured?.scope).toBe(child);
  });
});
