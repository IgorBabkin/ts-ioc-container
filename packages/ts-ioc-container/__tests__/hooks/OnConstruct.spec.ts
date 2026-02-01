import {
  AddOnConstructHookModule,
  Container,
  HookContext,
  HookFn,
  inject,
  onConstruct,
  Registration as R,
} from '../../lib';

/**
 * Lifecycle - OnConstruct Hook
 *
 * The @onConstruct hook allows you to run logic immediately after an object is created.
 * This is useful for:
 * - Initialization logic that depends on injected services
 * - Setting up event listeners
 * - Establishing connections (though lazy is often better)
 * - Computing initial state
 *
 * Note: You must register the AddOnConstructHookModule or manually add the hook runner.
 */

const execute: HookFn = (ctx: HookContext) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

describe('onConstruct', function () {
  it('should run initialization method after dependencies are resolved', function () {
    class DatabaseConnection {
      isConnected = false;
      connectionString = '';

      // @onConstruct marks this method to be called after instantiation
      // Arguments are resolved from the container like constructor params
      @onConstruct(execute)
      connect(@inject('ConnectionString') connectionString: string) {
        this.connectionString = connectionString;
        this.isConnected = true;
      }
    }

    const container = new Container()
      // Enable @onConstruct support
      .useModule(new AddOnConstructHookModule())
      // Register config
      .addRegistration(R.fromValue('postgres://localhost:5432').bindTo('ConnectionString'));

    // Resolve class - constructor is called, then @onConstruct method
    const db = container.resolve(DatabaseConnection);

    expect(db.isConnected).toBe(true);
    expect(db.connectionString).toBe('postgres://localhost:5432');
  });
});
