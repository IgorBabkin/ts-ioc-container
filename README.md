![npm bundle size](https://img.shields.io/bundlephobia/minzip/ts-ioc-container)

# Typescript IoC and service locator container :boom: :100: :green_heart:

## Advantages
- written on typescript
- simple and lightweight (roughly it's just one file of **~100 lines**) :heart:
- clean API
- supports scopes
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

## Recipes

All features []

### ServiceLocator
How to create new simple locator

```typescript
import {ServiceLocator} from 'ts-ioc-container';
import {ProviderRepository} from "./ProviderRepository";
import {ProviderBuilder} from "./ProviderBuilder";

const container = new ServiceLocator(() => new SimpleInjector(), new ProviderRepository());
locator.register('ILogger', ProviderBuilder.fromConstructor(Logger).asRequested());
const logger = locator.resolve<ILogger>('ILogger');
```
### Injectors
Simple injector

```typescript
import {IServiceLocator} from "./IServiceLocator";
import {Provider} from "./Provider";
import {ProviderRepository} from "./ProviderRepository";
import {ProviderBuilder} from "./ProviderBuilder";

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
import {ServiceLocator, IocInjector, metadataCollector} from 'ts-ioc-container';
import {args} from "./helpers";
import {Provider} from "./Provider";
import {ConstructorMetadataCollector} from "./ConstructorMetadataCollector";
import {ProviderRepository} from "./ProviderRepository";
import {ProviderBuilder} from "./ProviderBuilder";

export const constructorMetadataCollector = new ConstructorMetadataCollector();
export const inject =
    <T>(providerKey: PropertyKey): ParameterDecorator =>
        (target, propertyKey, parameterIndex) => {
            constructorMetadataCollector.addMetadata(target, parameterIndex, (l, ...args) => l.resolve(providerKey, ...args));
        };
const container = new ServiceLocator(() => new IocInjector(constructorMetadataCollector), new ProviderRepository());
container.register<IEngine>('IEngine', ProviderBuilder.fromConstructor(Engine).asRequested());

class Car {
    constructor(@inject('IEngine') private engine: IEngine) {
    }
}

const car = container.resolve(Car);
```

## ProviderBuilder

```typescript
import {ProviderBuilder} from "./ProviderBuilder";

locator.register('ILogger', new ProviderBuilder((l, ...args) => new Logger(...args)).asRequested());
locator.register('ILogger1', ProviderBuilder.fromConstructor(Logger).asSingleton());
locator.register('ILogger2', ProviderBuilder.fromConstructor(Logger).asScoped());
locator.register('ILogger3', ProviderBuilder.fromConstructor(Logger).withArgs('dev').asSingleton());
```

## Hooks

```typescript
import {ServiceLocator} from "./ServiceLocator";
import {SimpleInjector} from "./SimpleInjector";
import {ProviderKey} from "./IProvider";
import {Mock} from "moq.ts";
import {IServiceLocator} from "./IServiceLocator";
import {ProviderBuilder} from "./ProviderBuilder";

export const onConstructMetadataCollector = new MethodsMetadataCollector(Symbol('OnConstructHook'));
export const onConstruct: MethodDecorator = (target, propertyKey) => {
    // eslint-disable-next-line @typescript-eslint/ban-types
    onConstructMetadataCollector.addHook(target, propertyKey);
};

export const onDisposeMetadataCollector = new MethodsMetadataCollector(Symbol('OnDisposeHook'));
export const onDispose: MethodDecorator = (target, propertyKey) => {
    // eslint-disable-next-line @typescript-eslint/ban-types
    onDisposeMetadataCollector.addHook(target, propertyKey);
};

const fromConstructor = () => ProviderBuilder.fromConstructor().withHook({
    onConstruct<GInstance>(instance: GInstance): void {
        instance.init();
    },
    onDispose<GInstance>(instance: GInstance): void {
        instance.dispose();
    }
}).asRequested();

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
const car = locator.resolve(Car); // initialized!
```

## Scoped locators

```typescript
const scope = container.createLocator();
const logger = scope.resolve('ILogger');
scope.remove();
```

## Mocking/Tests

Provider
```typescript
import { IProvider, IServiceLocator } from 'ts-ioc-container';
import { IMock, It, Mock } from 'moq.ts';

export class MoqProvider<T> implements IProvider<T> {
    private readonly mock = new Mock<T>();

    getMock(): IMock<T> {
        return this.mock;
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.mock.object();
    }

    clone(): IProvider<T> {
        return new MoqProvider();
    }

    dispose(): void {}
}
```

Repository
```typescript
import { MockRepository, ProviderKey, IServiceLocator } from 'ts-ioc-container';
import { MoqProvider } from './MoqProvider';
import { IMock } from 'moq.ts';

export class MoqRepository extends MockRepository {
    findMock<T>(key: ProviderKey): IMock<T> {
        return (this.findOrCreateProvider<T>(key) as MoqProvider<T>).getMock();
    }

    protected createMockProvider<T>(): MoqProvider<T> {
        return new MoqProvider();
    }

    clone(parent: IProviderRepository = this): IProviderRepository {
        return new MoqRepository(this.decorated.clone(parent));
    }
}
```
Usage
```typescript
import {MoqRepository} from "./MoqRepository";
import {ProviderRepository} from "./ProviderRepository";
import {ProviderBuilder} from "ts-ioc-container";
import {ServiceLocator} from "./ServiceLocator";
import {SimpleInjector} from "./SimpleInjector";
import {MoqProvider} from "./MoqProvider";

const repo = new MoqRepository(new ProviderRepository());
const container = new ServiceLocator(() => new SimpleInjector(), repo);

const mock = repo.findMock('key1');
mock.setup(i => i.someMethod()).return('someValue');
```