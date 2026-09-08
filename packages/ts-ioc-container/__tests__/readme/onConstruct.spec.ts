import 'reflect-metadata';
import {
  MetadataInjector,
  OnConstructModule,
  Container,
  type ExecutionContext,
  type HookFn,
  type IContainer,
  inject,
  onConstruct,
  Registration as R,
} from '../../lib';

const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

const executeAsync: HookFn = async (ctx) => {
  await ctx.invokeMethod({ args: ctx.resolveArgs() });
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

    const container = new Container({
      injector: new MetadataInjector().useModule(new OnConstructModule()),
    }).addRegistration(R.fromValue('postgres://localhost:5432').bindTo('ConnectionString'));

    const db = container.resolve(DatabaseConnection);

    expect(db.isConnected).toBe(true);
    expect(db.connectionString).toBe('postgres://localhost:5432');
  });

  it('should forward hook exceptions to the onException handler with the execution context', function () {
    const failure = new Error('boom');

    class BrokenService {
      @onConstruct(() => {
        throw failure;
      })
      init() {}
    }

    let captured: { ex: unknown; context: ExecutionContext } | undefined;
    const container = new Container({
      injector: new MetadataInjector().useModule(
        new OnConstructModule((ex, context) => {
          captured = { ex, context };
        }),
      ),
    });

    expect(() => container.resolve(BrokenService)).not.toThrow();
    expect(captured?.ex).toBe(failure);
    expect(captured?.context.scope).toBe(container);
  });

  it('should rethrow hook exceptions when no onException handler is provided', function () {
    const failure = new Error('boom');

    class BrokenService {
      @onConstruct(() => {
        throw failure;
      })
      init() {}
    }

    const container = new Container({ injector: new MetadataInjector().useModule(new OnConstructModule()) });

    expect(() => container.resolve(BrokenService)).toThrow(failure);
  });

  it('should expose the resolving scope through the execution context', function () {
    class BrokenService {
      @onConstruct(() => {
        throw new Error('boom');
      })
      init() {}
    }

    let scope: IContainer | undefined;
    const container = new Container({
      injector: new MetadataInjector().useModule(
        new OnConstructModule((_ex, context) => {
          scope = context.scope;
        }),
      ),
    });
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

    const container = new Container({
      injector: new MetadataInjector().useModule(new OnConstructModule()),
    }).addRegistration(R.fromValue('postgres://localhost:5432').bindTo('ConnectionString'));

    const db = container.resolve(DatabaseConnection);

    // resolution does not wait for async hooks
    expect(db.isConnected).toBe(false);

    await db.ready;

    expect(db.isConnected).toBe(true);
    expect(db.connectionString).toBe('postgres://localhost:5432');
  });

  it('should forward rejected hooks to the onException handler with the execution context', async function () {
    const failure = new Error('boom');

    class BrokenService {
      @onConstruct(() => Promise.reject(failure))
      init() {}
    }

    let captured: { ex: unknown; context: ExecutionContext } | undefined;
    const container = new Container({
      injector: new MetadataInjector().useModule(
        new OnConstructModule((ex, context) => {
          captured = { ex, context };
        }),
      ),
    });

    const child = container.createScope();
    child.resolve(BrokenService);

    await vi.waitFor(() => expect(captured).toBeDefined());

    expect(captured?.ex).toBe(failure);
    expect(captured?.context.scope).toBe(child);
  });
});
