import 'reflect-metadata';
import {
  AddOnConstructHookModule,
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

    const container = new Container()
      .useModule(new AddOnConstructHookModule())
      .addRegistration(R.fromValue('postgres://localhost:5432').bindTo('ConnectionString'));

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
    const container = new Container().useModule(
      new AddOnConstructHookModule((ex, context) => {
        captured = { ex, context };
      }),
    );

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

    const container = new Container().useModule(new AddOnConstructHookModule());

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
    const container = new Container().useModule(
      new AddOnConstructHookModule((_ex, context) => {
        scope = context.scope;
      }),
    );
    const child = container.createScope();

    child.resolve(BrokenService);

    expect(scope).toBe(child);
  });
});
