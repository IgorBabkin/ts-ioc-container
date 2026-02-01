import { bindTo, Container, inject, register, Registration as R, select } from '../../lib';

/**
 * User Management Domain - Instance Collection
 *
 * Sometimes you need access to all instances of a certain type:
 * - Collect all active database connections for health checks
 * - Gather all loggers to flush buffers before shutdown
 * - Find all request handlers for metrics collection
 *
 * The `select.instances()` token resolves all created instances,
 * optionally filtered by a predicate function.
 */
describe('Instances', function () {
  @register(bindTo('ILogger'))
  class Logger {}

  it('should collect instances across scope hierarchy', () => {
    // App that needs access to all logger instances (e.g., for flushing)
    class App {
      constructor(@inject(select.instances()) public loggers: Logger[]) {}
    }

    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));
    const requestScope = appContainer.createScope({ tags: ['request'] });

    // Create loggers in different scopes
    appContainer.resolve('ILogger');
    requestScope.resolve('ILogger');

    const appLevel = appContainer.resolve(App);
    const requestLevel = requestScope.resolve(App);

    // Request scope sees only its own instance
    expect(requestLevel.loggers.length).toBe(1);
    // Application scope sees all instances (cascades up from children)
    expect(appLevel.loggers.length).toBe(2);
  });

  it('should return only current scope instances when cascade is disabled', () => {
    // Only get instances from current scope, not parent scopes
    class App {
      constructor(@inject(select.instances().cascade(false)) public loggers: Logger[]) {}
    }

    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));
    const requestScope = appContainer.createScope({ tags: ['request'] });

    appContainer.resolve('ILogger');
    requestScope.resolve('ILogger');

    const appLevel = appContainer.resolve(App);

    // Only application-level instance, not request-level
    expect(appLevel.loggers.length).toBe(1);
  });

  it('should filter instances by predicate', () => {
    const isLogger = (instance: unknown) => instance instanceof Logger;

    class App {
      constructor(@inject(select.instances(isLogger)) public loggers: Logger[]) {}
    }

    const container = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));

    const logger0 = container.resolve('ILogger');
    const logger1 = container.resolve('ILogger');
    const app = container.resolve(App);

    expect(app.loggers).toHaveLength(2);
    expect(app.loggers[0]).toBe(logger0);
    expect(app.loggers[1]).toBe(logger1);
  });
});
