import 'reflect-metadata';
import {
  OnResolvedModule,
  Container,
  type ExecutionContext,
  type HookFn,
  type IContainer,
  inject,
  invokeMethod,
  onResolved,
  onceForEachInstance,
  onceResolved,
  Registration as R,
  singleton,
} from '../../lib';

const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

describe('onResolved', function () {
  it('should run initialization method after dependencies are resolved', function () {
    class DatabaseConnection {
      isConnected = false;
      connectionString = '';

      @onceResolved(execute)
      connect(@inject('ConnectionString') connectionString: string) {
        this.connectionString = connectionString;
        this.isConnected = true;
      }
    }

    const container = new Container()
      .useModule(new OnResolvedModule())
      .addRegistration(R.fromValue('postgres://localhost:5432').bindTo('ConnectionString'));

    const db = container.resolve(DatabaseConnection);

    expect(db.isConnected).toBe(true);
    expect(db.connectionString).toBe('postgres://localhost:5432');
  });

  it('should run once per instance when the hook is wrapped in onceForEachInstance', function () {
    class Migration {
      appliedTimes = 0;

      // @onceResolved() spelled out — this is what it is made of.
      @onResolved(onceForEachInstance(invokeMethod))
      apply(): void {
        this.appliedTimes += 1;
      }
    }

    const container = new Container()
      .useModule(new OnResolvedModule())
      .addRegistration(R.fromClass(Migration).pipe(singleton()));

    container.resolve<Migration>('Migration');
    const migration = container.resolve<Migration>('Migration');

    expect(migration.appliedTimes).toBe(1);
  });

  it('should run on every resolve, and once per instance with @onceResolved', function () {
    class Connection {
      usedTimes = 0;
      openedTimes = 0;

      @onResolved()
      use(): void {
        this.usedTimes += 1;
      }

      @onceResolved()
      open(): void {
        this.openedTimes += 1;
      }
    }

    const container = new Container().useModule(new OnResolvedModule());

    const connection = container.resolve(Connection);
    container.resolve(Connection);

    expect([connection.usedTimes, connection.openedTimes]).toEqual([1, 1]);
  });

  it('should forward hook exceptions to the onException handler with the execution context', function () {
    const failure = new Error('boom');

    class BrokenService {
      @onResolved(() => {
        throw failure;
      })
      init() {}
    }

    let captured: { ex: unknown; context: ExecutionContext } | undefined;
    const container = new Container().useModule(
      new OnResolvedModule((ex, context) => {
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
      @onResolved(() => {
        throw failure;
      })
      init() {}
    }

    const container = new Container().useModule(new OnResolvedModule());

    expect(() => container.resolve(BrokenService)).toThrow(failure);
  });

  it('should expose the resolving scope through the execution context', function () {
    class BrokenService {
      @onResolved(() => {
        throw new Error('boom');
      })
      init() {}
    }

    let scope: IContainer | undefined;
    const container = new Container().useModule(
      new OnResolvedModule((_ex, context) => {
        scope = context.scope;
      }),
    );
    const child = container.createScope();

    child.resolve(BrokenService);

    expect(scope).toBe(child);
  });
});
