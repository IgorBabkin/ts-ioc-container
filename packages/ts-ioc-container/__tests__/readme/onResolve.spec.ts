import 'reflect-metadata';
import { Container, type IContainer, onResolve, register, Registration as R, singleton } from '../../lib';

/**
 * Observability Domain - onResolve hooks
 *
 * `onResolve(...)` attaches side effects to a provider. Every time the provider
 * hands a dependency back, each hook is called with that dependency and the
 * resolving scope.
 *
 * Unlike `decorate(...)`, a hook cannot replace the dependency - its return
 * value is ignored. Use `decorate` to change what the caller gets, and
 * `onResolve` to react to what the caller got: tracking, metrics, registering
 * the instance with an external bus.
 *
 * Hooks always run after the whole `decorate` chain, so they observe the fully
 * decorated dependency no matter where `onResolve` sits in the pipe list.
 */
describe('onResolve', () => {
  it('should observe every resolved dependency without changing it', () => {
    const resolved: Array<{ name: string; fromRequest: boolean }> = [];

    const track = (dependency: unknown, scope: IContainer) => {
      resolved.push({ name: (dependency as Connection).name, fromRequest: scope.hasTag('request') });
    };

    @register(onResolve(track))
    class Connection {
      readonly name = 'Connection';
    }

    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Connection));
    const request = app.createScope({ tags: ['request'] });

    const connection = request.resolve<Connection>('Connection');

    // The caller still receives the untouched instance
    expect(connection).toBeInstanceOf(Connection);
    // ...and the hook saw it, together with the scope it was resolved from
    expect(resolved).toEqual([{ name: 'Connection', fromRequest: true }]);
  });

  it('should run once for a singleton and on every resolve otherwise', () => {
    let poolCount = 0;
    let sessionCount = 0;

    @register(singleton(), onResolve(() => poolCount++))
    class ConnectionPool {}

    @register(onResolve(() => sessionCount++))
    class Session {}

    const app = new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(ConnectionPool))
      .addRegistration(R.fromClass(Session));

    app.resolve('ConnectionPool');
    app.resolve('ConnectionPool');
    app.resolve('Session');
    app.resolve('Session');

    // A singleton caches the dependency, so hooks fire on the resolve that filled the cache
    expect(poolCount).toBe(1);
    expect(sessionCount).toBe(2);
  });
});
