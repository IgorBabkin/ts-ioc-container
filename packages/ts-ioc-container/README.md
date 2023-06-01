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
npm install @ibabkin/ts-ioc-container @ibabkin/ts-constructor-injector reflect-metadata
```
```shell script
yarn add @ibabkin/ts-ioc-container @ibabkin/ts-constructor-injector reflect-metadata
```

## tsconfig.json
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```


## Injector
As long as injector is not part of container, you can implement injection on your choice (simple, proxy, based on reflection).

### Reflection injector (recommended)

```typescript
import { Container, IContainer, IInjector, Provider, by } from "@ibabkin/ts-request-mediator";
import { inject, resolve } from "ts-constructor-injector";

const injector: IInjector = {
  resolve<T>(container: IContainer, Target: constructor<T>, ...deps: unknown[]): T {
    return resolve(container)(Target, ...deps);
  },
};

class Logger implements ILogger {
  info(message: string) {
    console.log(message);
  }
}

class App {
  constructor(@inject(by('ILogger')) private logger: ILogger) {
  }

  run() {
    this.logger.info('Hello world');
  }
}

const container = new Container(injector)
  .register('ILogger', Provider.fromClass(Logger));

const app = container.resolve(App);
app.run();
```

### Simple injector

```typescript
import { IContainer } from "@ibabkin/ts-request-mediator";

const injector: IInjector = {
  resolve<T>(container: IContainer, Target: constructor<T>, ...deps: unknown[]): T {
    return new Target(container, ...deps);
  },
};

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

const container = new Container(injector)
  .register('ILogger', Provider.fromClass(Logger));

const app = container.resolve(App);
app.run();
```

### Proxy injector

```typescript
import { IContainer } from "@ibabkin/ts-request-mediator";

const injector: IInjector = {
  resolve<T>(container: IContainer, Target: constructor<T>, ...deps: unknown[]): T {
    const args = deps.reduce((acc, it) => ({ ...acc, ...it }), {});
    const proxy = new Proxy(
      {},
      {
        // eslint-disable-next-line @typescript-eslint/ban-types
        get(target: {}, prop: string | symbol): any {
          // eslint-disable-next-line no-prototype-builtins
          return args.hasOwnProperty(prop) ? args[prop] : container.resolve(prop);
        },
      },
    );
    return new Target(proxy);
  },
};

class Logger implements ILogger {
  info(message: string) {
    console.log(message);
  }
}

class App {
  private logger: ILogger;

  constructor({logger}: {logger: ILogger}) {
    this.logger = logger;
  }
  
  run() {
    this.logger.info('Hello world');
  }
}

const container = new Container(injector)
  .register('logger', Provider.fromClass(Logger));

const app = container.resolve(App);
app.run();
```

## Provider

- `Provider.fromClass` - creates dependency provider from class
- `.pipe` - decorates provider by features and returns new provider
- `asSingleton()` - makes provider singleton (singleton in every scope)
- `perTags(...tags: string[])` - makes provider available only in scope with certain tags and their sub scopes
- `withArgs(...args: unknown[])` - passes arguments to constructor
- `withArgsFn(fn: (scope: IContainer) => unknown[])` - passes arguments to constructor as function result

```typescript
import { Provider, asSingleton, perTags, withArgs, withArgsFn } from "@ibabkin/ts-request-mediator";

const container = new Container(injector, { tags: ['root'] });
container.register('ILogger', new Provider((container, ...args) => new Logger(...args)));

// Available only in root scope and all his children
container.register('ILogger', Provider.fromClass(Logger).pipe(perTags('root')));

// Singleton per root tag and all his children
container.register('ILogger', Provider.fromClass(Logger).pipe(asSingleton(), perTags('root')));

// singleton for scope with tag1 or tag2
container.register('ILogger', Provider.fromClass(Logger).pipe(asSingleton(), perTags('tag1', 'tag2')));

// singleton in every scope
container.register('ILogger', Provider.fromClass(Logger).pipe(withArgs('dev'), asSingleton()));

// singleton in every scope
container.register('ILogger', Provider.fromClass(Logger).pipe(withArgsFn((scope) => [scope.resolve('isTestEnv') ? 'dev' : 'prod']), asSingleton()));

container.register('ILogger', Provider.fromValue(new Logger()));
```

## Registration module (Provider + DependencyKey)

```typescript
import { asSingleton, perTags, forKey, Registration } from "@ibabkin/ts-request-mediator";

@forKey('ILogger')
@provider(asSingleton(), perTags('root'))
class Logger {
  info(message: string) {
    console.log(message);
  }
}

const container = new Container(injector, { tags: ['root'] })
  .add(Registration.fromClass(Logger));
const logger = container.resolve<ILogger>('ILogger');
logger.info('Hello world');
```

## Decorators

```typescript
import { asSingleton, perTags, forKey, by, Registration } from "@ibabkin/ts-request-mediator";
import { inject } from "ts-constructor-injector";

@forKey('IEngine')
@provider(asSingleton(), perTags('root'))
class Engine {
  constructor(@inject(by('ILogger')) private logger: ILogger) {
  }
}

// OR

const perRoot = provider(asSingleton(), perTags('root'))

@perRoot
@forKey('IEngine')
class Engine {
  constructor(@inject(by('ILogger')) private logger: ILogger) {
  }
}

const container = new Container(injector, { tags: ['root'] })
  .add(Registration.fromClass(Engine));
```

## Hooks

```typescript
import {
  Container,
  IInjector,
  ContainerHook,
  Injector,
  Registration,
} from "@ibabkin/ts-request-mediator";
import { MethodReflector } from "ts-constructor-injector";

export const onConstructReflector = new MethodReflector('OnConstructHook');
export const onConstruct = onConstructReflector.createMethodHookDecorator();

export const onDisposeReflector = new MethodReflector('OnDisposeHook');
export const onDispose = onDisposeReflector.createMethodHookDecorator();

@forKey('ILogger')
class Logger {
  @onConstruct
  initialize() {
    console.log('initialized');
  }

  @onDispose
  dispose() {
    console.log('disposed');
  }
}

const injector: IInjector = {
  resolve<T>(container: IContainer, value: constructor<T>, ...deps: unknown[]): T {
    const instance = resolve(container)(value, ...deps);
    onConstructReflector.invokeHooksOf(instance)
    return instance;
  },
}

const container = new Container(injector)
  .add(Registration.fromClass(Logger));
const logger = container.resolve<ILogger>('ILogger'); // initialized
for (const instance of container.getInstances()) {
  onDisposeReflector.invokeHooksOf(instance); // disposed
}
```

## Scopes (child containers)

- tags - you can add tag to scope and root container. And register provider per tag.

```typescript
import { composeDecorators } from "ts-constructor-injector";
import { forKey, provider, Registration, asSingleton, perTags } from "@ibabkin/ts-request-mediator";

@forKey('IEngine')
@provider(perTags('root'), asSingleton())
class Logger {
}

@forKey('IEngine')
@provider(perTags('home'), asSingleton())
class Engine {
  constructor(@inject(by('ILogger')) private logger: ILogger) {
  }
}

const container = new Container(injector, { tags: ['root'] })
  .add(Registration.fromClass(Logger))
  .add(Registration.fromClass(Engine));

const scope = container.createScope(['home', 'child']);
const logger = scope.resolve('ILogger');
scope.dispose();
```

## Container Modules

```typescript
import { Registration } from "@ibabkin/ts-request-mediator";

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

## Mocking / Tests

```typescript
import {
  AutoMockedContainer,
  Container,
  DependencyKey,
} from "@ibabkin/ts-request-mediator";
import { Mock } from "moq.ts";

export class MoqContainer extends AutoMockedContainer {
  private mocks = new Map<DependencyKey, IMock<any>>();

  resolve<T>(key: DependencyKey): T {
    return this.resolveMock<T>(key).object();
  }

  dispose(): void {
    this.mocks.clear();
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

