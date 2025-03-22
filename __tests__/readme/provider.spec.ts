import 'reflect-metadata';
import { singleton, Container, Provider, scope, args, argsFn, visible } from '../../lib';
import { lazyProxy } from '../../lib/utils';
import { getMetadata, setMetadata } from '../../lib/metadata';

class Logger {}
class ConfigService {
  constructor(private readonly configPath: string) {}
  getPath(): string {
    return this.configPath;
  }
}
class UserService {
  constructor(
    private readonly logger: Logger,
    private readonly config: ConfigService,
  ) {}
}

class TestClass {}

class ClassWithoutTransformers {}

jest.mock('../../lib/provider/IProvider', () => {
  const originalModule = jest.requireActual('../../lib/provider/IProvider');
  return {
    ...originalModule,
    getTransformers: jest.fn().mockImplementation((target) => {
      if (target === ClassWithoutTransformers) {
        return null;
      }
      return originalModule.getTransformers(target);
    }),
  };
});

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
    const root = new Container({ tags: ['root'] }).register('ILogger', Provider.fromClass(Logger).pipe(singleton()));
    expect(root.resolve('ILogger')).toBe(root.resolve('ILogger'));
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
    const rootContainer = new Container({ tags: ['root'] }).register(
      'ILogger',
      Provider.fromClass(Logger).pipe(visible(({ child, isParent }) => child.hasTag('admin'))),
    );
    const adminChild = rootContainer.createScope({ tags: ['admin'] });
    const userChild = rootContainer.createScope({ tags: ['user'] });
    expect(() => adminChild.resolve('ILogger')).not.toThrow();
    expect(() => userChild.resolve('ILogger')).toThrow();
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
    const provider = Provider.fromClass(Logger);
    provider.setVisibility(({ child }) => child.hasTag('special'));
    const container = new Container({ tags: ['root'] }).register('Logger', provider);
    const specialChild = container.createScope({ tags: ['special'] });
    const regularChild = container.createScope({ tags: ['regular'] });
    expect(() => specialChild.resolve('Logger')).not.toThrow();
    expect(() => regularChild.resolve('Logger')).toThrow();
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
});
