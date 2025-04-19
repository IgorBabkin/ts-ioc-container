import { type IContainer, by, Container, inject, Registration as R } from '../../lib';

describe('Basic usage', function () {
  class Logger {
    name = 'Logger';
  }

  it('should inject dependencies', function () {
    class App {
      constructor(@inject('ILogger') public logger: Logger) {}
    }

    const container = new Container().addRegistration(R.fromClass(Logger).bindToKey('ILogger'));

    expect(container.resolveOne(App).logger.name).toBe('Logger');
  });

  it('should inject current scope', function () {
    const root = new Container({ tags: ['root'] });

    class App {
      constructor(@inject(by.scope.current) public scope: IContainer) {}
    }

    const app = root.resolveOne(App);

    expect(app.scope).toBe(root);
  });
});
