# Typescript IoC (Inversion Of Control) container :boom: :100: :green_heart:

![NPM version:latest](https://img.shields.io/npm/v/ts-ioc-container/latest.svg?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/ts-ioc-container.svg?style=flat-square)
![npm bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/ts-ioc-container)
![License](https://img.shields.io/npm/l/ts-ioc-container)

## Advantages
- written on `typescript`
- simple and lightweight (roughly it's just one file of **~100 lines**) :heart:
- clean API
- supports `tagged scopes`
- fully test covered
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
import { Container, IContainer, IInjector, fromClass } from "ts-ioc-container";
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

const container = new Container(injector);
container.register(fromClass(Logger).forKey('ILogger').build());
const logger = container.resolve<ILogger>('ILogger');
logger.info('Hello world');
```

## Registration builder

```typescript
import { fromClass, fromFn, fromValue } from "ts-ioc-container";

const container = new Container(injector, { tags: ['root'] });
container.register(fromFn((container, ...args) => new Logger(...args)).forKey('ILogger').build());

// Available only in root scope and all his children
container.register(fromClass(Logger).forKey('ILogger').perTags('root').build());

// Singleton per root tag and all his children
container.register(fromClass(Logger).forKey('ILogger').asSingleton().perTags('root').build());
// OR
container.register(fromClass(Logger).forKey('ILogger').asSingleton('root').build());

// singleton for scope with tag1 or tag2
container.register(fromClass(Logger).forKey('ILogger').asSingleton('tag1', 'tag2').build()); 

// singleton in every scope
container.register(fromClass(Logger).forKey('ILogger').withArgs('dev').asSingleton().build());

container.register(fromValue(new Logger()).forKey('ILogger').build());
```

## Decorators

```typescript
import { asSingleton, perTags, forKey, by } from "ts-ioc-container";
import { composeDecorators, inject } from "ts-constructor-injector";

@forKey('IEngine')
@asSingleton('root')
class Engine {
  constructor(@inject(by('ILogger')) private logger: ILogger) {
  }
}

// OR

const perRoot = composeDecorators(
  asSingleton(),
  perTags('root'),
);

@perRoot
@forKey('IEngine')
class Engine {
  constructor(@inject(by('ILogger')) private logger: ILogger) {
  }
}

const container = new Container(injector, { tags: ['root'] })
  .register(fromClass(Engine).build());
```

## Hooks

```typescript
import {
  Container,
  IInjector,
  ContainerHook,
  Injector,
  fromClass
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
  .register(fromClass(Logger).build());
const logger = container.resolve<ILogger>('ILogger'); // initialized
for (const instance of container.getInstances()) {
  onDisposeReflector.invokeHooksOf(instance); // disposed
}
```

## Scopes (child containers)

- tags - you can add tag to scope and root container. And register provider per tag.

```typescript
import { composeDecorators } from "ts-constructor-injector";
import { forKey } from "ts-ioc-container";

@asSingleton('root')
@forKey('IEngine')
class Logger {
}

@asSingleton('home')
@forKey('IEngine')
class Engine {
  constructor(@inject(by('ILogger')) private logger: ILogger) {
  }
}

const container = new Container(injector, { tags: ['root'] })
  .register(fromClass(Logger).build())
  .register(fromClass(Engine).build());

const scope = container.createScope(['home', 'child']);
const logger = scope.resolve('ILogger');
scope.dispose();
```

## Mocking / Tests

```typescript
import {
  AutoMockedContainer,
  Container,
} from "ts-ioc-container";
import { Mock } from "moq.ts";

export class MoqContainer extends AutoMockedContainer {
  private mocks = new Map<ProviderKey, IMock<any>>();

  resolve<T>(key: ProviderKey): T {
    return this.resolveMock<T>(key).object();
  }

  dispose(): void {
    this.mocks.clear();
  }

  resolveMock<T>(key: ProviderKey): IMock<T> {
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

- [ProviderNotFoundError.ts](lib%2Fprovider%2FProviderNotFoundError.ts)
- [RegistrationMissingKeyError.ts](lib%2Fregistration%2FRegistrationMissingKeyError.ts)
- [MethodNotImplementedError.ts](lib%2FMethodNotImplementedError.ts)
- [ContainerDisposedError.ts](lib%2Fcontainer%2FContainerDisposedError.ts)

