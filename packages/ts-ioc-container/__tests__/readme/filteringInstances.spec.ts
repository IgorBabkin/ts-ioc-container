import { bindTo, Container, inject, register, Registration as R, select } from '../../lib';

/**
 * User Management Domain - Filtering Instances by Type
 *
 * When you need specific types of instances from the container:
 * - Get all Logger instances for batch flushing
 * - Find all HealthCheckable services for status endpoint
 * - Collect all EventHandler instances for event dispatching
 *
 * The predicate function filters instances at resolution time,
 * ensuring you only get the instances you need.
 */

@register(bindTo('ILogger'))
class Logger {}

class Service {}

// Predicate to identify Logger instances
const isLogger = (instance: unknown) => instance instanceof Logger;

class App {
  // Only inject instances that pass the isLogger predicate
  constructor(@inject(select.instances(isLogger)) public loggers: Logger[]) {}
}

describe('Filtering Instances', function () {
  it('should filter instances by type predicate', function () {
    const container = new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromClass(Service).bindToKey('IService'));

    // Create multiple instances of different types
    const logger1 = container.resolve('ILogger');
    const logger2 = container.resolve('ILogger');
    container.resolve('IService'); // This won't be included

    const app = container.resolve(App);

    // Only Logger instances are injected, Service is filtered out
    expect(app.loggers).toHaveLength(2);
    expect(app.loggers[0]).toBe(logger1);
    expect(app.loggers[1]).toBe(logger2);
    expect(app.loggers.every((l) => l instanceof Logger)).toBe(true);
    expect(app.loggers.some((l) => l instanceof Service)).toBe(false);
  });

  it('should return empty array when no instances match predicate', function () {
    const container = new Container({ tags: ['application'] }).addRegistration(
      R.fromClass(Service).bindToKey('IService'),
    );

    container.resolve('IService');

    const app = container.resolve(App);

    // No Logger instances exist, so empty array is injected
    expect(app.loggers).toHaveLength(0);
  });
});
