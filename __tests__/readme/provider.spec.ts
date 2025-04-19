import {
  args,
  argsFn,
  Container,
  inject,
  Provider,
  scopeAccess,
  singleton,
  Registration as R,
  register,
  asKey,
  lazy,
  by,
} from '../../lib';

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
    expect(container.resolveOne('ILogger')).not.toBe(container.resolveOne('ILogger'));
  });

  it('can be registered as a value', () => {
    const container = new Container().register('ILogger', Provider.fromValue(new Logger()));
    expect(container.resolveOne('ILogger')).toBe(container.resolveOne('ILogger'));
  });

  it('can be registered as a class', () => {
    const container = new Container().register('ILogger', Provider.fromClass(Logger));
    expect(container.resolveOne('ILogger')).not.toBe(container.resolveOne('ILogger'));
  });

  it('can be featured by pipe method', () => {
    const root = new Container({ tags: ['root'] }).register('ILogger', Provider.fromClass(Logger).pipe(singleton()));
    expect(root.resolveOne('ILogger')).toBe(root.resolveOne('ILogger'));
  });

  it('can be created from a dependency key', () => {
    const container = new Container()
      .register('ILogger', Provider.fromClass(Logger))
      .register('LoggerAlias', Provider.fromKey('ILogger'));
    const logger1 = container.resolveOne('ILogger');
    const logger2 = container.resolveOne('LoggerAlias');
    expect(logger2).toBeInstanceOf(Logger);
    expect(logger2).not.toBe(logger1);
  });

  it('supports lazy resolution', () => {
    const container = new Container().register('ILogger', Provider.fromClass(Logger));
    const lazyLogger = container.resolveOne('ILogger', { lazy: true });
    expect(typeof lazyLogger).toBe('object');
    const loggerPrototype = Object.getPrototypeOf(lazyLogger);
    expect(loggerPrototype).toBeDefined();
  });

  it('supports args decorator for providing extra arguments', () => {
    const container = new Container().register(
      'ConfigService',
      Provider.fromClass(ConfigService).pipe(args('/etc/config.json')),
    );
    const config = container.resolveOne<ConfigService>('ConfigService');
    expect(config.getPath()).toBe('/etc/config.json');
  });

  it('supports argsFn decorator for dynamic arguments', () => {
    const container = new Container()
      .register('Logger', Provider.fromClass(Logger))
      .register(
        'ConfigService',
        Provider.fromClass(ConfigService).pipe(argsFn((container) => ['/dynamic/config.json'])),
      );
    const config = container.resolveOne<ConfigService>('ConfigService');
    expect(config.getPath()).toBe('/dynamic/config.json');
  });

  it('combines args from argsFn with manually provided args', () => {
    const container = new Container()
      .register('Logger', Provider.fromClass(Logger))
      .register(
        'UserService',
        Provider.fromClass(UserService).pipe(argsFn((container) => [container.resolveOne('Logger')])),
      );
    const configService = new ConfigService('/test/config.json');
    const userService = container.resolveOne<UserService>('UserService', { args: [configService] });
    expect(userService).toBeInstanceOf(UserService);
  });

  it('supports visibility control between parent and child containers', () => {
    const rootContainer = new Container({ tags: ['root'] }).register(
      'ILogger',
      Provider.fromClass(Logger).pipe(
        scopeAccess(({ invocationScope, providerScope }) => invocationScope.hasTag('admin')),
      ),
    );
    const adminChild = rootContainer.createScope({ tags: ['admin'] });
    const userChild = rootContainer.createScope({ tags: ['user'] });
    expect(() => adminChild.resolveOne('ILogger')).not.toThrow();
    expect(() => userChild.resolveOne('ILogger')).toThrow();
  });

  it('supports chaining multiple pipe transformations', () => {
    const container = new Container().register(
      'ConfigService',
      Provider.fromClass(ConfigService).pipe(args('/default/config.json'), singleton()),
    );
    const config1 = container.resolveOne<ConfigService>('ConfigService');
    const config2 = container.resolveOne<ConfigService>('ConfigService');
    expect(config1).toBe(config2);
    expect(config1.getPath()).toBe('/default/config.json');
  });

  it('applies transformers when registering a class constructor as a value', () => {
    const container = new Container()
      .register('ClassConstructor', Provider.fromValue(TestClass))
      .register('ClassInstance', Provider.fromClass(TestClass));
    const instance1 = container.resolveOne('ClassConstructor');
    const instance2 = container.resolveOne('ClassConstructor');
    const instance3 = container.resolveOne('ClassInstance');
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
    expect(container.resolveOne('StringValue')).toBe('test-string');
    expect(container.resolveOne('NumberValue')).toBe(42);
    expect(container.resolveOne('BooleanValue')).toBe(true);
    expect(container.resolveOne('ObjectValue')).toEqual({ key: 'value' });
  });

  it('resolves dependencies with empty args', () => {
    const container = new Container().register('Logger', Provider.fromClass(Logger));
    const logger = container.resolveOne('Logger', { args: [] });
    expect(logger).toBeInstanceOf(Logger);
  });

  it('allows direct manipulation of visibility predicate', () => {
    const provider = Provider.fromClass(Logger);
    provider.setAccessPredicate(({ invocationScope }) => invocationScope.hasTag('special'));
    const container = new Container({ tags: ['root'] }).register('Logger', provider);
    const specialChild = container.createScope({ tags: ['special'] });
    const regularChild = container.createScope({ tags: ['regular'] });
    expect(() => specialChild.resolveOne('Logger')).not.toThrow();
    expect(() => regularChild.resolveOne('Logger')).toThrow();
  });

  it('allows direct manipulation of args function', () => {
    const provider = Provider.fromClass(ConfigService);
    provider.setArgs(() => ['/custom/path.json']);
    const container = new Container().register('ConfigService', provider);
    const config = container.resolveOne<ConfigService>('ConfigService');
    expect(config.getPath()).toBe('/custom/path.json');
  });

  it('handles class constructors when getTransformers returns null', () => {
    const container = new Container().register('NoTransformers', Provider.fromValue(ClassWithoutTransformers));
    const result = container.resolveOne('NoTransformers');
    expect(result).toBe(ClassWithoutTransformers);
  });

  it('allows to register lazy provider', () => {
    let isLoggerCreated = false;

    @register(asKey('Logger'), lazy())
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

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const main = root.resolveClass(Main);

    expect(isLoggerCreated).toBe(false);

    main.getLogs();

    expect(isLoggerCreated).toBe(true);
  });

  it('allows to resolve with args', () => {
    @register(asKey('ILogger'))
    class Logger {
      readonly channel: string;

      constructor(options: { channel: string }) {
        this.channel = options.channel;
      }
    }

    class Main {
      constructor(@inject(by.one('ILogger').args({ channel: 'file' })) private logger: Logger) {}

      getChannel(): string {
        return this.logger.channel;
      }
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const main = root.resolveClass(Main);

    expect(main.getChannel()).toBe('file');
  });

  it('allows to resolve with argsFn', () => {
    @register(asKey('ILogger'))
    class Logger {
      readonly channel: string;

      constructor(options: { channel: string }) {
        this.channel = options.channel;
      }
    }

    class Main {
      constructor(
        @inject(by.one('ILogger').argsFn((s) => [{ channel: s.resolveOne('channel') }])) private logger: Logger,
      ) {}

      getChannel(): string {
        return this.logger.channel;
      }
    }

    const root = new Container({ tags: ['root'] })
      .addRegistration(R.fromValue('file').bindToKey('channel'))
      .addRegistration(R.fromClass(Logger));

    const main = root.resolveClass(Main);

    expect(main.getChannel()).toBe('file');
  });
});
