# Typescript IoC (Inversion Of Control) container

![NPM version:latest](https://img.shields.io/npm/v/ts-ioc-container/latest.svg?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/ts-ioc-container.svg?style=flat-square)
![npm bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/ts-ioc-container)
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
npm install ts-ioc-container ts-constructor-injector reflect-metadata
```
```shell script
yarn add ts-ioc-container ts-constructor-injector reflect-metadata
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
How to create new container

```typescript
import { Container, IContainer, IInjector, Provider } from "ts-ioc-container";
import { resolve } from 'ts-constructor-injector';

class Logger {
  info(message: string) {
    console.log(message);
  }
}

const injector: IInjector = {
  resolve<T>(container: IContainer, value: constructor<T>, ...deps: unknown[]): T {
    return resolve(container)(value, ...deps);
  },
};

const container = new Container(injector)
  .register('ILogger', Provider.fromClass(Logger));
const logger = container.resolve<ILogger>('ILogger');
logger.info('Hello world');
```

## Provider

```typescript
import { Provider, singleton, tags } from "ts-ioc-container";

const container = new Container(injector, { tags: ['root'] });
container.register('ILogger', new Provider((container, ...args) => new Logger(...args)));

// Available only in root scope and all his children
container.register('ILogger', Provider.fromClass(Logger).pipe(tags('root')));

// Singleton per root tag and all his children
container.register('ILogger', Provider.fromClass(Logger).pipe(singleton(), tags('root')));

// singleton for scope with tag1 or tag2
container.register('ILogger', Provider.fromClass(Logger).pipe(singleton(), tags('tag1', 'tag2')));

// singleton in every scope
container.register('ILogger', Provider.fromClass(Logger).pipe(args('dev'), singleton()));

// singleton in every scope
container.register('ILogger', Provider.fromClass(Logger).pipe(argsFn((scope) => [scope.resolve('isTestEnv') ? 'dev' : 'prod']), singleton()));

container.register('ILogger', Provider.fromValue(new Logger()));
```

## Registration module (Provider + DependencyKey)

```typescript
import { singleton, tags, forKey, Registration } from "ts-ioc-container";

@forKey('ILogger')
@provider(singleton(), tags('root'))
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
import { singleton, tags, forKey, by, Registration } from "ts-ioc-container";
import { inject } from "ts-constructor-injector";

@forKey('IEngine')
@provider(singleton(), tags('root'))
class Engine {
  constructor(@inject(by('ILogger')) private logger: ILogger) {
  }
}

// OR

const perRoot = provider(singleton(), tags('root'))

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
} from "ts-ioc-container";
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
import { forKey, provider, Registration, singleton } from "ts-ioc-container";

@forKey('IEngine')
@provider(tags('root'), singleton())
class Logger {
}

@forKey('IEngine')
@provider(tags('home'), singleton())
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

## Mocking / Tests

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

