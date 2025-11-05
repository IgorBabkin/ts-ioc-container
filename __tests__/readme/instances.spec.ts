import { bindTo, Container, inject, register, Registration as R, select } from '../../lib';

describe('Instances', function () {
  @register(bindTo('ILogger'))
  class Logger {}

  it('should return injected instances', () => {
    class App {
      constructor(@inject(select.instances()) public loggers: Logger[]) {}
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope({ tags: ['child'] });

    root.resolve('ILogger');
    child.resolve('ILogger');

    const rootApp = root.resolve(App);
    const childApp = child.resolve(App);

    expect(childApp.loggers.length).toBe(1);
    expect(rootApp.loggers.length).toBe(2);
  });

  it('should return only current scope instances', () => {
    class App {
      constructor(@inject(select.instances().cascade(false)) public loggers: Logger[]) {}
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope({ tags: ['child'] });

    root.resolve('ILogger');
    child.resolve('ILogger');

    const rootApp = root.resolve(App);

    expect(rootApp.loggers.length).toBe(1);
  });

  it('should return injected instances by decorator', () => {
    const isLogger = (instance: unknown) => instance instanceof Logger;

    class App {
      constructor(@inject(select.instances(isLogger)) public loggers: Logger[]) {}
    }

    const container = new Container().addRegistration(R.fromClass(Logger));

    const logger0 = container.resolve('ILogger');
    const logger1 = container.resolve('ILogger');
    const app = container.resolve(App);

    expect(app.loggers).toHaveLength(2);
    expect(app.loggers[0]).toBe(logger0);
    expect(app.loggers[1]).toBe(logger1);
  });
});
