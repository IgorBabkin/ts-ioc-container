# Typescript IoC (Inversion Of Control) container

![NPM version:latest](https://img.shields.io/npm/v/ts-ioc-container/latest.svg?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/ts-ioc-container.svg?style=flat-square)
![npm package minimized gzipped size (select exports)](https://img.shields.io/bundlejs/size/ts-ioc-container)
[![Coverage Status](https://coveralls.io/repos/github/IgorBabkin/ts-ioc-container/badge.svg?branch=master)](https://coveralls.io/github/IgorBabkin/ts-ioc-container?branch=master)
![License](https://img.shields.io/npm/l/ts-ioc-container)

## Advantages
- battle tested :boom:
- written on `typescript`
- simple and lightweight :heart:
- clean API :green_heart:
- supports `tagged scopes`
- fully test covered :100:
- can be used with decorators `@inject`
- can [inject properties](#inject-property)
- can inject [lazy dependencies](#lazy)
- composable and open to extend
- awesome for testing (auto mocking)

## Content

- [Setup](#setup)
- [Container](#container)
    - [Basic usage](#basic-usage)
    - [Scope](#scope) `tags`
    - [Instances](#instances)
    - [Dispose](#dispose)
    - [Lazy](#lazy) `lazy`
- [Injector](#injector)
    - [Metadata](#metadata) `@inject`
    - [Simple](#simple)
    - [Proxy](#proxy)
- [Provider](#provider) `provider`
    - [Singleton](#singleton) `singleton`
    - [Arguments](#arguments) `args` `argsFn`
    - [Visibility](#visibility) `visible`
    - [Alias](#alias) `alias`
    - [Decorator](#decorator) `decorate`
- [Registration](#registration) `@register`
    - [Key](#key) `key`
    - [Scope](#scope) `scope`
- [Module](#module)
- [Hook](#hook) `@hook`
    - [OnConstruct](#onconstruct) `@onConstruct`
    - [OnDispose](#ondispose) `@onDispose`
    - [Inject Property](#inject-property)
    - [Inject Method](#inject-method)
- [Mock](#mock)
- [Error](#error)

## Setup

```shell script
npm install ts-ioc-container reflect-metadata
```
```shell script
yarn add ts-ioc-container reflect-metadata
```

Just put it in the entrypoint file of your project. It should be the first line of the code.
```typescript
import 'reflect-metadata';
```

And `tsconfig.json` should have next options:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Container
`IContainer` consists of:

- Provider is dependency factory which creates dependency
- Injector describes how to inject dependencies to constructor
- Registration is provider factory which registers provider in container

### Basic usage

```typescript
import 'reflect-metadata';
import { IContainer, by, Container, inject, Registration as R } from 'ts-ioc-container';

describe('Basic usage', function () {
  class Logger {
    name = 'Logger';
  }

  it('should inject dependencies', function () {
    class App {
      constructor(@inject(by.one('ILogger')) public logger: Logger) {}
    }

    const container = new Container().addRegistration(R.fromClass(Logger).assignToKey('ILogger'));

    expect(container.resolve(App).logger.name).toBe('Logger');
  });

  it('should inject current scope', function () {
    const root = new Container({ tags: ['root'] });

    class App {
      constructor(@inject(by.scope.current) public scope: IContainer) {}
    }

    const app = root.resolve(App);

    expect(app.scope).toBe(root);
  });
});

```

### Scope
Sometimes you need to create a scope of container. For example, when you want to create a scope per request in web application. You can assign tags to scope and provider and resolve dependencies only from certain scope.

- NOTICE: remember that when scope doesn't have dependency then it will be resolved from parent container
- NOTICE: when you create a scope of container then all providers are cloned to new scope. For that reason every provider has methods `clone` and `isValid` to clone itself and check if it's valid for certain scope accordingly.
- NOTICE: when you create a scope then we clone ONLY tags-matched providers.

```typescript
import 'reflect-metadata';
import {
  by,
  Container,
  DependencyNotFoundError,
  IContainer,
  inject,
  register,
  Registration as R,
  scope,
  singleton,
} from 'ts-ioc-container';

@register('ILogger', scope((s) => s.hasTag('child')), singleton())
class Logger {}

describe('Scopes', function () {
  it('should resolve dependencies from scope', function () {
    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope({ tags: ['child'] });

    expect(child.resolve('ILogger')).toBe(child.resolve('ILogger'));
    expect(() => root.resolve('ILogger')).toThrow(DependencyNotFoundError);
  });

  it('should inject new scope', function () {
    const root = new Container({ tags: ['root'] });

    class App {
      constructor(@inject(by.scope.create({ tags: ['child'] })) public scope: IContainer) {}
    }

    const app = root.resolve(App);

    expect(app.scope).not.toBe(root);
    expect(app.scope.hasTag('child')).toBe(true);
  });
});

```

### Instances
Sometimes you want to get all instances from container and its scopes. For example, when you want to dispose all instances of container.

- you can get instances from container and scope which were created by injector

```typescript
import 'reflect-metadata';
import { inject, key, Registration as R, Container, by, register } from 'ts-ioc-container';

describe('Instances', function () {
  @register('ILogger')
  class Logger {}

  it('should return injected instances', () => {
    class App {
      constructor(@inject(by.instances()) public loggers: Logger[]) {}
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope({ tags: ['child'] });

    const logger1 = root.resolve('ILogger');
    const logger2 = child.resolve('ILogger');

    const rootApp = root.resolve(App);
    const childApp = child.resolve(App);

    expect(childApp.loggers.length).toBe(1);
    expect(rootApp.loggers.length).toBe(2);
  });

  it('should return only current scope instances', () => {
    class App {
      constructor(@inject(by.instances().cascade(false)) public loggers: Logger[]) {}
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope({ tags: ['child'] });

    const logger1 = root.resolve('ILogger');
    const logger2 = child.resolve('ILogger');

    const rootApp = root.resolve(App);

    expect(rootApp.loggers.length).toBe(1);
  });

  it('should return injected instances by decorator', () => {
    const isLogger = (instance: unknown) => instance instanceof Logger;

    class App {
      constructor(@inject(by.instances(isLogger)) public loggers: Logger[]) {}
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

```

### Dispose
Sometimes you want to dispose container and all its scopes. For example, when you want to prevent memory leaks. Or you want to ensure that nobody can use container after it was disposed.

- container can be disposed
- when container is disposed then all scopes are disposed too
- when container is disposed then it unregisters all providers and remove all instances

```typescript
import 'reflect-metadata';
import { by, Container, ContainerDisposedError, EmptyContainer, Registration as R } from 'ts-ioc-container';

class Logger {}

describe('Disposing', function () {
  it('should container and make it unavailable for the further usage', function () {
    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger).assignToKey('ILogger'));
    const child = root.createScope({ tags: ['child'] });

    const logger = child.resolve('ILogger');
    root.dispose();

    expect(() => child.resolve('ILogger')).toThrow(ContainerDisposedError);
    expect(() => root.resolve('ILogger')).toThrow(ContainerDisposedError);
    expect(by.instances().resolve(root).length).toBe(0);
  });

  it('should dispose without cascade', function () {
    const root = new Container({ tags: ['root'] });
    const child1 = root.createScope({ tags: ['child1'] });

    root.dispose({ cascade: false });

    expect(root.isDisposed).toBe(true);
    expect(child1.isDisposed).toBe(false);
    expect(child1.getParent()).toBeInstanceOf(EmptyContainer);
  });
});

```

### Lazy
Sometimes you want to create dependency only when somebody want to invoke it's method or property. This is what `lazy` is for.

```typescript
import { by, Container, inject, register, Registration as R, singleton } from 'ts-ioc-container';

describe('lazy provider', () => {
  @register(singleton())
  class Flag {
    isSet = false;

    set() {
      this.isSet = true;
    }
  }

  class Service {
    name = 'Service';

    constructor(@inject(by.one('Flag')) private flag: Flag) {
      this.flag.set();
    }

    greet() {
      return 'Hello';
    }
  }

  class App {
    constructor(@inject(by.one('Service').lazy()) public service: Service) {}

    run() {
      return this.service.greet();
    }
  }

  function createContainer() {
    const container = new Container();
    container.addRegistration(R.fromClass(Flag)).addRegistration(R.fromClass(Service));
    return container;
  }

  it('should not create an instance until method is not invoked', () => {
    // Arrange
    const container = createContainer();

    // Act
    const app = container.resolve(App);
    const flag = container.resolve<Flag>('Flag');

    // Assert
    expect(flag.isSet).toBe(false);
  });

  it('should create an instance only when some method/property is invoked', () => {
    // Arrange
    const container = createContainer();

    // Act
    const app = container.resolve(App);
    const flag = container.resolve<Flag>('Flag');

    // Assert
    expect(app.run()).toBe('Hello');
    expect(flag.isSet).toBe(true);
  });

  it('should not create instance on every method invoked', () => {
    // Arrange
    const container = createContainer();

    // Act
    const app = container.resolve(App);

    // Assert
    expect(app.run()).toBe('Hello');
    expect(app.run()).toBe('Hello');
    expect(Array.from(container.getInstances()).filter((x) => x instanceof Service).length).toBe(1);
  });

  it('should create instance when property is invoked', () => {
    // Arrange
    const container = createContainer();

    // Act
    const app = container.resolve(App);
    const flag = container.resolve<Flag>('Flag');

    // Assert
    expect(app.service.name).toBe('Service');
    expect(flag.isSet).toBe(true);
  });
});

```

## Injector
`IInjector` is used to describe how dependencies should be injected to constructor.

- `MetadataInjector` - injects dependencies using `@inject` decorator
- `ProxyInjector` - injects dependencies as dictionary `Record<string, unknown>`
- `SimpleInjector` - just passes container to constructor with others arguments

### Metadata
This type of injector uses `@inject` decorator to mark where dependencies should be injected. It's bases on `reflect-metadata` package. That's why I call it `MetadataInjector`.
Also you can [inject property.](#inject-property)

```typescript
import 'reflect-metadata';
import { by, Container, inject, Registration as R } from 'ts-ioc-container';

class Logger {
  name = 'Logger';
}

class App {
  constructor(@inject(by.one('ILogger')) private logger: Logger) {}

  // OR
  // constructor(@inject((container, ...args) => container.resolve('ILogger', ...args)) private logger: ILogger) {
  // }

  getLoggerName(): string {
    return this.logger.name;
  }
}

describe('Reflection Injector', function () {
  it('should inject dependencies by @inject decorator', function () {
    const container = new Container().addRegistration(R.fromClass(Logger).assignToKey('ILogger'));

    const app = container.resolve(App);

    expect(app.getLoggerName()).toBe('Logger');
  });
});

```

### Simple
This type of injector just passes container to constructor with others arguments.

```typescript
import 'reflect-metadata';
import { Container, IContainer, Registration as R, SimpleInjector } from 'ts-ioc-container';

describe('SimpleInjector', function () {
  it('should pass container as first parameter', function () {
    class App {
      constructor(public container: IContainer) {}
    }

    const container = new Container({ injector: new SimpleInjector() }).addRegistration(
      R.fromClass(App).assignToKey('App'),
    );
    const app = container.resolve<App>('App');

    expect(app.container).toBeInstanceOf(Container);
  });

  it('should pass parameters alongside with container', function () {
    class App {
      constructor(
        container: IContainer,
        public greeting: string,
      ) {}
    }

    const container = new Container({ injector: new SimpleInjector() }).addRegistration(
      R.fromClass(App).assignToKey('App'),
    );
    const app = container.resolve<App>('App', { args: ['Hello world'] });

    expect(app.greeting).toBe('Hello world');
  });
});

```

### Proxy
This type of injector injects dependencies as dictionary `Record<string, unknown>`.

```typescript
import 'reflect-metadata';
import { Container, ProxyInjector, args, Registration as R } from 'ts-ioc-container';

describe('ProxyInjector', function () {
  it('should pass dependency to constructor as dictionary', function () {
    class Logger {}

    class App {
      logger: Logger;

      constructor({ logger }: { logger: Logger }) {
        this.logger = logger;
      }
    }

    const container = new Container({ injector: new ProxyInjector() }).addRegistration(
      R.fromClass(Logger).assignToKey('logger'),
    );

    const app = container.resolve(App);
    expect(app.logger).toBeInstanceOf(Logger);
  });

  it('should pass arguments as objects', function () {
    class Logger {}

    class App {
      logger: Logger;
      greeting: string;

      constructor({
        logger,
        greetingTemplate,
        name,
      }: {
        logger: Logger;
        greetingTemplate: (name: string) => string;
        name: string;
      }) {
        this.logger = logger;
        this.greeting = greetingTemplate(name);
      }
    }

    const greetingTemplate = (name: string) => `Hello ${name}`;

    const container = new Container({ injector: new ProxyInjector() })
      .addRegistration(R.fromClass(App).assignToKey('App').pipe(args({ greetingTemplate })))
      .addRegistration(R.fromClass(Logger).assignToKey('logger'));

    const app = container.resolve<App>('App', { args: [{ name: `world` }] });
    expect(app.greeting).toBe('Hello world');
  });

  it('should resolve array dependencies when property name contains "array"', function () {
    class Logger {}
    class Service {}

    class App {
      loggers: Logger[];
      service: Service;

      constructor({ loggersArray, service }: { loggersArray: Logger[]; service: Service }) {
        this.loggers = loggersArray;
        this.service = service;
      }
    }

    // Mock container's resolveMany to return an array with a Logger instance
    const mockLogger = new Logger();
    const mockContainer = new Container({ injector: new ProxyInjector() });
    const originalResolveMany = mockContainer.resolveMany;
    mockContainer.resolveMany = jest.fn().mockImplementation((key) => {
      console.log(`resolveMany called with key: ${key}, type: ${typeof key}, toString: ${key.toString()}`);
      // Always return the mock array for simplicity
      return [mockLogger];
    });
    mockContainer.addRegistration(R.fromClass(Service).assignToKey('service'));

    const app = mockContainer.resolve(App);
    console.log('App loggers:', app.loggers);
    expect(app.loggers).toBeInstanceOf(Array);
    expect(app.loggers.length).toBe(1);
    expect(app.loggers[0]).toBe(mockLogger);
    expect(app.service).toBeInstanceOf(Service);
    // Verify that resolveMany was called with the correct key
    expect(mockContainer.resolveMany).toHaveBeenCalledWith('loggersArray');
  });
});

```

## Provider
Provider is dependency factory which creates dependency.

- `provider()`
- `Provider.fromClass(Logger)`
- `Provider.fromValue(logger)`
- `new Provider((container, ...args) => container.resolve(Logger, {args}))`

```typescript
import 'reflect-metadata';
import { singleton, Container, Provider, scope, args, argsFn, visible } from 'ts-ioc-container';
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

```

### Singleton
Sometimes you need to create only one instance of dependency per scope. For example, you want to create only one logger per scope.

- Singleton provider creates only one instance in every scope where it's resolved.
- NOTICE: if you create a scope 'A' of container 'root' then Logger of A !== Logger of root.

```typescript
import 'reflect-metadata';
import { Container, register, Registration as R, singleton } from 'ts-ioc-container';

@register('logger', singleton())
class Logger {}

describe('Singleton', function () {
  function createContainer() {
    return new Container();
  }

  it('should resolve the same container per every request', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));

    expect(container.resolve('logger')).toBe(container.resolve('logger'));
  });

  it('should resolve different dependency per scope', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));
    const child = container.createScope();

    expect(container.resolve('logger')).not.toBe(child.resolve('logger'));
  });

  it('should resolve the same dependency for scope', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));
    const child = container.createScope();

    expect(child.resolve('logger')).toBe(child.resolve('logger'));
  });
});

```

### Arguments
Sometimes you want to bind some arguments to provider. This is what `ArgsProvider` is for.
- `provider(args('someArgument'))`
- `provider(argsFn((container) => [container.resolve(Logger), 'someValue']))`
- `Provider.fromClass(Logger).pipe(args('someArgument'))`
- NOTICE: args from this provider has higher priority than args from `resolve` method.

```typescript
import 'reflect-metadata';
import {
  args,
  argsFn,
  Container,
  DependencyKey,
  inject,
  MultiCache,
  register,
  Registration as R,
  singleton,
} from 'ts-ioc-container';

@register('logger')
class Logger {
  constructor(
    public name: string,
    public type?: string,
  ) {}
}

describe('ArgsProvider', function () {
  function createContainer() {
    return new Container();
  }

  it('can assign argument function to provider', function () {
    const root = createContainer().addRegistration(R.fromClass(Logger).pipe(argsFn((container, ...args) => ['name'])));

    const logger = root.createScope().resolve<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('can assign argument to provider', function () {
    const root = createContainer().addRegistration(R.fromClass(Logger).pipe(args('name')));

    const logger = root.resolve<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('should set provider arguments with highest priority in compare to resolve arguments', function () {
    const root = createContainer().addRegistration(R.fromClass(Logger).pipe(args('name')));

    const logger = root.resolve<Logger>('logger', { args: ['file'] });

    expect(logger.name).toBe('name');
    expect(logger.type).toBe('file');
  });

  it('should resolve dependency by passing arguments resolve from container by another argument', function () {
    interface IRepository {
      name: string;
    }

    @register('UserRepository')
    class UserRepository implements IRepository {
      name = 'UserRepository';
    }

    @register('TodoRepository')
    class TodoRepository implements IRepository {
      name = 'TodoRepository';
    }

    @register('EntityManager', argsFn((container, token) => [container.resolve(token as DependencyKey)]))
    class EntityManager {
      constructor(public repository: IRepository) {}
    }

    class Main {
      constructor(
        @inject((s) => s.resolve('EntityManager', { args: ['UserRepository'] })) public userEntities: EntityManager,
        @inject((s) => s.resolve('EntityManager', { args: ['TodoRepository'] })) public todoEntities: EntityManager,
      ) {}
    }

    const root = createContainer()
      .addRegistration(R.fromClass(EntityManager))
      .addRegistration(R.fromClass(UserRepository))
      .addRegistration(R.fromClass(TodoRepository));
    const main = root.resolve(Main);

    expect(main.userEntities.repository).toBeInstanceOf(UserRepository);
    expect(main.todoEntities.repository).toBeInstanceOf(TodoRepository);
  });

  it('should resolve memoized dependency by passing arguments resolve from container by another argument', function () {
    interface IRepository {
      name: string;
    }

    @register('UserRepository')
    class UserRepository implements IRepository {
      name = 'UserRepository';
    }

    @register('TodoRepository')
    class TodoRepository implements IRepository {
      name = 'TodoRepository';
    }

    @register(
      'EntityManager',
      argsFn((container, token) => [container.resolve(token as DependencyKey)]),
      singleton(() => new MultiCache((...args: unknown[]) => args[0] as DependencyKey)),
    )
    class EntityManager {
      constructor(public repository: IRepository) {}
    }

    class Main {
      constructor(
        @inject((s) => s.resolve('EntityManager', { args: ['UserRepository'] })) public userEntities: EntityManager,
        @inject((s) => s.resolve('EntityManager', { args: ['TodoRepository'] })) public todoEntities: EntityManager,
      ) {}
    }

    const root = createContainer()
      .addRegistration(R.fromClass(EntityManager))
      .addRegistration(R.fromClass(UserRepository))
      .addRegistration(R.fromClass(TodoRepository));
    const main = root.resolve(Main);

    const userRepository = root.resolve<EntityManager>('EntityManager', { args: ['UserRepository'] }).repository;
    expect(userRepository).toBeInstanceOf(UserRepository);
    expect(main.userEntities.repository).toBe(userRepository);

    const todoRepository = root.resolve<EntityManager>('EntityManager', { args: ['TodoRepository'] }).repository;
    expect(todoRepository).toBeInstanceOf(TodoRepository);
    expect(main.todoEntities.repository).toBe(todoRepository);
  });
});

```

### Visibility
Sometimes you want to hide dependency if somebody wants to resolve it from certain scope
- `provider(visible(({ isParent, child }) => isParent || child.hasTag('root')))` - dependency will be accessible from scope `root` or from scope where it's registered
- `Provider.fromClass(Logger).pipe(visible(({ isParent, child }) => isParent || child.hasTag('root')))`

```typescript
import 'reflect-metadata';
import {
  Container,
  DependencyNotFoundError,
  key,
  register,
  Registration as R,
  scope,
  singleton,
  visible,
} from 'ts-ioc-container';

describe('Visibility', function () {
  it('should hide from children', () => {
    @register(key('logger'), scope((s) => s.hasTag('root')), singleton(), visible(({ isParent }) => isParent))
    class FileLogger {}

    const parent = new Container({ tags: ['root'] }).addRegistration(R.fromClass(FileLogger));

    const child = parent.createScope({ tags: ['child'] });

    expect(() => child.resolve('logger')).toThrowError(DependencyNotFoundError);
    expect(parent.resolve('logger')).toBeInstanceOf(FileLogger);
  });
});

```

### Alias
Alias is needed to group keys
- `@register(alias('logger'))` helper assigns `logger` alias to registration.
- `by.aliases((it) => it.has('logger') || it.has('a'))` resolves dependencies which have `logger` or `a` aliases
- `Provider.fromClass(Logger).pipe(alias('logger'))`

```typescript
import 'reflect-metadata';
import { alias, by, Container, DependencyNotFoundError, inject, register, Registration as R, scope } from 'ts-ioc-container';

describe('alias', () => {
  const IMiddlewareKey = 'IMiddleware';
  const middleware = register(alias(IMiddlewareKey));

  interface IMiddleware {
    applyTo(application: IApplication): void;
  }

  interface IApplication {
    use(module: IMiddleware): void;
    markMiddlewareAsApplied(name: string): void;
  }

  @middleware
  class LoggerMiddleware implements IMiddleware {
    applyTo(application: IApplication): void {
      application.markMiddlewareAsApplied('LoggerMiddleware');
    }
  }

  @middleware
  class ErrorHandlerMiddleware implements IMiddleware {
    applyTo(application: IApplication): void {
      application.markMiddlewareAsApplied('ErrorHandlerMiddleware');
    }
  }

  it('should resolve by some alias', () => {
    class App implements IApplication {
      private appliedMiddleware: Set<string> = new Set();
      constructor(@inject(by.many(IMiddlewareKey)) public middleware: IMiddleware[]) {}

      markMiddlewareAsApplied(name: string): void {
        this.appliedMiddleware.add(name);
      }

      isMiddlewareApplied(name: string): boolean {
        return this.appliedMiddleware.has(name);
      }

      use(module: IMiddleware): void {
        module.applyTo(this);
      }

      run() {
        for (const module of this.middleware) {
          module.applyTo(this);
        }
      }
    }

    const container = new Container()
      .addRegistration(R.fromClass(LoggerMiddleware))
      .addRegistration(R.fromClass(ErrorHandlerMiddleware));

    const app = container.resolve(App);
    app.run();

    expect(app.isMiddlewareApplied('LoggerMiddleware')).toBe(true);
    expect(app.isMiddlewareApplied('ErrorHandlerMiddleware')).toBe(true);
  });

  it('should resolve by some alias', () => {
    @register(alias('ILogger'))
    class FileLogger {}

    const container = new Container().addRegistration(R.fromClass(FileLogger));

    expect(by.one('ILogger').resolve(container)).toBeInstanceOf(FileLogger);
    expect(() => by.one('logger').resolve(container)).toThrowError(DependencyNotFoundError);
  });

  it('should resolve by alias', () => {
    @register(alias('ILogger'), scope((s) => s.hasTag('root')))
    class FileLogger {}

    @register(alias('ILogger'), scope((s) => s.hasTag('child')))
    class DbLogger {}

    const container = new Container({ tags: ['root'] })
      .addRegistration(R.fromClass(FileLogger))
      .addRegistration(R.fromClass(DbLogger));

    const result1 = by.one('ILogger').resolve(container);
    const child = container.createScope({ tags: ['child'] });
    const result2 = by.one('ILogger').resolve(child);

    expect(result1).toBeInstanceOf(FileLogger);
    expect(result2).toBeInstanceOf(DbLogger);
  });

  it('should resolve by aliases', () => {
    interface ILogger {}

    @register(alias('ILogger'))
    class FileLogger implements ILogger {}

    @register(alias('ILogger'))
    class DbLogger implements ILogger {}

    class App {
      constructor(@inject(by.aliasOne('ILogger')) public loggers: ILogger[]) {}
    }

    const container = new Container().addRegistration(R.fromClass(FileLogger));

    const loggers = container.resolve(App).loggers;
    container.addRegistration(R.fromClass(DbLogger));
    const loggers2 = container.resolve(App).loggers;

    expect(loggers).toEqual(loggers2);
  });
});

```

### Decorator
Sometimes you want to decorate you class with some logic. This is what `DecoratorProvider` is for.
- `provider(decorate((instance, container) => new LoggerDecorator(instance)))`

```typescript
import { by, Container, decorate, IContainer, inject, register, Registration as R, singleton } from 'ts-ioc-container';

describe('lazy provider', () => {
  @register(singleton())
  class Logger {
    private logs: string[] = [];

    log(message: string) {
      this.logs.push(message);
    }

    printLogs() {
      return this.logs.join(',');
    }
  }

  interface IRepository {
    save(item: Todo): Promise<void>;
  }

  interface Todo {
    id: string;
    text: string;
  }

  class LogRepository implements IRepository {
    constructor(
      private repository: IRepository,
      @inject(by.one('Logger').lazy()) private logger: Logger,
    ) {}

    async save(item: Todo): Promise<void> {
      this.logger.log(item.id);
      return this.repository.save(item);
    }
  }

  const logRepo = (dep: IRepository, scope: IContainer) => scope.resolve(LogRepository, { args: [dep] });

  @register('IRepository', decorate(logRepo))
  class TodoRepository implements IRepository {
    async save(item: Todo): Promise<void> {}
  }

  class App {
    constructor(@inject(by.one('IRepository')) public repository: IRepository) {}

    async run() {
      await this.repository.save({ id: '1', text: 'Hello' });
      await this.repository.save({ id: '2', text: 'Hello' });
    }
  }

  function createContainer() {
    const container = new Container();
    container.addRegistration(R.fromClass(TodoRepository)).addRegistration(R.fromClass(Logger));
    return container;
  }

  it('should decorate repo by logger middleware', async () => {
    // Arrange
    const container = createContainer();

    // Act
    const app = container.resolve(App);
    const logger = container.resolve<Logger>('Logger');
    await app.run();

    // Assert
    expect(logger.printLogs()).toBe('1,2');
  });
});

```

## Registration
Registration is provider factory which registers provider in container.
- `@register('logger')`
- `Registration.fromClass(Logger).to('logger')`
- `Registration.fromClass(Logger)`
- `Registration.fromValue(Logger)`
- `Registration.fromFn((container, ...args) => container.resolve(Logger, {args}))`

### Key
Sometimes you want to register provider with certain key. This is what `key` is for.

- by default, key is class name
- you can assign the same key to different registrations

```typescript
import 'reflect-metadata';
import { Container, register, Registration as R, scope, singleton } from 'ts-ioc-container';
import { DependencyMissingKeyError } from '../../lib/errors/DependencyMissingKeyError';

describe('Registration module', function () {
  const createContainer = () => new Container({ tags: ['root'] });

  it('should register class', function () {
    @register('ILogger', scope((s) => s.hasTag('root')), singleton())
    class Logger {}

    const root = createContainer().addRegistration(R.fromClass(Logger));

    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register value', function () {
    const root = createContainer().addRegistration(R.fromValue('smth').assignToKey('ISmth'));

    expect(root.resolve('ISmth')).toBe('smth');
  });

  it('should register fn', function () {
    const root = createContainer().addRegistration(R.fromFn(() => 'smth').assignToKey('ISmth'));

    expect(root.resolve('ISmth')).toBe('smth');
  });

  it('should raise an error if key is not provider', () => {
    expect(() => {
      createContainer().addRegistration(R.fromValue('smth'));
    }).toThrowError(DependencyMissingKeyError);
  });

  it('should register dependency by class name if @key is not provided', function () {
    class FileLogger {}

    const root = createContainer().addRegistration(R.fromClass(FileLogger));

    expect(root.resolve('FileLogger')).toBeInstanceOf(FileLogger);
  });

  it('should assign additional key which redirects to original one', function () {
    @register('ILogger', 'Logger', singleton())
    class Logger {}

    const root = createContainer().addRegistration(R.fromClass(Logger));

    expect(root.resolve('Logger')).toBeInstanceOf(Logger);
    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });
});

```

### Scope
Sometimes you need to register provider only in scope which matches to certain condition and their sub scopes. Especially if you want to register dependency as singleton for some tags, for example `root`
- `@register(scope((container) => container.hasTag('root'))` - register provider only in root scope
- `Registration.fromClass(Logger).when((container) => container.hasTag('root'))`

```typescript
import 'reflect-metadata';
import { singleton, Container, Registration as R, scope, register } from 'ts-ioc-container';

@register('ILogger', scope((s) => s.hasTag('root')), singleton())
class Logger {}
describe('ScopeProvider', function () {
  it('should return the same instance', function () {
    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope();
    expect(root.resolve('ILogger')).toBe(child.resolve('ILogger'));
  });
});

```

## Module
Sometimes you want to encapsulate registration logic in separate module. This is what `IContainerModule` is for.

```typescript
import 'reflect-metadata';
import { IContainerModule, Registration as R, IContainer, key, Container, register } from 'ts-ioc-container';

@register('ILogger')
class Logger {}

@register('ILogger')
class TestLogger {}

class Production implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(Logger));
  }
}

class Development implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(TestLogger));
  }
}

describe('Container Modules', function () {
  function createContainer(isProduction: boolean) {
    return new Container().useModule(isProduction ? new Production() : new Development());
  }

  it('should register production dependencies', function () {
    const container = createContainer(true);

    expect(container.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register development dependencies', function () {
    const container = createContainer(false);

    expect(container.resolve('ILogger')).toBeInstanceOf(TestLogger);
  });
});

```

## Hook
Sometimes you need to invoke methods after construct or dispose of class. This is what hooks are for.

### OnConstruct
```typescript
import 'reflect-metadata';
import {
  constructor,
  Container,
  hook,
  IContainer,
  IInjector,
  InjectOptions,
  key,
  MetadataInjector,
  register,
  Registration as R,
  runHooks,
} from 'ts-ioc-container';

class MyInjector implements IInjector {
  private injector = new MetadataInjector();

  resolve<T>(container: IContainer, value: constructor<T>, options: InjectOptions): T {
    const instance = this.injector.resolve(container, value, options);
    runHooks(instance as object, 'onConstruct', { scope: container });
    return instance;
  }
}

@register('logger')
class Logger {
  isReady = false;

  @hook('onConstruct', (context) => {
    context.invokeMethod({ args: [] });
  }) // <--- or extract it to @onConstruct
  initialize() {
    this.isReady = true;
  }

  log(message: string): void {
    console.log(message);
  }
}

describe('onConstruct', function () {
  it('should make logger be ready on resolve', function () {
    const container = new Container({ injector: new MyInjector() }).addRegistration(R.fromClass(Logger));

    const logger = container.resolve<Logger>('logger');

    expect(logger.isReady).toBe(true);
  });
});

```

### OnDispose
```typescript
import 'reflect-metadata';
import { by, Container, hook, inject, register, Registration as R, runHooks, singleton } from 'ts-ioc-container';

@register('logsRepo', singleton())
class LogsRepo {
  savedLogs: string[] = [];

  saveLogs(messages: string[]) {
    this.savedLogs.push(...messages);
  }
}

@register('logger')
class Logger {
  @hook('onDispose', ({ instance, methodName }) => {
    // @ts-ignore
    instance[methodName].push('world');
  }) // <--- or extract it to @onDispose
  private messages: string[] = [];

  constructor(@inject(by.one('logsRepo')) private logsRepo: LogsRepo) {}

  log(@inject(by.one('logsRepo')) message: string): void {
    this.messages.push(message);
  }

  size(): number {
    return this.messages.length;
  }

  @hook('onDispose', (c) => {
    c.invokeMethod({ args: [] });
  }) // <--- or extract it to @onDispose
  async save(): Promise<void> {
    this.logsRepo.saveLogs(this.messages);
  }
}

describe('onDispose', function () {
  it('should invoke hooks on all instances', async function () {
    const container = new Container().addRegistration(R.fromClass(Logger)).addRegistration(R.fromClass(LogsRepo));

    const logger = container.resolve<Logger>('logger');
    logger.log('Hello');

    for (const instance of by.instances().resolve(container)) {
      runHooks(instance as object, 'onDispose', { scope: container });
    }

    expect(container.resolve<LogsRepo>('logsRepo').savedLogs.join(',')).toBe('Hello,world');
  });
});

```

### Inject property

```typescript
import { by, Container, hook, injectProp, Registration, runHooks, runHooksAsync } from 'ts-ioc-container';

describe('inject property', () => {
  it('should inject property', () => {
    class App {
      @hook('onInit', injectProp(by.one('greeting')))
      greeting!: string;
    }
    const expected = 'Hello world!';

    const container = new Container().addRegistration(Registration.fromValue(expected).assignToKey('greeting'));
    const app = container.resolve(App);
    runHooks(app as object, 'onInit', { scope: container });

    expect(app.greeting).toBe(expected);
  });
});

```

## Mock
Sometimes you need to automatically mock all dependencies in container. This is what `AutoMockedContainer` is for.

```typescript
import { AutoMockedContainer, Container, DependencyKey } from 'ts-ioc-container';
import { IMock, Mock } from 'moq.ts';

export class MoqContainer extends AutoMockedContainer {
  private mocks = new Map<DependencyKey, IMock<any>>();

  resolve<T>(key: DependencyKey): T {
    return this.resolveMock<T>(key).object();
  }

  resolveMock<T>(key: DependencyKey): IMock<T> {
    if (!this.mocks.has(key)) {
      this.mocks.set(key, new Mock());
    }
    return this.mocks.get(key) as IMock<T>;
  }

  resolveByClass<T>(target: any, options?: { args?: unknown[] }): T {
    throw new Error('Method not implemented.');
  }

  resolveOneByKey<T>(key: DependencyKey): T {
    return this.resolveMock<T>(key).object();
  }

  resolveMany<T>(alias: DependencyKey): T[] {
    throw new Error('Method not implemented.');
  }

  resolveOneByAlias<T>(key: DependencyKey): T {
    throw new Error('Method not implemented.');
  }
}

interface IEngine {
  getRegistrationNumber(): string;
}

describe('Mocking', () => {
  it('should auto-mock dependencies', () => {
    const mockContainer = new MoqContainer();
    const container = new Container({ parent: mockContainer });

    const engineMock = mockContainer.resolveMock<IEngine>('IEngine');
    engineMock.setup((i) => i.getRegistrationNumber()).returns('123');

    const engine = container.resolve<IEngine>('IEngine');

    expect(engine.getRegistrationNumber()).toBe('123');
  });
});

```

## Error

- [DependencyNotFoundError.ts](..%2F..%2Flib%2Ferrors%2FDependencyNotFoundError.ts)
- [MethodNotImplementedError.ts](..%2F..%2Flib%2Ferrors%2FMethodNotImplementedError.ts)
- [DependencyMissingKeyError.ts](..%2F..%2Flib%2Ferrors%2FDependencyMissingKeyError.ts)
- [ContainerDisposedError.ts](..%2F..%2Flib%2Ferrors%2FContainerDisposedError.ts)

