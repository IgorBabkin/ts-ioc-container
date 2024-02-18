import 'reflect-metadata';
import { IContainer, by, Container, inject, ReflectionInjector, Provider } from 'ts-ioc-container';

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

  it('should inject current scope', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] });

    class App {
      constructor(@inject(by.scope.current) public scope: IContainer) {}
    }

    const app = root.resolve(App);

    expect(app.scope).toBe(root);
  });
});
