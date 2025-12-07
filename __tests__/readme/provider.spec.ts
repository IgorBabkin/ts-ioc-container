import {
  args,
  argsFn,
  bindTo,
  Container,
  inject,
  lazy,
  Provider,
  register,
  Registration as R,
  scopeAccess,
  select as s,
  singleton,
} from '../../lib';

/**
 * User Management Domain - Provider Patterns
 *
 * Providers are factories that create dependency instances. They support:
 * - Different creation strategies (class, value, factory function)
 * - Lifecycle management (singleton, transient)
 * - Argument injection (static args, dynamic argsFn)
 * - Lazy instantiation (defer creation until first use)
 * - Access control (restrict which scopes can resolve)
 *
 * Think of providers as "recipes" for creating instances - they define
 * HOW to create something, while registrations define WHERE it's available.
 */

// Domain classes for examples
class Logger {}

class ConfigService {
  constructor(private readonly configPath: string) {}

  getPath(): string {
    return this.configPath;
  }
}

class UserService {}

class TestClass {}

class ClassWithoutTransformers {}

describe('Provider', () => {
  it('can be registered as a function', () => {
    const container = new Container().register('ILogger', new Provider(() => new Logger()));
    expect(container.resolve('ILogger')).not.toBe(container.resolve('ILogger'));
  });

  it('can be registered as a value', () => {
    const container = new Container().register('ILogger', Provider.fromValue(new Logger()));
    expect(container.resolve('ILogger')).toBe(container.resolve('ILogger'));
  });

  it('can be registered as a class', () => {
    const container = new Container().register('ILogger', Provider.fromClass(Logger));
    expect(container.resolve('ILogger')).not.toBe(container.resolve('ILogger'));
  });

  it('can be featured by pipe method', () => {
    const appContainer = new Container({ tags: ['application'] }).register(
      'ILogger',
      Provider.fromClass(Logger).pipe(singleton()),
    );
    expect(appContainer.resolve('ILogger')).toBe(appContainer.resolve('ILogger'));
  });

  it('can be created from a dependency key', () => {
    const container = new Container()
      .register('ILogger', Provider.fromClass(Logger))
      .register('LoggerAlias', Provider.fromKey('ILogger'));
    const logger1 = container.resolve('ILogger');
    const logger2 = container.resolve('LoggerAlias');
    expect(logger2).toBeInstanceOf(Logger);
    expect(logger2).not.toBe(logger1);
  });

  it('supports lazy resolution', () => {
    const container = new Container().register('ILogger', Provider.fromClass(Logger));
    const lazyLogger = container.resolve('ILogger', { lazy: true });
    expect(typeof lazyLogger).toBe('object');
    const loggerPrototype = Object.getPrototypeOf(lazyLogger);
    expect(loggerPrototype).toBeDefined();
  });

  it('supports args decorator for providing extra arguments', () => {
    const container = new Container().register(
      'ConfigService',
      Provider.fromClass(ConfigService).pipe(args('/etc/config.json')),
    );
    const config = container.resolve<ConfigService>('ConfigService');
    expect(config.getPath()).toBe('/etc/config.json');
  });

  it('supports argsFn decorator for dynamic arguments', () => {
    const container = new Container()
      .register('Logger', Provider.fromClass(Logger))
      .register(
        'ConfigService',
        Provider.fromClass(ConfigService).pipe(argsFn((container) => ['/dynamic/config.json'])),
      );
    const config = container.resolve<ConfigService>('ConfigService');
    expect(config.getPath()).toBe('/dynamic/config.json');
  });

  it('combines args from argsFn with manually provided args', () => {
    const container = new Container()
      .register('Logger', Provider.fromClass(Logger))
      .register(
        'UserService',
        Provider.fromClass(UserService).pipe(argsFn((container) => [container.resolve('Logger')])),
      );
    const configService = new ConfigService('/test/config.json');
    const userService = container.resolve<UserService>('UserService', { args: [configService] });
    expect(userService).toBeInstanceOf(UserService);
  });

  it('supports visibility control between parent and child containers', () => {
    // Admin-only logger - only accessible from admin request scopes
    const appContainer = new Container({ tags: ['application'] }).register(
      'ILogger',
      Provider.fromClass(Logger).pipe(scopeAccess(({ invocationScope }) => invocationScope.hasTag('admin'))),
    );
    const adminRequest = appContainer.createScope({ tags: ['request', 'admin'] });
    const userRequest = appContainer.createScope({ tags: ['request', 'user'] });

    expect(() => adminRequest.resolve('ILogger')).not.toThrow();
    expect(() => userRequest.resolve('ILogger')).toThrow();
  });

  it('supports chaining multiple pipe transformations', () => {
    const container = new Container().register(
      'ConfigService',
      Provider.fromClass(ConfigService).pipe(args('/default/config.json'), singleton()),
    );
    const config1 = container.resolve<ConfigService>('ConfigService');
    const config2 = container.resolve<ConfigService>('ConfigService');
    expect(config1).toBe(config2);
    expect(config1.getPath()).toBe('/default/config.json');
  });

  it('applies transformers when registering a class constructor as a value', () => {
    const container = new Container()
      .register('ClassConstructor', Provider.fromValue(TestClass))
      .register('ClassInstance', Provider.fromClass(TestClass));
    const instance1 = container.resolve('ClassConstructor');
    const instance2 = container.resolve('ClassConstructor');
    const instance3 = container.resolve('ClassInstance');
    expect(instance1).toBe(TestClass);
    expect(instance2).toBe(TestClass);
    expect(instance3).toBeInstanceOf(TestClass);
  });

  it('handles primitive values in Provider.fromValue', () => {
    const container = new Container()
      .register('StringValue', Provider.fromValue('test-string'))
      .register('NumberValue', Provider.fromValue(42))
      .register('BooleanValue', Provider.fromValue(true))
      .register('ObjectValue', Provider.fromValue({ key: 'value' }));
    expect(container.resolve('StringValue')).toBe('test-string');
    expect(container.resolve('NumberValue')).toBe(42);
    expect(container.resolve('BooleanValue')).toBe(true);
    expect(container.resolve('ObjectValue')).toEqual({ key: 'value' });
  });

  it('resolves dependencies with empty args', () => {
    const container = new Container().register('Logger', Provider.fromClass(Logger));
    const logger = container.resolve('Logger', { args: [] });
    expect(logger).toBeInstanceOf(Logger);
  });

  it('allows direct manipulation of visibility predicate', () => {
    // Restrict logger to special request scopes only
    const provider = Provider.fromClass(Logger);
    provider.setAccessRule(({ invocationScope }) => invocationScope.hasTag('admin'));

    const appContainer = new Container({ tags: ['application'] }).register('Logger', provider);
    const adminRequest = appContainer.createScope({ tags: ['request', 'admin'] });
    const regularRequest = appContainer.createScope({ tags: ['request'] });

    expect(() => adminRequest.resolve('Logger')).not.toThrow();
    expect(() => regularRequest.resolve('Logger')).toThrow();
  });

  it('allows direct manipulation of args function', () => {
    const provider = Provider.fromClass(ConfigService);
    provider.setArgs(() => ['/custom/path.json']);
    const container = new Container().register('ConfigService', provider);
    const config = container.resolve<ConfigService>('ConfigService');
    expect(config.getPath()).toBe('/custom/path.json');
  });

  it('handles class constructors when getTransformers returns null', () => {
    const container = new Container().register('NoTransformers', Provider.fromValue(ClassWithoutTransformers));
    const result = container.resolve('NoTransformers');
    expect(result).toBe(ClassWithoutTransformers);
  });

  it('allows to register lazy provider', () => {
    // Lazy providers defer instantiation until first property access
    let isLoggerCreated = false;

    @register(bindTo('Logger'), lazy())
    class Logger {
      private logs: string[] = [];

      constructor() {
        isLoggerCreated = true;
      }

      info(message: string, context: Record<string, unknown>): void {
        this.logs.push(JSON.stringify({ ...context, level: 'info', message }));
      }

      serialize(): string {
        return this.logs.join('\n');
      }
    }

    class Main {
      constructor(@inject('Logger') private logger: Logger) {}

      getLogs(): string {
        return this.logger.serialize();
      }
    }

    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));
    const main = appContainer.resolve(Main);

    // Logger not created yet - lazy!
    expect(isLoggerCreated).toBe(false);

    // First property access triggers instantiation
    main.getLogs();

    expect(isLoggerCreated).toBe(true);
  });

  it('allows to resolve with args', () => {
    // Pass configuration to dependency at injection point
    @register(bindTo('ILogger'))
    class Logger {
      readonly channel: string;

      constructor(options: { channel: string }) {
        this.channel = options.channel;
      }
    }

    class Main {
      constructor(@inject(s.token('ILogger').args({ channel: 'file' })) private logger: Logger) {}

      getChannel(): string {
        return this.logger.channel;
      }
    }

    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));
    const main = appContainer.resolve(Main);

    expect(main.getChannel()).toBe('file');
  });

  it('allows to resolve with argsFn', () => {
    // Dynamic arguments resolved from container at injection time
    @register(bindTo('ILogger'))
    class Logger {
      readonly channel: string;

      constructor(options: { channel: string }) {
        this.channel = options.channel;
      }
    }

    class Main {
      constructor(
        @inject(s.token('ILogger').argsFn((scope) => [{ channel: scope.resolve('channel') }])) private logger: Logger,
      ) {}

      getChannel(): string {
        return this.logger.channel;
      }
    }

    const appContainer = new Container({ tags: ['application'] })
      .addRegistration(R.fromValue('file').bindToKey('channel'))
      .addRegistration(R.fromClass(Logger));

    const main = appContainer.resolve(Main);

    expect(main.getChannel()).toBe('file');
  });
});
