import 'reflect-metadata';
import {
  IContainer,
  by,
  Container,
  inject,
  ReflectionInjector,
  Provider,
  RegistrationConflictError,
  Registration,
  key,
} from '../../lib';

describe('Basic usage', function () {
  class Logger {
    name = 'Logger';
  }

  it('should inject dependencies', function () {
    class App {
      constructor(@inject(by.key('ILogger')) public logger: Logger) {}
    }

    const container = new Container(new ReflectionInjector()).register('ILogger', Provider.fromClass(Logger));

    expect(container.resolve(App).logger.name).toBe('Logger');
  });

  it('should inject multiple dependencies', function () {
    class App {
      constructor(@inject(by.keys('ILogger1', 'ILogger2')) public loggers: Logger[]) {}
    }

    const container = new Container(new ReflectionInjector())
      .register('ILogger1', Provider.fromClass(Logger))
      .register('ILogger2', Provider.fromClass(Logger));

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

  it('should raise an error when key is busy', () => {
    expect(() => {
      new Container(new ReflectionInjector())
        .register('ILogger', Provider.fromClass(Logger))
        .register('ILogger', Provider.fromClass(Logger));
    }).toThrowError(RegistrationConflictError);
  });

  it('should not raise an error when key is busy', () => {
    expect(() => {
      new Container(new ReflectionInjector())
        .register('ILogger', Provider.fromClass(Logger))
        .register('ILogger', Provider.fromClass(Logger), { override: true });
    }).not.toThrowError(RegistrationConflictError);
  });

  it('registration -> should raise an error when key is busy', () => {
    expect(() => {
      new Container(new ReflectionInjector()).use(Registration.fromClass(Logger)).use(Registration.fromClass(Logger));
    }).toThrowError(RegistrationConflictError);
  });

  it('registration -> should not raise an error when key is busy', () => {
    expect(() => {
      new Container(new ReflectionInjector())
        .use(Registration.fromClass(Logger))
        .use(Registration.fromClass(Logger).options({ override: true }));
    }).not.toThrowError(RegistrationConflictError);
  });

  it('@key -> should raise an error when key is busy', () => {
    @key('Logger')
    class Logger1 {}

    @key('Logger')
    class Logger2 {}

    expect(() => {
      new Container(new ReflectionInjector()).use(Registration.fromClass(Logger1)).use(Registration.fromClass(Logger2));
    }).toThrowError(RegistrationConflictError);
  });

  it('@key -> should not raise an error when key is busy', () => {
    @key('Logger')
    class Logger1 {}

    @key('Logger', { override: true })
    class Logger2 {}

    expect(() => {
      new Container(new ReflectionInjector()).use(Registration.fromClass(Logger1)).use(Registration.fromClass(Logger2));
    }).not.toThrowError(RegistrationConflictError);
  });

  it('registration -> should not raise an error when key is busy', () => {
    expect(() => {
      new Container(new ReflectionInjector())
        .use(Registration.fromClass(Logger))
        .use(Registration.fromClass(Logger).options({ override: true }));
    }).not.toThrowError(RegistrationConflictError);
  });
});
