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

## Architecture
![image info](docs/diagram.png)

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

How to create new simple locator
```typescript
import {ServiceLocatorFactory, SimpleServiceLocatorStrategy} from 'ts-ioc-container';

const container = new ServiceLocatorFactory(new SimpleServiceLocatorStrategy());
```
How to create new IoC locator
```typescript
import 'reflect-metadata';
import {ServiceLocatorFactory, IocServiceLocatorStrategy, metadataCollector} from 'ts-ioc-container';

const container = new ServiceLocatorFactory(new IocServiceLocatorStrategy(metadataCollector));
```
How to register dependencies
```typescript
locator.register('ILogger', Provider.fromConstructor(Logger));
```
How to resolve dependencies
```typescript
const logger = locator.resolve('ILogger', 'loggerPrefix');
```
How to destroy container
```typescript
container.remove();
```
How to inject dependencies from IoC
```typescript
import {inject, Factory, args} from 'ts-ioc-container';

class StickerRepository {
  private stickers: ISticker;

  constructor(
    @inject('ILogger', args('loggerPrefix')) private logger: ILogger,
    @inject(Factory('ISticker'), args(...['arg1'])) private stickerFactory: (...args: any[]) => ISticker, // auto-factory (no need to register it)
  ) {}

  createSticker(title: string, body: string) {
    this.stickers.push(this.stickerFactory(title, body));
  }
}
```
Provider
```typescript
locator.register('ILogger', new Provider((l, ...args) => new Logger(...args)));
locator.register('ILogger', Provider.fromConstructor(Logger));
locator.register('ILogger', Provider.fromInstance(new Logger));
```

Singleton
```typescript
const provider = new Provider.fromConstructor(Logger).asSingleton();
```

### Scoped containers
```typescript
const container = new ServiceLocatorFactory().createIoCLocator();
container.register('ILogger', Provider.fromConstructor(Logger).asScoped());
const scopedContainer = container.createContainer();
const logger = scopedContainer.resolve('ILogger');
logger.log('Hello');
scopedContainer.remove();
```

### Instance hooks
By implementing `IInjectable` interface
```typescript
export interface IInjectable {
    dispose?(): void;
    onConstruct?(): void;
}
```
```typescript
import {IInjectable} from 'ts-ioc-container';

class Logger implements IInjectable {
    onConstruct(): void {
        console.log('initialized');
    }

    dispose(): void {
        console.log('destroyed');
    }
}
```

### Types of containers
SimpleLocator (cannot be used with decorators)
```typescript
const container = new ServiceLocatorFactory().createSimpleLocator();
```
IoC container (work based on decorators)
```typescript
const container = new ServiceLocatorFactory().createIoCLocator();
```

### Tests
Use [unit-test-ts-ioc-container](https://github.com/IgorBabkin/service-locator/tree/master/packages/unit-test-ts-ioc-container)
```typescript
import {Mock} from 'moq.ts';
import {ServiceLocatorFactory} from 'ts-ioc-container';
import {UnitTestServiceLocatorFactory, MoqAdapter, MoqAdapter} from 'unit-test-ts-ioc-container';

const container = new ServiceLocatorFactory().createIoCLocator();
const mockFactory = () => new MoqAdapter(new Mock());
const unitTestContainer = new UnitTestServiceLocatorFactory(mockFactory).create(container);

const stickerMock = unitTestContainer.resolveMock('ISticker');
stickerMock.setup(i => i.title).return('Sticker title');
```
