import { Container, type IContainer, inject, Registration as R, select } from '../../lib';

describe('Basic usage', function () {
  class Logger {
    name = 'Logger';
  }

  it('should inject dependencies', function () {
    class App {
      constructor(@inject('ILogger') public logger: Logger) {}
    }

    const container = new Container().addRegistration(R.fromClass(Logger).bindToKey('ILogger'));

    expect(container.resolve(App).logger.name).toBe('Logger');
  });

  it('should inject current scope', function () {
    const root = new Container({ tags: ['root'] });

    class App {
      constructor(@inject(select.scope.current) public scope: IContainer) {}
    }

    const app = root.resolve(App);

    expect(app.scope).toBe(root);
  });
});
