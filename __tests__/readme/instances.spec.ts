import { asKey, by, Container, inject, register, Registration as R } from '../../lib';

describe('Instances', function () {
  @register(asKey('ILogger'))
  class Logger {}

  it('should return injected instances', () => {
    class App {
      constructor(@inject(by.instances()) public loggers: Logger[]) {}
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope({ tags: ['child'] });

    root.resolveOne('ILogger');
    child.resolveOne('ILogger');

    const rootApp = root.resolveOne(App);
    const childApp = child.resolveOne(App);

    expect(childApp.loggers.length).toBe(1);
    expect(rootApp.loggers.length).toBe(2);
  });

  it('should return only current scope instances', () => {
    class App {
      constructor(@inject(by.instances().cascade(false)) public loggers: Logger[]) {}
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope({ tags: ['child'] });

    root.resolveOne('ILogger');
    child.resolveOne('ILogger');

    const rootApp = root.resolveOne(App);

    expect(rootApp.loggers.length).toBe(1);
  });

  it('should return injected instances by decorator', () => {
    const isLogger = (instance: unknown) => instance instanceof Logger;

    class App {
      constructor(@inject(by.instances(isLogger)) public loggers: Logger[]) {}
    }

    const container = new Container().addRegistration(R.fromClass(Logger));

    const logger0 = container.resolveOne('ILogger');
    const logger1 = container.resolveOne('ILogger');
    const app = container.resolveOne(App);

    expect(app.loggers).toHaveLength(2);
    expect(app.loggers[0]).toBe(logger0);
    expect(app.loggers[1]).toBe(logger1);
  });
});
