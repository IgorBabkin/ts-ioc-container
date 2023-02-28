# Typescript IoC (Inversion Of Control) container :boom: :100: :green_heart:

![NPM version:latest](https://img.shields.io/npm/v/ts-ioc-container/latest.svg?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/ts-ioc-container.svg?style=flat-square)
![npm bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/ts-ioc-container)
![License](https://img.shields.io/npm/l/ts-ioc-container)

## Advantages
- written on typescript
- simple and lightweight (roughly it's just one file of **~100 lines**) :heart:
- clean API
- supports scopes
- fully test covered
- can be used with decorators `@inject`
- provides auto-factories
- supports `onConstruct` and `dispose` instance hooks
- composable and open to extend
- awesome for testing (auto mocks)

## Install
```shell script
npm install ts-ioc-container reflect-metadata
```
```shell script
yarn add ts-ioc-container reflect-metadata
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


## Container
How to create new container

```typescript
import { Container, IInjector, ProviderBuilder } from "ts-ioc-container";
import { resolve } from 'ts-constructor-injector';

const injector: IInjector = {
  resolve<T>(locator: Resolveable, value: constructor<T>, ...deps: unknown[]): T {
    return resolve(locator)(value, ...deps);
  },
};
const container = new Container(injector);
container.register('ILogger', ProviderBuilder.fromClass(Logger).build());
const logger = container.resolve<ILogger>('ILogger');
```

## ProviderBuilder

```typescript
import { fromClass, ProviderBuilder } from "ts-ioc-container";

container.register('ILogger', new ProviderBuilder((container, ...args) => new Logger(...args)).build());
container.register('ILogger1', ProviderBuilder.fromClass(Logger).forKey('ILogger').asSingleton().forLevel(0).build()); // global singleton
container.register('ILogger2', ProviderBuilder.fromClass(Logger).asSingleton().forLevel(1).build()); // first scope singleton
container.register('ILogger3', ProviderBuilder.fromClass(Logger).asSingleton().forTags(['tag1', 'tag2']).build()); // singleton for scope with tag1 or tag2
container.register('ILogger4', ProviderBuilder.fromClass(Logger).withArgs('dev').asSingleton().build()); // singleton in every scope
```

## Decorators

```typescript
import { asSingleton, perTags, forKey, by } from "ts-ioc-container";
import { inject } from "ts-constructor-injector";

@asSingleton
@forKey('IEngine')
@perTags('tag1', 'tag2')
class Engine {
  constructor(@inject(by('ILogger')) private logger: ILogger) {
  }
}
```

## Hooks

```typescript
import {
  MethodReflector,
  createMethodHookDecorator,
  Container,
  IInjector,
  ContainerHook,
  ProviderBuilder,
} from "ts-ioc-container";

export const onConstructReflector = new MethodReflector('OnConstructHook');
export const onConstruct = onConstructReflector.createMethodHookDecorator();

export const onDisposeReflector = new MethodReflector('OnDisposeHook');
export const onDispose = onDisposeReflector.createMethodHookDecorator();

class Logger {
  @onConstruct
  initialize() {
  }

  @onDispose
  dispose() {}
}

const injector: IInjector = {
  resolve<T>(locator: Resolveable, value: constructor<T>, ...deps: unknown[]): T {
    const instance = resolve(locator)(value, ...deps);
    onConstructMetadataCollector.invokeHooksOf(instance)
    return instance;
  },
};
const container = new Container(injector).setHook(new ContainerHook((instance) => {
  onDisposeMetadataCollector.invokeHooksOf(instance);
}));
container.register('ILogger', ProviderBuilder.fromClass(Logger).build());
const logger = container.resolve<ILogger>('ILogger');
```

## Scoped locators

- levels - every scope has level (0, 1, 2, 3). 0 is root. And register provider per level.
- tags - you can add tag to scope and root container. And register provider per tag.

```typescript
const scope = container.createScope(['tag1', 'tag2']);
const logger = scope.resolve('ILogger');
scope.dispose();
```

## Mocking / Tests

```typescript
import {
  IMockRepository,
  Container,
  SimpleInjector,
} from "ts-ioc-container";
import { Mock } from "moq.ts";

export class MoqRepository implements IMockRepository {
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
  const mockRepository = new MoqRepository();
  const container = new Container(new SimpleInjector()).map((l) => new AutoMockedContainer(l, mockRepository));

  const engineMock = mockRepository.resolveMock<IEngine>('IEngine');
  engineMock.setup(i => i.getRegistrationNumber()).return('123');

  const engine = container.resolve<IEngine>('IEngine');

  expect(engine.getRegistrationNumber()).toBe('123');
})
```


## Errors

- ProviderNotFoundError
- ProviderHasNoKeyError
- MethodNotImplementedError
- ContainerDisposedError
