# Typescript IoC (Inversion Of Control) container

![NPM version:latest](https://img.shields.io/npm/v/ts-ioc-container/latest.svg?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/ts-ioc-container.svg?style=flat-square)
![npm bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/ts-ioc-container)
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

## Install
```shell script
npm install ts-ioc-container reflect-metadata
```
```shell script
yarn add ts-ioc-container reflect-metadata
```

## Setup
### reflect-metadata
Just put it in the main file of your project. It should be the first line of the code.
```typescript
import 'reflect-metadata';
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Container `IContainer`
It consists of 2 main parts:

- Providers - describes how to create instances of dependencies
- Injector - describes how to inject dependencies to constructor

### Basic usage

```typescript
{{{include_file './__tests__/readme/basic.spec.ts'}}}
```

### Scopes
Sometimes you need to create a scope of container. For example, when you want to create a scope per request in web application.

- NOTICE: remember that when scope doesn't have dependency then it will be resolved from parent container
- NOTICE: when you create a scope of container then all providers are cloned to new scope. For that reason every provider has methods `clone` and `isValid` to clone itself and check if it's valid for certain scope accordingly.

```typescript
import { Container, ReflectionInjector } from "ts-ioc-container";

const container = new Container(new ReflectionInjector());
const scope = container.createScope();
```

### Tags
Sometimes you want to mark some providers and resolve them only from certain scope. So you can assign tags to providers and create scopes with certain tags. For that reason every scope has method `hasTag` which we invoke from provider to check if it's valid for certain scope.

- tag - is a string that we assign to provider and scope/container
- every provider can be registered per certain tags and cannot be resolved from container with other tags. Only from parent one with certain tags.
- NOTICE: when you create a scope then we clone ONLY tags-matched providers.

```typescript
import { Container, perTags, ReflectionInjector } from "ts-ioc-container";

const container = new Container(new ReflectionInjector(), { tags: ['root'] }).register('ILogger', Provider.fromClass(Logger).pipe(perTags('root')));
const scope = container.createScope(['child']);

scope.resolve('ILogger'); // it will be resolved from container, not from scope
```

### Instances
Sometimes you want to get all instances from container and its scopes. For example, when you want to dispose all instances of container.

- you can get instances from container and scope which were created by injector

```typescript
{{{include_file './__tests__/readme/instances.spec.ts'}}}
```

### Disposing
Sometimes you want to dispose container and all its scopes. For example, when you want to prevent memory leaks. Or you want to ensure that nobody can use container after it was disposed.

- container can be disposed
- when container is disposed then all scopes are disposed too
- when container is disposed then it unregisters all providers and remove all instances

```typescript
import { asSingleton, Container, perTags, ReflectionInjector, ContainerDisposedError } from "ts-ioc-container";

const container = new Container(new ReflectionInjector(), { tags: ['root'] }).register('ILogger', Provider.fromClass(Logger));
const scope = container.createScope(['child']);

const logger = scope.resolve('ILogger');
container.dispose();

expect(() => scope.resolve('ILogger')).toThrow(ContainerDisposedError);
expect(() => container.resolve('ILogger')).toThrow(ContainerDisposedError);
expect(container.getInstances().length).toBe(0);
```

## Injectors `IInjector`
Injectors are used to describe how dependencies should be injected to constructor.

- `ReflectionInjector` - injects dependencies using `@inject` decorator
- `ProxyInjector` - injects dependencies as dictionary `Record<string, unknown>`
- `SimpleInjector` - just passes container to constructor with others arguments

### Reflection injector
This type of injector uses `@inject` decorator to mark where dependencies should be injected. It's bases on `reflect-metadata` package. That's why I call it `ReflectionInjector`.

```typescript
import { Container, IContainer, IInjector, Provider, by, inject, resolve } from "ts-ioc-container";

class Logger implements ILogger {
  info(message: string) {
    console.log(message);
  }
}

class App {
  constructor(@inject((container, ...args) => container.resolve('ILogger', ...args)) private logger: ILogger) {
  }

  // OR
  // constructor(@inject(by('ILogger')) private logger: ILogger) {
  // }

  run() {
    this.logger.info('Hello world');
  }
}

const container = new Container(new ReflectionInjector())
  .register('ILogger', Provider.fromClass(Logger));

const app = container.resolve(App);
app.run();
```

### Simple injector
This type of injector just passes container to constructor with others arguments.

```typescript
import { SimpleInjector, IContainer } from "ts-ioc-container";

class Logger implements ILogger {
  info(message: string) {
    console.log(message);
  }
}

class App {
  private logger: ILogger;

  constructor(private container: IContainer) {
    this.logger = container.resolve('ILogger');
  }

  run() {
    this.logger.info('Hello world');
  }
}

const container = new Container(new SimpleInjector())
  .register('ILogger', Provider.fromClass(Logger));

const app = container.resolve(App);
app.run();
```

### Proxy injector
This type of injector injects dependencies as dictionary `Record<string, unknown>`.

```typescript
import { ProxyInjector, IContainer } from "ts-ioc-container";

class Logger implements ILogger {
  info(message: string) {
    console.log(message);
  }
}

class App {
  private logger: ILogger;

  constructor({ logger }: { logger: ILogger }) {
    this.logger = logger;
  }

  run() {
    this.logger.info('Hello world');
  }
}

const container = new Container(new ProxyInjector())
  .register('logger', Provider.fromClass(Logger));

const app = container.resolve(App);
app.run();
```

## Providers `IProvider<T>`
Providers are used to describe how instances should be created. It has next basic methods:
- `resolve` - creates instance with passed arguments
- `clone` - we invoke it when we create a scope. It clones provider to new scope.
- `isValid` - checks if provider can be resolved from container or cloned to container with certain tags

There are next types of providers:
- `Provider` - basic provider
- `SingletonProvider` - provider that creates only one instance in every scope where it's resolved
- `TaggedProvider` - provider that can be resolved only from container with certain tags and their sub scopes
- `ArgsProvider` - provider that encapsulates arguments to pass it to constructor.

### Provider

From function

```typescript
import { Provider } from "ts-ioc-container";

container.register('ILogger', new Provider((container, ...args) => new Logger(container, ...args)));
```

From class

```typescript
import { Provider } from "ts-ioc-container";

container.register('ILogger', Provider.fromClass(Logger));
```

From value

```typescript
import { Provider } from "ts-ioc-container";

container.register('ILogger', Provider.fromValue(new Logger()));
```

`pipe` - decorates provider by other providers

```typescript
import { asSingleton, perTags, Provider, SingletonProvider, TaggedProvider } from "ts-ioc-container";

container.register('ILogger', Provider.fromClass(Logger).pipe((provider) => new SingletonProvider(provider)), (provider) => new TaggedProvider(provider, ['root']));

// OR
container.register('ILogger', Provider.fromClass(Logger).pipe(asSingleton(), perTags('root')));

// OR
@provider(asSingleton(), perTags('root'))
class Logger {
}

container.register('ILogger', Provider.fromClass(Logger));
```

### Singleton provider
Sometimes you need to create only one instance of dependency per scope. For example, you want to create only one logger per scope.

- Singleton provider creates only one instance in every scope where it's resolved.
- NOTICE: if you create a scope 'A' of container 'root' then Logger of A !== Logger of root.

```typescript
import { Provider, SingletonProvider, asSingleton } from "ts-ioc-container";

container.register('ILogger', Provider.fromClass(Logger).pipe((provider) => new SingletonProvider(provider)));
// OR
container.register('ILogger', Provider.fromClass(Logger).pipe(asSingleton()));

container.resolve('ILogger') === container.resolve('ILogger'); // true

const scope = container.createScope();
scope.resolve('ILogger') === scope.resolve('ILogger'); // true
container.resolve('ILogger') !== scope.resolve('ILogger'); // true. NOTICE: because every provider is cloned for every child scope from parent one
```

### Tagged provider
Sometimes you need to resolve provider only from container with certain tags and their sub scopes. Especially if you want to register dependency as singleton for some tags, for example `root`
- NOTICE: It doesn't make clones in not tagged-matched scopes. Usually it's used with `SingletonProvider`.

```typescript
import { Provider, TaggedProvider, asSingleton, perTags } from "ts-ioc-container";

container.register('ILogger', Provider.fromClass(Logger).pipe((provider) => new TaggedProvider(provider, ['root'])));
// OR
container.register('ILogger', Provider.fromClass(Logger).pipe(perTags('root', 'parent')));

// with sigleton
container.register('ILogger', Provider.fromClass(Logger).pipe(perTags('root', 'parent')).pipe(asSingleton()));
container.resolve('ILogger') === container.resolve('ILogger'); // true

const scope = container.createScope();
scope.resolve('ILogger') === scope.resolve('ILogger'); // true
container.resolve('ILogger') === scope.resolve('ILogger'); // true
```

### Args provider
Sometimes you want to bind some arguments to provider. This is what `ArgsProvider` is for.
- NOTICE: args from this provider has higher priority than args from `resolve` method.

```typescript
import { Provider, ArgsProvider, withArgs, withArgsFn } from "ts-ioc-container";

class Logger {
  constructor(public type: string, public name: string) {
  }
}

container.register('ILogger', Provider.fromClass(Logger).pipe((provider) => new ArgsProvider(provider, () => ['FileLogger'])));

// OR
container.register('ILogger', Provider.fromClass(Logger).pipe(withArgsFn(() => ['FileLogger'])));
// OR
container.register('ILogger', Provider.fromClass(Logger).pipe(withArgs('FileLogger')));

container.resolve('ILogger', 'Main').type === 'FileLogger'; // true
container.resolve('ILogger', 'Main').name === 'Main'; // true
```

## Container modules
Sometimes you want to encapsulate registration logic in separate module. This is what `IContainerModule` is for.

```typescript
import { Registration } from "ts-ioc-container";

class Development implements IContainerModule {
  applyTo(container: IContainer): void {
    container.add(Registration.fromClass(DevLogger));
  }
}

class Production implements IContainerModule {
  applyTo(container: IContainer): void {
    container.add(Registration.fromClass(ProdLogger));
  }
}

const container = new Container(injector, { tags: ['root'] })
  .add(Registration.fromClass(Logger))
  .add(process.env.NODE_ENV === 'production' ? new Production() : new Development());
```

## Registration module (Provider + DependencyKey)
Sometimes you need to keep dependency key with class together. For example, you want to register class with key 'ILogger' and you want to keep this key with class. This is what `Registration` is for.

```typescript
import { asSingleton, perTags, forKey, Registration, Provider } from "ts-ioc-container";

@forKey('ILogger')
@provider(asSingleton(), perTags('root'))
class Logger {
  info(message: string) {
    console.log(message);
  }
}

container.register(Registration.fromClass(Logger));

// OR

@provider(asSingleton(), perTags('root'))
class Logger {
  info(message: string) {
    console.log(message);
  }
}

container.register('ILogger', Provider.fromClass(Logger));
```

## Hooks
Sometimes you need to invoke methods after construct or dispose of class. This is what hooks are for.

```typescript
import {
  Container,
  IInjector,
  ContainerHook,
  Injector,
  Registration,
  getHooks,
  hook,
} from "ts-ioc-container";

class MyInjector implements IInjector {
  private injector = new ReflectionInjector();

  resolve<T>(container: IContainer, value: constructor<T>, ...deps: unknown[]): T {
    const instance = this.injector.resolve(container, value, ...deps);
    for (const h of getHooks(instance, 'onConstruct')) {
      // @ts-ignore
      instance[h]();
    }
    return instance;
  }
}

@forKey('ILogger')
class Logger {
  @hook('onConstruct')
  initialize() {
    console.log('initialized');
  }

  @hook('onDispose')
  dispose() {
    console.log('disposed');
  }
}

const container = new Container(new MyInjector())
  .add(Registration.fromClass(Logger));
const logger = container.resolve<ILogger>('ILogger'); // initialized

for (const instance of container.getInstances()) {
  for (const h of getHooks(instance, 'onDispose')) {
    // @ts-ignore
    instance[h](); // disposed
  }
}
```

## Mocking / Tests `AutoMockedContainer`
Sometimes you need to automatically mock all dependencies in container. This is what `AutoMockedContainer` is for.

```typescript
import {
  AutoMockedContainer,
  Container,
  DependencyKey,
} from "ts-ioc-container";
import { Mock } from "moq.ts";

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

describe('test', () => {
  const mockContainer = new MoqContainer();
  const container = new Container(injector, { parent: mockContainer });

  const engineMock = mockContainer.resolveMock<IEngine>('IEngine');
  engineMock.setup(i => i.getRegistrationNumber()).return('123');

  const engine = container.resolve<IEngine>('IEngine');

  expect(engine.getRegistrationNumber()).toBe('123');
})
```


## Errors

- [DependencyNotFoundError.ts](lib%2Fcontainer%2FDependencyNotFoundError.ts)
- [DependencyMissingKeyError.ts](lib%2Fregistration%2FDependencyMissingKeyError.ts)
- [MethodNotImplementedError.ts](lib%2FMethodNotImplementedError.ts)
- [ContainerDisposedError.ts](lib%2Fcontainer%2FContainerDisposedError.ts)

