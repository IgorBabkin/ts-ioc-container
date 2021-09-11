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
import {ServiceLocator, ProviderRepository, ProviderBuilder} from 'ts-ioc-container';

const container = new ServiceLocator(() => new SimpleInjector(), new ProviderRepository());
locator.register('ILogger', ProviderBuilder.fromConstructor(Logger).asRequested());
const logger = locator.resolve<ILogger>('ILogger');
```
### Injectors
Simple injector

```typescript
import {ServiceLocator, ProviderRepository, ProviderBuilder, SimpleInjector} from "ts-ioc-container";

class Car {
    constructor(locator: IServiceLocator) {
        const engine = locator.resolve<IEngine>('IEngine')
    }
}

const container = new ServiceLocator(() => new SimpleInjector(), new ProviderRepository());
container.register('IEngine', ProviderBuilder.fromConstructor(Engine).asRequested());
const car = container.resolve(Car);
```
IoC injector

```typescript
import 'reflect-metadata';
import {
  ServiceLocator,
  IocInjector,
  metadataCollector,
  InjectFnDecorator,
  InjectMetadataCollector,
  ProviderRepository,
  ProviderBuilder,
  InjectionToken,
} from 'ts-ioc-container';
import { InjectFn } from "./InjectFn";
import { IServiceLocator } from "./IServiceLocator";

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

const container = new ServiceLocator(() => new IocInjector(constructorMetadataCollector), new ProviderRepository());
container.register<IEngine>('IEngine', ProviderBuilder.fromConstructor(Engine).asRequested());

class Car {
  constructor(
    @inject(l => l.resolve('IEngine', 'V1')) private engine1: IEngine,
    @inject(l => l) private locator: IServiceLocator,
    /**
     * OR
     * @inject('IEngine', 'V8') private engine8: IEngine, // by using createInjectDecorator
     * @inject(['IBike', 'ICar']) private vehicles: IVehicles[],
     */
    @inject(Item('IEngine', 'V8')) private engine8: IEngine,
    @inject(Collection(Item('IEngine', 'V2'), Item('IEngine', 'V4'), Item('IEngine', 'V6'))) private engines: IEngine[],
    @inject(Factory('IEngine', 'V12')) private engineFactory: (model: string) => IEngine,
  ) {
    const newEngine = engineFactory('SuperCharger');
  }
}

const car = container.resolve(Car);
```

## ProviderBuilder

```typescript
import {ProviderBuilder} from "ts-ioc-container";

locator.register('ILogger', new ProviderBuilder((l, ...args) => new Logger(...args)).asRequested());
locator.register('ILogger1', ProviderBuilder.fromConstructor(Logger).asSingleton());
locator.register('ILogger2', ProviderBuilder.fromConstructor(Logger).asScoped());
locator.register('ILogger3', ProviderBuilder.fromConstructor(Logger).withArgs('dev').asSingleton());
```

## Hooks

```typescript
import {
  ServiceLocator,
  SimpleInjector,
  ProviderKey,
  IocInjector,
  InstanceHookInjector,
  ProviderRepository,
  HookServiceLocator,
  InstanceHookProvider
} from "ts-ioc-container";
import { Mock } from "moq.ts";
import { IInstanceHook } from "./IInstanceHook";

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

const container = new HookServiceLocator(new ServiceLocator(() => new InstanceHookInjector(new IocInjector(), hook), new ProviderRepository()), {
  onBeforeRegister: (provider) => new InstanceHookProvider(provider, hook)
})

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

const car = container.resolve(Car); // output: initialized!
container.dispose(); // output: disposed!
```

## Scoped locators

```typescript
const scope = container.createLocator();
const logger = scope.resolve('ILogger');
scope.dispose();
```

## Mocking / Tests

```typescript
import {MoqRepository} from "./MoqRepository";
import {ProviderRepository, SimpleInjector, ServiceLocator, MockedRepository} from "ts-ioc-container";
import {MoqProvider} from "./MoqProvider";
import {IEngine} from "./IEngine";

describe('test', () => {
    const mockStorage = new MoqStorage();
    const container = new ServiceLocator(() => new SimpleInjector(), new MockedRepository(new ProviderRepository(), mockStorage));
    
    const engineMock = mockStorage.findMock<IEngine>('IEngine');
    engineMock.setup(i => i.getRegistrationNumber()).return('123');
    
    const engine = container.resolve<IEngine>('IEngine');
    
    expect(engine.getRegistrationNumber()).toBe('123');
})
```
MoqStorage
```typescript
import { IMockStorage, ProviderKey, IServiceLocator } from 'ts-ioc-container';
import { MoqProvider } from './MoqProvider';
import { IMock } from 'moq.ts';

export class MoqStorage implements IMockStorage {
    private readonly mocks = new Map<ProviderKey, MoqProvider<any>>();

    dispose(): void {
        this.mocks.clear();
    }

    findOrCreate<T>(key: ProviderKey): MoqProvider<T> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, new MoqProvider());
        }

        return this.mocks.get(key) as MoqProvider<T>;
    }

    findMock<T>(key: ProviderKey): IMock<T> {
        return this.findOrCreate<T>(key).mock;
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
