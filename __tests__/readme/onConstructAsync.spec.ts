import 'reflect-metadata';
import {
  AddOnConstructAsyncHookModule,
  Container,
  type ExecutionContext,
  type HookFn,
  inject,
  onConstructAsync,
  Registration as R,
} from '../../lib';

const execute: HookFn = async (ctx) => {
  await ctx.invokeMethod({ args: ctx.resolveArgs() });
};

describe('onConstructAsync', function () {
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

      @onConstructAsync(execute)
      async connect(@inject('ConnectionString') connectionString: string) {
        await Promise.resolve();
        this.connectionString = connectionString;
        this.isConnected = true;
        this.markReady();
      }
    }

    const container = new Container()
      .useModule(new AddOnConstructAsyncHookModule())
      .addRegistration(R.fromValue('postgres://localhost:5432').bindTo('ConnectionString'));

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
      @onConstructAsync(() => Promise.reject(failure))
      init() {}
    }

    let captured: { ex: unknown; context: ExecutionContext } | undefined;
    const container = new Container().useModule(
      new AddOnConstructAsyncHookModule((ex, context) => {
        captured = { ex, context };
      }),
    );

    const child = container.createScope();
    child.resolve(BrokenService);

    await vi.waitFor(() => expect(captured).toBeDefined());

    expect(captured?.ex).toBe(failure);
    expect(captured?.context.scope).toBe(child);
  });
});
