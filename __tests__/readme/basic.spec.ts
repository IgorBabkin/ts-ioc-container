import 'reflect-metadata';
import { IContainer, by, Container, inject, MetadataInjector, Registration as R } from '../../lib';

describe('Basic usage', function () {
  class Logger {
    name = 'Logger';
  }

  it('should inject dependencies', function () {
    class App {
      constructor(@inject(by.key('ILogger')) public logger: Logger) {}
    }

    const container = new Container(new MetadataInjector()).add(R.toClass(Logger).fromKey('ILogger'));

    expect(container.resolve(App).logger.name).toBe('Logger');
  });

  it('should inject multiple dependencies', function () {
    class App {
      constructor(@inject(by.keys(['ILogger1', 'ILogger2'])) public loggers: Logger[]) {}
    }

    const container = new Container(new MetadataInjector())
      .add(R.toClass(Logger).fromKey('ILogger1'))
      .add(R.toClass(Logger).fromKey('ILogger2'));

    expect(container.resolve(App).loggers).toHaveLength(2);
  });

  it('should inject current scope', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] });

    class App {
      constructor(@inject(by.scope.current) public scope: IContainer) {}
    }

    const app = root.resolve(App);

    expect(app.scope).toBe(root);
  });
});
