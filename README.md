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
- can be used with `unit-test-ts-ioc-container`

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

## Usage

### ServiceLocator
How to create new simple locator
```typescript
import {ServiceLocator} from 'ts-ioc-container';

const container = new ServiceLocator(new SimpleInjector());
locator.register('ILogger', Provider.fromConstructor(Logger));
const logger = locator.resolve<ILogger>('ILogger');
```
### Injectors
Simple injector
```typescript
import {IServiceLocator} from "./IServiceLocator";
import {Provider} from "./Provider";

class Car {
    constructor(locator: IServiceLocator) {
        const engine = locator.resolve<IEngine>('IEngine')
    }
}

const container = new ServiceLocator(new SimpleInjector());
container.register('IEngine', Provider.fromConstructor(Engine));
const car = container.resolve(Car);
```
IoC injector
```typescript
import 'reflect-metadata';
import {ServiceLocatorFactory, IocInjector, metadataCollector} from 'ts-ioc-container';
import {args} from "./helpers";
import {Provider} from "./Provider";

export const metadataCollector = new MetadataCollector();

export const inject = createInjectDecorator(metadataCollector);
const container = new ServiceLocatorFactory(new IocInjector(metadataCollector));
container.register<IEngine>('IEngine', Provider.fromConstructor(Engine));

class Car {
    constructor(@inject('IEngine') private engine: IEngine) {
    }
}

const car = container.resolve(Car);
```

## Provider
```typescript
locator.register('ILogger', new Provider((l, ...args) => new Logger(...args)));
locator.register('ILogger', Provider.fromConstructor(Logger));
locator.register('ILogger', Provider.fromInstance(new Logger));
locator.register('ILogger', Provider.fromInstance(new Logger).withArgs('dev').asSingleton());
```

## Hooks

```typescript
import {ServiceLocator} from "./ServiceLocator";
import {SimpleInjector} from "./SimpleInjector";
import {ProviderKey} from "./IProvider";
import {Mock} from "moq.ts";
import {IServiceLocator} from "./IServiceLocator";

export interface IHook {
    onInstanceCreated?: <GInstance>(instance: GInstance) => void;

    onLocatorRemoved?: () => void;

    onDependencyNotFound?: <GInstance>(key: ProviderKey, ...args: any[]) => GInstance | undefined;
}

const container = new ServiceLocator(new SimpleInjector(), (locator: IServiceLocator) => ({
    onInstanceCreated: (instance) => {
        console.log(instance);
    },
    onDependencyNotFound: <T>(key: ProviderKey, ...args: any[]): T | undefined => {
        return new Mock<T>().object();
    },
    onLocatorRemoved: () => {

    }
}))
```

### OnConstruct

```typescript
import {ServiceLocator} from "./ServiceLocator";
import {SimpleInjector} from "./SimpleInjector";
import {InstanceHook} from "./InstanceHook";
import {OnConstructHook} from "./OnConstructHook";

export const hooksMetadataCollector = new HooksMetadataCollector();
export const onConstruct = createOnConstructDecorator(hooksMetadataCollector);
const locator = new ServiceLocator(new SimpleInjector(), new InstanceHook([new OnConstructHook(hooksMetadataCollector)]))

class Car {
    constructor() {
    }

    @onConstruct
    public initialize() {
        console('initialized!');
    }
}
const car = locator.resolve(Car); // initialized!
```

### OnDispose

```typescript
import {createOnDisposeDecorator} from "./decorators";
import {OnDisposeHook} from "./OnDisposeHook";

export const hooksMetadataCollector = new HooksMetadataCollector();
export const onDispose = createOnDisposeDecorator(hooksMetadataCollector);
const locator = new ServiceLocator(new SimpleInjector(), new InstanceHook([new OnDisposeHook(hooksMetadataCollector)]))

class Car {
    constructor() {
    }

    @onDispose
    public destroy() {
        console('destroyed!');
    }
}

const car = locator.resolve(Car)
locator.remove(); // destroyed!
```

## Scoped locators

```typescript
const container = new ServiceLocator(new SimpleInjector());
container.register('ILogger', Provider.fromConstructor(Logger).asScoped());
const scope = container.createLocator();
const logger = scope.resolve('ILogger');
logger.log('Hello');
scope.remove();
```

### Tests
```typescript
let mockRepo: MockRepository;

beforeEach(() => {
    mockRepo = new MockRepository();
});

function createSimpleLocator() {
    return new ServiceLocator(new SimpleInjector(), () => ({
        onDependencyNotFound: <GInstance>(key: ProviderKey) => mockRepo.findOrCreate<GInstance>(key).object(),
    }));
}

it('hey', () => {
    const locator = createSimpleLocator();

    const mock = mockRepo.findOrCreate<IDepClass>('key1');
    mock.setup((i) => i.greeting()).returns('hello');

    const key1 = locator.resolve(TestClass);

    expect(key1.dep1.greeting()).toBe('hello');
});
```
MockRepository
```typescript
import { ProviderKey } from '../lib';
import { IMock, Mock } from 'moq.ts';

export class MockRepository {
    private mocks = new Map<ProviderKey, IMock<any>>();

    findOrCreate<GInstance>(key: ProviderKey): IMock<GInstance> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, new Mock<GInstance>());
        }

        return this.mocks.get(key) as IMock<GInstance>;
    }
}
```