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
npm install ts-ioc-container
```
```shell script
yarn add ts-ioc-container
```
Add `reflect-metadata` for IoC
```shell script
npm install reflect-metadata
```
```shell script
yarn add reflect-metadata
```

## Bundled size
Full-featured IoC bundle (decorators `@inject`, hooks `@onDispose` `@onConstruct`)
- Stat size: **13.34 KB**
- Parsed size: **5.44 KB**
- Gzipped size: **1.63 KB**

## Configuration
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Recipes

### ServiceLocator
How to create new simple locator

```typescript
import { SimpleLocatorBuilder, ProviderBuilder } from 'ts-ioc-container';

const locator = new SimpleLocatorBuilder().build();
locator.register('ILogger', ProviderBuilder.fromConstructor(Logger).build());
const logger = locator.resolve<ILogger>('ILogger');
```
### Injectors
Simple injector

```typescript
import {ProviderBuilder, SimpleLocatorBuilder} from "ts-ioc-container";

class Car {
    constructor(locator: IServiceLocator) {
        const engine = locator.resolve<IEngine>('IEngine')
    }
}

const locator = new SimpleLocatorBuilder().build();
locator.register('IEngine', ProviderBuilder.fromConstructor(Engine).build());
const car = locator.resolve(Car);
```
IoC injector. Compose `@inject` decorator as you need. Or use default `createInjectDecorator`;

```typescript
import 'reflect-metadata';
import {
  metadataCollector,
  InjectFnDecorator,
  InjectMetadataCollector,
  ProviderBuilder,
  InjectionToken,
  IocLocatorBuilder
} from 'ts-ioc-container';
import { InjectFn } from "./InjectFn";
import { IServiceLocator } from "./IServiceLocator";
import { IocLocatorBuilder } from "./IocLocatorBuilder";

export const constructorMetadataCollector = new InjectMetadataCollector(Symbol.for('CONSTRUCTOR_METADATA_KEY'));
export const inject: InjectFnDecorator = (injectionFn) => (target, propertyKey, parameterIndex) => {
  constructorMetadataCollector.addMetadata(target, parameterIndex, injectionFn);
};
export const Factory = <T>(key: InjectionToken<T>, ...args1) => l => (...args2: any[]) => l.resolve(key, ...args1, ...args2);
export const Item = <T>(key: InjectionToken<T>, ...args: any[]) => l => l.resolve(key, ...args);
export const Collection = <T>(...injections: InjectFn<T>[]) => l => injections.map(fn => fn(l));

/**
 * OR
 * export const inject = createInjectDecorator(constructorMetadataCollector);
 * export const inject = createInjectFnDecorator(constructorMetadataCollector);
 */

const locator = new IocLocatorBuilder(constructorMetadataCollector).build();
locator.register<IEngine>('IEngine', ProviderBuilder.fromConstructor(Engine).asRequested().build());

class Car {
  constructor(
    @inject(l => l.resolve('IEngine', 'V1')) private engine1: IEngine,
    @inject(l => l) private locator: IServiceLocator,
    /**
     * OR
     * @inject('IEngine', 'V8') private engine8: IEngine, // by using createInjectDecorator
     */
    @inject(Item('IEngine', 'V8')) private engine8: IEngine,
    @inject(Collection(Item('IEngine', 'V2'), Item('IEngine', 'V4'), Item('IEngine', 'V6'))) private engines: IEngine[],
    @inject(Factory('IEngine', 'V12')) private engineFactory: (model: string) => IEngine,
  ) {
    const newEngine = engineFactory('SuperCharger');
  }
}

const car = locator.resolve(Car);
```

## ProviderBuilder

```typescript
import {ProviderBuilder} from "ts-ioc-container";

locator.register('ILogger', new ProviderBuilder((l, ...args) => new Logger(...args)).asRequested());
locator.register('ILogger1', ProviderBuilder.fromConstructor(Logger).asSingleton().forLevel(0).build()); // global singleton
locator.register('ILogger2', ProviderBuilder.fromConstructor(Logger).asSingleton().forLevel(1).build()); // first scope singleton
locator.register('ILogger3', ProviderBuilder.fromConstructor(Logger).asSingleton().forTags(['tag1', 'tag2']).build()); // singleton for scope with tag1 or tag2
locator.register('ILogger4', ProviderBuilder.fromConstructor(Logger).withArgs('dev').asSingleton().build()); // singleton in every scope
```

## Hooks

```typescript
import {
  IocLocatorBuilder,
  ProviderKey,
  InjectMetadataCollector,
  MethodsMetadataCollector,
  HookedProvider,
  IInstanceHook
} from "ts-ioc-container";
import { Mock } from "moq.ts";
import { ProviderBuilder } from "./ProviderBuilder";
import { IocLocatorBuilder } from "./IocLocatorBuilder";

export const constructorMetadataCollector = new InjectMetadataCollector(Symbol.for('CONSTRUCTOR_METADATA_KEY'));
export const onConstructMetadataCollector = new MethodsMetadataCollector(Symbol.for('OnConstructHook'));
export const onConstruct: MethodDecorator = (target, propertyKey) => {
  // eslint-disable-next-line @typescript-eslint/ban-types
  onConstructMetadataCollector.addHook(target, propertyKey);
};

export const onDisposeMetadataCollector = new MethodsMetadataCollector(Symbol.for('OnDisposeHook'));
export const onDispose: MethodDecorator = (target, propertyKey) => {
  // eslint-disable-next-line @typescript-eslint/ban-types
  onDisposeMetadataCollector.addHook(target, propertyKey);
};

/**
 * OR
 * export const onConstruct = createHookDecorator(onConstructMetadataCollector)
 * export const onDispose = createHookDecorator(onDisposeMetadataCollector)
 */

const hook: IInstanceHook = {
  onConstruct<GInstance>(instance: GInstance): void {
    onConstructMetadataCollector.invokeHooksOf(instance);
  },
  onDispose<GInstance>(instance: GInstance): void {
    onDisposeMetadataCollector.invokeHooksOf(instance);
  }
}

const locator = new IocLocatorBuilder(constructorMetadataCollector).withInjectorHook(hook).build();

class Car {
  constructor() {
  }

  @onConstruct
  public initialize() {
    console('initialized!');
  }

  @onDispose
  public dispose() {
    console('disposed!');
  }
}

const car = locator.resolve(Car); // output: initialized!
locator.dispose(); // output: disposed!

class Engine {
  constructor() {
  }

  @onConstruct
  public initialize() {
    console('initialized!');
  }

  @onDispose
  public dispose() {
    console('disposed!');
  }
}

// in the case if you don't want to use locator.resolve to instanciate Engine you should use .withHook
locator.register('IEngine', new ProviderBuilder(() => new Engine()).withHook(hook).build())
const engine = locator.resolve(Engine); // output: initialized!
locator.dispose(); // output: disposed!
```

## Scoped locators

```typescript
const scope = locator.createLocator(['tag1', 'tag2']);
const logger = scope.resolve('ILogger');
scope.dispose();
```

## Mocking / Tests

```typescript
import { MoqRepository } from "./MoqRepository";
import {
  SimpleLocatorBuilder,
  MockProviderStorage
} from "ts-ioc-container";
import { MoqProviderStorage } from "./MoqProviderStorage";
import { IEngine } from "./IEngine";
import { SimpleLocatorBuilder } from "./SimpleLocatorBuilder";

describe('test', () => {
  const mockProviderStorage = new MoqProviderStorage(new MockProviderStorage(() => new MoqProvider()));
  const locator = new SimpleLocatorBuilder().withMockedRepository(mockProviderStorage).build();

  const engineMock = mockProviderStorage.findMock<IEngine>('IEngine');
  engineMock.setup(i => i.getRegistrationNumber()).return('123');

  const engine = locator.resolve<IEngine>('IEngine');

  expect(engine.getRegistrationNumber()).toBe('123');
})
```
MoqStorage
```typescript
import { VendorMockProviderStorage, ProviderKey } from 'ts-ioc-container';
import { MoqProvider } from './MoqProvider';
import { IMock } from 'moq.ts';

export class MoqProviderStorage extends VendorMockProviderStorage {
  findOrCreate<T>(key: ProviderKey): MoqProvider<T> {
    return this.storage.findOrCreate(key) as MoqProvider<T>;
  }

  findMock<T>(key: ProviderKey): IMock<T> {
    return (this.storage.findOrCreate(key) as MoqProvider<T>).mock;
  }
}
```

MoqProvider
```typescript
import { MockProvider, IServiceLocator } from 'ts-ioc-container';
import { Mock } from 'moq.ts';

export class MoqProvider<T> extends MockProvider<T> {
  mock = new Mock<T>();

  resolve(locator: IServiceLocator, ...args: any[]): T {
    return this.mock.object();
  }
}
```


## Errors

- ProviderNotFoundError
- MethodNotImplementedError
- ProviderNotClonedError
