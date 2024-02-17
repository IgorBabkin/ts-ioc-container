import 'reflect-metadata';
import { inject, key, Registration, Container, ReflectionInjector, by } from 'ts-ioc-container';

describe('Instances', function () {
  @key('ILogger')
  class Logger {}

  it('should return injected instances', () => {
    const container = new Container(new ReflectionInjector()).use(Registration.fromClass(Logger));
    const scope = container.createScope();

    const logger1 = container.resolve('ILogger');
    const logger2 = scope.resolve('ILogger');

    expect(scope.getInstances().length).toBe(1);
    expect(container.getInstances().length).toBe(2);
  });

  it('should return injected instances by decorator', () => {
    const isLogger = (instance: unknown) => instance instanceof Logger;

    class App {
      constructor(@inject(by.instances(isLogger)) public loggers: Logger[]) {}
    }

    const container = new Container(new ReflectionInjector()).use(Registration.fromClass(Logger));

    const logger0 = container.resolve('ILogger');
    const logger1 = container.resolve('ILogger');
    const app = container.resolve(App);

    expect(app.loggers).toHaveLength(2);
    expect(app.loggers[0]).toBe(logger0);
    expect(app.loggers[1]).toBe(logger1);
  });
});
