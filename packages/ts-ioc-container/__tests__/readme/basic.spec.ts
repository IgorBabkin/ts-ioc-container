import 'reflect-metadata';
import { by, Container, inject, ReflectionInjector, Provider } from '../../lib';

describe('Basic usage', function () {
  it('should inject dependencies', function () {
    class Logger {
      name = 'Logger';
    }

    class App {
      constructor(@inject(by.key('ILogger')) public logger: Logger) {}
    }

    const container = new Container(new ReflectionInjector()).register('ILogger', Provider.fromClass(Logger));

    expect(container.resolve(App).logger.name).toBe('Logger');
  });
});
