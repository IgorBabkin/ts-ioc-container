import 'reflect-metadata';
import { AddOnConstructHookModule, Container, type HookFn, inject, onConstruct, Registration as R } from '../../lib';

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
});
