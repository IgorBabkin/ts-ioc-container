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
Sometimes you need to create a scope of container. For example, when you want to create a scope per request in web application. You can assign tags to scope and provider and resolve dependencies only from certain scope.

- NOTICE: remember that when scope doesn't have dependency then it will be resolved from parent container
- NOTICE: when you create a scope of container then all providers are cloned to new scope. For that reason every provider has methods `clone` and `isValid` to clone itself and check if it's valid for certain scope accordingly.
- NOTICE: when you create a scope then we clone ONLY tags-matched providers.

```typescript
{{{include_file './__tests__/readme/scopes.spec.ts'}}}
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
{{{include_file './__tests__/readme/disposing.spec.ts'}}}
```

## Injectors `IInjector`
Injectors are used to describe how dependencies should be injected to constructor.

- `ReflectionInjector` - injects dependencies using `@inject` decorator
- `ProxyInjector` - injects dependencies as dictionary `Record<string, unknown>`
- `SimpleInjector` - just passes container to constructor with others arguments

### Reflection injector
This type of injector uses `@inject` decorator to mark where dependencies should be injected. It's bases on `reflect-metadata` package. That's why I call it `ReflectionInjector`.

```typescript
{{{include_file './__tests__/readme/reflectionInjector.spec.ts'}}}
```

### Simple injector
This type of injector just passes container to constructor with others arguments.

```typescript
{{{include_file './__tests__/SimpleInjector.spec.ts'}}}
```

### Proxy injector
This type of injector injects dependencies as dictionary `Record<string, unknown>`.

```typescript
{{{include_file './__tests__/ProxyInjector.spec.ts'}}}
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

```typescript
{{{include_file './__tests__/readme/provider.spec.ts'}}}
```

### Singleton provider
Sometimes you need to create only one instance of dependency per scope. For example, you want to create only one logger per scope.

- Singleton provider creates only one instance in every scope where it's resolved.
- NOTICE: if you create a scope 'A' of container 'root' then Logger of A !== Logger of root.

```typescript
{{{include_file './__tests__/Singleton.spec.ts'}}}
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
{{{include_file './__tests__/ArgsProvider.spec.ts'}}}
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
{{{include_file '__tests__/Hooks.spec.ts'}}}
```

## Mocking / Tests `AutoMockedContainer`
Sometimes you need to automatically mock all dependencies in container. This is what `AutoMockedContainer` is for.

```typescript
{{{include_file '__tests__/readme/mocking.spec.ts'}}}
```


## Errors

- [DependencyNotFoundError.ts](lib%2Fcontainer%2FDependencyNotFoundError.ts)
- [DependencyMissingKeyError.ts](lib%2Fregistration%2FDependencyMissingKeyError.ts)
- [MethodNotImplementedError.ts](lib%2FMethodNotImplementedError.ts)
- [ContainerDisposedError.ts](lib%2Fcontainer%2FContainerDisposedError.ts)
