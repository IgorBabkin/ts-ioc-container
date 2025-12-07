import { bindTo, Container, inject, register, Registration as R, select } from '../../lib';

@register(bindTo('ILogger'))
class Logger {}

class Service {}

const isLogger = (instance: unknown) => instance instanceof Logger;

class App {
  constructor(@inject(select.instances(isLogger)) public loggers: Logger[]) {}
}

describe('Filtering Instances', function () {
  it('should filter instances by predicate', function () {
    const container = new Container()
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromClass(Service).bindToKey('IService'));

    // Create multiple instances
    const logger1 = container.resolve('ILogger');
    const logger2 = container.resolve('ILogger');
    container.resolve('IService');

    const app = container.resolve(App);

    // Should only include Logger instances, not Service
    expect(app.loggers).toHaveLength(2);
    expect(app.loggers[0]).toBe(logger1);
    expect(app.loggers[1]).toBe(logger2);
    expect(app.loggers.every((l) => l instanceof Logger)).toBe(true);
    expect(app.loggers.some((l) => l instanceof Service)).toBe(false);
  });

  it('should return empty array when no instances match predicate', function () {
    const container = new Container().addRegistration(R.fromClass(Service).bindToKey('IService'));

    container.resolve('IService');

    const app = container.resolve(App);

    expect(app.loggers).toHaveLength(0);
  });
});
