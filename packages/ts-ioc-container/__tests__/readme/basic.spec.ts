import 'reflect-metadata';
import { IContainer, by, Container, inject, ReflectionInjector, Registration as R } from '../../lib';

describe('Basic usage', function () {
  class Logger {
    name = 'Logger';
  }

  it('should inject dependencies', function () {
    class App {
      constructor(@inject(by.key('ILogger')) public logger: Logger) {}
    }

    const container = new Container(new ReflectionInjector()).use(R.fromClass(Logger).to('ILogger'));

    expect(container.resolve(App).logger.name).toBe('Logger');
  });

  it('should inject multiple dependencies', function () {
    class App {
      constructor(@inject(by.keys('ILogger1', 'ILogger2')) public loggers: Logger[]) {}
    }

    const container = new Container(new ReflectionInjector())
      .use(R.fromClass(Logger).to('ILogger1'))
      .use(R.fromClass(Logger).to('ILogger2'));

    expect(container.resolve(App).loggers).toHaveLength(2);
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
