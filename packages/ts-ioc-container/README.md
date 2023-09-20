# Typescript IoC (Inversion Of Control) container

![NPM version:latest](https://img.shields.io/npm/v/ts-ioc-container/latest.svg?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/ts-ioc-container.svg?style=flat-square)
![npm package minimized gzipped size (select exports)](https://img.shields.io/bundlejs/size/ts-ioc-container)
[![Coverage Status](https://coveralls.io/repos/github/IgorBabkin/ts-ioc-container/badge.svg?branch=master)](https://coveralls.io/github/IgorBabkin/ts-ioc-container?branch=master)
![License](https://img.shields.io/npm/l/ts-ioc-container)

## Advantages
- battle tested :boom:
- written on `typescript`
- simple and lightweight (roughly it's just one file of **~100 lines**) :heart:
- clean API :green_heart:
- supports `tagged scopes`
- fully test covered :100:
- can be used with decorators `@inject`
- composable and open to extend
- awesome for testing (auto mocking)

## Content

- [Setup](#setup)
- [Container](#container)
    - [Basic usage](#basic-usage)
    - [Scopes](#scopes)
    - [Instances](#instances)
    - [Disposing](#disposing)
- [Injectors](#injectors)
    - [Reflection injector](#reflection-injector) `@inject`
    - [Simple injector](#simple-injector)
    - [Proxy injector](#proxy-injector)
- [Providers](#providers)
    - [Provider](#provider) `@provider`
    - [Singleton provider](#singleton-provider)
    - [Tagged provider](#tagged-provider)
    - [Args provider](#args-provider)
- [Container modules](#container-modules)
    - [Basic usage](#basic-usage-1)
    - [Registration module (Provider + DependencyKey)](#registration-module-provider--dependencykey) `@key`
- [Hooks](#hooks) `@hook`
    - [OnConstruct](#onconstruct) `@onConstruct`
    - [OnDispose](#ondispose) `@onDispose`
- [Tests and Mocks](#tests-and-mocks)
- [Errors](#errors)

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
`IContainer` consists of 2 main parts:

- Providers - describes how to create instances of dependencies
- Injector - describes how to inject dependencies to constructor

### Basic usage

```typescript
import 'reflect-metadata';
import { by, Container, inject, ReflectionInjector, Provider } from 'ts-ioc-container';

describe('Basic usage', function () {
  it('should inject dependencies', function () {
    class Logger {
      name = 'Logger';
    }

    class App {
      constructor(@inject(by('ILogger')) public logger: Logger) {}
    }

    const container = new Container(new ReflectionInjector()).register('ILogger', Provider.fromClass(Logger));

    expect(container.resolve(App).logger.name).toBe('Logger');
  });
});

```

### Scopes
Sometimes you need to create a scope of container. For example, when you want to create a scope per request in web application. You can assign tags to scope and provider and resolve dependencies only from certain scope.

- NOTICE: remember that when scope doesn't have dependency then it will be resolved from parent container
- NOTICE: when you create a scope of container then all providers are cloned to new scope. For that reason every provider has methods `clone` and `isValid` to clone itself and check if it's valid for certain scope accordingly.
- NOTICE: when you create a scope then we clone ONLY tags-matched providers.

```typescript
import 'reflect-metadata';
import {
  singleton,
  Container,
  DependencyNotFoundError,
  key,
  tags,
  provider,
  ReflectionInjector,
  Registration,
} from 'ts-ioc-container';

@key('ILogger')
@provider(singleton(), tags('child'))
class Logger {}

describe('Scopes', function () {
  it('should resolve dependencies from scope', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).use(Registration.fromClass(Logger));
    const child = root.createScope('child');

    expect(child.resolve('ILogger')).toBe(child.resolve('ILogger'));
    expect(() => root.resolve('ILogger')).toThrow(DependencyNotFoundError);
  });
});

```

### Instances
Sometimes you want to get all instances from container and its scopes. For example, when you want to dispose all instances of container.

- you can get instances from container and scope which were created by injector

```typescript
import 'reflect-metadata';
import { Container, Provider, ReflectionInjector } from 'ts-ioc-container';
describe('Instances', function () {
  it('should return injected instances', function () {
    class Logger {}

    const container = new Container(new ReflectionInjector()).register('ILogger', Provider.fromClass(Logger));
    const scope = container.createScope();

    const logger1 = container.resolve('ILogger');
    const logger2 = scope.resolve('ILogger');

    expect(scope.getInstances().length).toBe(1);
    expect(container.getInstances().length).toBe(2);
  });
});

```

### Disposing
Sometimes you want to dispose container and all its scopes. For example, when you want to prevent memory leaks. Or you want to ensure that nobody can use container after it was disposed.

- container can be disposed
- when container is disposed then all scopes are disposed too
- when container is disposed then it unregisters all providers and remove all instances

```typescript
import 'reflect-metadata';
import { Container, ContainerDisposedError, Provider, ReflectionInjector } from 'ts-ioc-container';

class Logger {}

describe('Disposing', function () {
  it('should container and make it unavailable for the further usage', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).register(
      'ILogger',
      Provider.fromClass(Logger),
    );
    const child = root.createScope('child');

    const logger = child.resolve('ILogger');
    root.dispose();

    expect(() => child.resolve('ILogger')).toThrow(ContainerDisposedError);
    expect(() => root.resolve('ILogger')).toThrow(ContainerDisposedError);
    expect(root.getInstances().length).toBe(0);
  });
});

```

## Injectors
`IInjector` is used to describe how dependencies should be injected to constructor.

- `ReflectionInjector` - injects dependencies using `@inject` decorator
- `ProxyInjector` - injects dependencies as dictionary `Record<string, unknown>`
- `SimpleInjector` - just passes container to constructor with others arguments

### Reflection injector
This type of injector uses `@inject` decorator to mark where dependencies should be injected. It's bases on `reflect-metadata` package. That's why I call it `ReflectionInjector`.

```typescript
import 'reflect-metadata';
import { by, Container, inject, Provider, ReflectionInjector } from 'ts-ioc-container';

class Logger {
  name = 'Logger';
}

class App {
  constructor(@inject(by('ILogger')) private logger: Logger) {}

  // OR
  // constructor(@inject((container, ...args) => container.resolve('ILogger', ...args)) private logger: ILogger) {
  // }

  getLoggerName(): string {
    return this.logger.name;
  }
}

describe('Reflection Injector', function () {
  it('should inject dependencies by @inject decorator', function () {
    const container = new Container(new ReflectionInjector()).register('ILogger', Provider.fromClass(Logger));

    const app = container.resolve(App);

    expect(app.getLoggerName()).toBe('Logger');
  });
});

```

### Simple injector
This type of injector just passes container to constructor with others arguments.

```typescript
import 'reflect-metadata';
import { Container, IContainer, Provider, SimpleInjector } from 'ts-ioc-container';

describe('SimpleInjector', function () {
  it('should pass container as first parameter', function () {
    class App {
      constructor(public container: IContainer) {}
    }

    const container = new Container(new SimpleInjector()).register('App', Provider.fromClass(App));
    const app = container.resolve<App>('App');

    expect(app.container).toBeInstanceOf(Container);
  });

  it('should pass parameters alongside with container', function () {
    class App {
      constructor(container: IContainer, public greeting: string) {}
    }

    const container = new Container(new SimpleInjector()).register('App', Provider.fromClass(App));
    const app = container.resolve<App>('App', 'Hello world');

    expect(app.greeting).toBe('Hello world');
  });
});

```

### Proxy injector
This type of injector injects dependencies as dictionary `Record<string, unknown>`.

```typescript
import 'reflect-metadata';
import { Container, Provider, ProxyInjector, args } from 'ts-ioc-container';

describe('ProxyInjector', function () {
  it('should pass dependency to constructor as dictionary', function () {
    class Logger {}

    class App {
      logger: Logger;

      constructor({ logger }: { logger: Logger }) {
        this.logger = logger;
      }
    }

    const container = new Container(new ProxyInjector()).register('logger', Provider.fromClass(Logger));

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

    const container = new Container(new ProxyInjector())
      .register('App', Provider.fromClass(App).pipe(args({ greetingTemplate })))
      .register('logger', Provider.fromClass(Logger));

    const app = container.resolve<App>('App', { name: `world` });
    expect(app.greeting).toBe('Hello world');
  });
});

```

## Providers
`IProvider<T>` is used to describe how instances should be created. It has next basic methods:
- `resolve` - creates instance with passed arguments
- `clone` - we invoke it when we create a scope. It clones provider to new scope.
- `isValid` - checks if provider can be resolved from container or cloned to container with certain tags

There are next types of providers:
- `Provider` - basic provider. It can be used with `@provider` decorator
- `SingletonProvider` - provider that creates only one instance in every scope where it's resolved
- `TaggedProvider` - provider that can be resolved only from container with certain tags and their sub scopes
- `ArgsProvider` - provider that encapsulates arguments to pass it to constructor.

### Provider

```typescript
import 'reflect-metadata';
import { singleton, Container, tags, Provider, ReflectionInjector } from 'ts-ioc-container';

class Logger {}

describe('Provider', function () {
  it('can be registered as a function', function () {
    const container = new Container(new ReflectionInjector()).register('ILogger', new Provider(() => new Logger()));

    expect(container.resolve('ILogger')).not.toBe(container.resolve('ILogger'));
  });

  it('can be registered as a value', function () {
    const container = new Container(new ReflectionInjector()).register('ILogger', Provider.fromValue(new Logger()));

    expect(container.resolve('ILogger')).toBe(container.resolve('ILogger'));
  });

  it('can be registered as a class', function () {
    const container = new Container(new ReflectionInjector()).register('ILogger', Provider.fromClass(Logger));

    expect(container.resolve('ILogger')).not.toBe(container.resolve('ILogger'));
  });

  it('can be featured by pipe method', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).register(
      'ILogger',
      Provider.fromClass(Logger).pipe(singleton(), tags('root')),
    );

    expect(root.resolve('ILogger')).toBe(root.resolve('ILogger'));
  });
});

```

### Singleton provider
Sometimes you need to create only one instance of dependency per scope. For example, you want to create only one logger per scope.

- Singleton provider creates only one instance in every scope where it's resolved.
- NOTICE: if you create a scope 'A' of container 'root' then Logger of A !== Logger of root.

```typescript
import 'reflect-metadata';
import { singleton, Container, key, provider, ReflectionInjector, Registration } from 'ts-ioc-container';

@key('logger')
@provider(singleton())
class Logger {}

describe('Singleton', function () {
  function createContainer() {
    return new Container(new ReflectionInjector());
  }

  it('should resolve the same container per every request', function () {
    const container = createContainer().use(Registration.fromClass(Logger));

    expect(container.resolve('logger')).toBe(container.resolve('logger'));
  });

  it('should resolve different dependency per scope', function () {
    const container = createContainer().use(Registration.fromClass(Logger));
    const child = container.createScope();

    expect(container.resolve('logger')).not.toBe(child.resolve('logger'));
  });

  it('should resolve the same dependency for scope', function () {
    const container = createContainer().use(Registration.fromClass(Logger));
    const child = container.createScope();

    expect(child.resolve('logger')).toBe(child.resolve('logger'));
  });
});

```

### Tagged provider
Sometimes you need to resolve provider only from container with certain tags and their sub scopes. Especially if you want to register dependency as singleton for some tags, for example `root`
- NOTICE: It doesn't make clones in not tagged-matched scopes. Usually it's used with `SingletonProvider`.

```typescript
import 'reflect-metadata';
import { singleton, Container, key, tags, provider, ReflectionInjector, Registration } from 'ts-ioc-container';

@key('ILogger')
@provider(singleton(), tags('root')) // the same as .pipe(singleton(), tags('root'))
class Logger {}
describe('TaggedProvider', function () {
  it('should return the same instance', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).use(Registration.fromClass(Logger));
    const child = root.createScope();
    expect(root.resolve('ILogger')).toBe(child.resolve('ILogger'));
  });
});

```

### Args provider
Sometimes you want to bind some arguments to provider. This is what `ArgsProvider` is for.
- NOTICE: args from this provider has higher priority than args from `resolve` method.

```typescript
import 'reflect-metadata';
import { Container, key, argsFn, args, ReflectionInjector, Registration } from 'ts-ioc-container';

@key('logger')
class Logger {
  constructor(public name: string, public type?: string) {}
}

describe('ArgsProvider', function () {
  function createContainer() {
    return new Container(new ReflectionInjector());
  }

  it('can assign argument function to provider', function () {
    const root = createContainer().use(Registration.fromClass(Logger).pipe(argsFn((container, ...args) => ['name'])));

    const logger = root.createScope().resolve<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('can assign argument to provider', function () {
    const root = createContainer().use(Registration.fromClass(Logger).pipe(args('name')));

    const logger = root.resolve<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('should set provider arguments with highest priority in compare to resolve arguments', function () {
    const root = createContainer().use(Registration.fromClass(Logger).pipe(args('name')));

    const logger = root.resolve<Logger>('logger', 'file');

    expect(logger.name).toBe('name');
    expect(logger.type).toBe('file');
  });
});

```

## Container modules
Sometimes you want to encapsulate registration logic in separate module. This is what `IContainerModule` is for.

### Basic usage

```typescript
import 'reflect-metadata';
import { IContainerModule, Registration, IContainer, key, Container, ReflectionInjector } from 'ts-ioc-container';

@key('ILogger')
class Logger {}

@key('ILogger')
class TestLogger {}

class Production implements IContainerModule {
  applyTo(container: IContainer): void {
    container.use(Registration.fromClass(Logger));
  }
}

class Development implements IContainerModule {
  applyTo(container: IContainer): void {
    container.use(Registration.fromClass(TestLogger));
  }
}

describe('Container Modules', function () {
  function createContainer(isProduction: boolean) {
    return new Container(new ReflectionInjector()).use(isProduction ? new Production() : new Development());
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

### Registration module (Provider + DependencyKey)
Sometimes you need to keep dependency key with class together. For example, you want to register class with key 'ILogger' and you want to keep this key with class. This is what `Registration` is for.

```typescript
import 'reflect-metadata';
import { singleton, Container, tags, provider, ReflectionInjector, Registration, key } from 'ts-ioc-container';

@key('ILogger')
@provider(singleton(), tags('root'))
class Logger {}

describe('Registration module', function () {
  it('should bind dependency key to class', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).use(Registration.fromClass(Logger));

    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });
});

```

## Hooks
Sometimes you need to invoke methods after construct or dispose of class. This is what hooks are for.

### OnConstruct
```typescript
import 'reflect-metadata';
import {
  constructor,
  Container,
  key,
  getHooks,
  hook,
  IContainer,
  IInjector,
  ReflectionInjector,
  Registration,
} from 'ts-ioc-container';
import * as console from 'console';

class MyInjector implements IInjector {
  private injector = new ReflectionInjector();

  resolve<T>(container: IContainer, value: constructor<T>, ...deps: unknown[]): T {
    const instance = this.injector.resolve(container, value, ...deps);
    // eslint-disable-next-line @typescript-eslint/ban-types
    for (const h of getHooks(instance, 'onConstruct')) {
      // @ts-ignore
      instance[h]();
    }
    return instance;
  }
}

@key('logger')
class Logger {
  isReady = false;

  @hook('onConstruct') // <--- or extract it to @onConstruct
  initialize() {
    this.isReady = true;
  }

  log(message: string): void {
    console.log(message);
  }
}

describe('onConstruct', function () {
  it('should make logger be ready on resolve', function () {
    const container = new Container(new MyInjector()).use(Registration.fromClass(Logger));

    const logger = container.resolve<Logger>('logger');

    expect(logger.isReady).toBe(true);
  });
});

```

### OnDispose
```typescript
import 'reflect-metadata';
import {
  singleton,
  by,
  Container,
  key,
  getHooks,
  hook,
  inject,
  provider,
  Registration,
  ReflectionInjector,
} from 'ts-ioc-container';

@key('logsRepo')
@provider(singleton())
class LogsRepo {
  savedLogs: string[] = [];

  saveLogs(messages: string[]) {
    this.savedLogs.push(...messages);
  }
}

@key('logger')
class Logger {
  private messages: string[] = [];

  constructor(@inject(by('logsRepo')) private logsRepo: LogsRepo) {}

  log(message: string): void {
    this.messages.push(message);
  }

  @hook('onDispose') // <--- or extract it to @onDispose
  async save(): Promise<void> {
    this.logsRepo.saveLogs(this.messages);
    this.messages = [];
  }
}

describe('onDispose', function () {
  it('should invoke hooks on all instances', async function () {
    const container = new Container(new ReflectionInjector())
      .use(Registration.fromClass(Logger))
      .use(Registration.fromClass(LogsRepo));

    const logger = container.resolve<Logger>('logger');
    logger.log('Hello');

    for (const instance of container.getInstances()) {
      // eslint-disable-next-line @typescript-eslint/ban-types
      for (const h of getHooks(instance as object, 'onDispose')) {
        // @ts-ignore
        await instance[h]();
      }
    }

    expect(container.resolve<LogsRepo>('logsRepo').savedLogs).toContain('Hello');
  });
});

```

## Tests and Mocks
Sometimes you need to automatically mock all dependencies in container. This is what `AutoMockedContainer` is for.

```typescript
import { AutoMockedContainer, Container, DependencyKey, ReflectionInjector } from 'ts-ioc-container';
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
}

interface IEngine {
  getRegistrationNumber(): string;
}

describe('Mocking', () => {
  it('should auto-mock dependencies', () => {
    const mockContainer = new MoqContainer();
    const container = new Container(new ReflectionInjector(), { parent: mockContainer });

    const engineMock = mockContainer.resolveMock<IEngine>('IEngine');
    engineMock.setup((i) => i.getRegistrationNumber()).returns('123');

    const engine = container.resolve<IEngine>('IEngine');

    expect(engine.getRegistrationNumber()).toBe('123');
  });
});

```

## Errors

- [DependencyNotFoundError.ts](lib%2Fcontainer%2FDependencyNotFoundError.ts)
- [DependencyMissingKeyError.ts](lib%2Fregistration%2FDependencyMissingKeyError.ts)
- [MethodNotImplementedError.ts](lib%2FMethodNotImplementedError.ts)
- [ContainerDisposedError.ts](lib%2Fcontainer%2FContainerDisposedError.ts)

