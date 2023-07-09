import 'reflect-metadata';
import { by, Container, inject, ReflectionInjector, Provider } from 'ts-ioc-container';

describe('Basic usage', function () {
  it('should inject dependencies', function () {
    class Logger {
      name = 'Logger';
    }

    class App {
      constructor(@inject(by('ILogger')) public logger: Logger) {}
    }

    const container = new Container(new ReflectionInjector()).register('ILogger', Provider.fromClass(Logger));

    expect(container.resolve(App).logger.name).toBe('Logger');
  });
});
