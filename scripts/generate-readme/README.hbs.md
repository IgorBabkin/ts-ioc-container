# Typescript IoC (Inversion Of Control) container

![NPM version:latest](https://img.shields.io/npm/v/ts-ioc-container/latest.svg?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/ts-ioc-container.svg?style=flat-square)
![npm package minimized gzipped size (select exports)](https://img.shields.io/bundlejs/size/ts-ioc-container)
[![Coverage Status](https://coveralls.io/repos/github/IgorBabkin/ts-ioc-container/badge.svg?branch=master)](https://coveralls.io/github/IgorBabkin/ts-ioc-container?branch=master)
![License](https://img.shields.io/npm/l/ts-ioc-container)

## Advantages
- battle tested :boom:
- written on `typescript`
- simple and lightweight :heart:
- clean API :green_heart:
- supports `tagged scopes`
- fully test covered :100:
- can be used with decorators `@inject`
- can [inject properties](#inject-property)
- can inject [lazy dependencies](#lazy)
- composable and open to extend
- awesome for testing (auto mocking)

## Content

- [Setup](#setup)
- [Container](#container)
    - [Basic usage](#basic-usage)
    - [Scope](#scope) `tags`
    - [Instances](#instances)
    - [Dispose](#dispose)
    - [Lazy](#lazy) `lazy`
- [Injector](#injector)
    - [Metadata](#metadata) `@inject`
    - [Simple](#simple)
    - [Proxy](#proxy)
- [Provider](#provider) `provider`
    - [Singleton](#singleton) `singleton`
    - [Arguments](#arguments) `args` `argsFn`
    - [Visibility](#visibility) `visible`
    - [Alias](#alias) `asAlias`
    - [Decorator](#decorator) `decorate`
- [Registration](#registration) `@register`
    - [Key](#key) `asKey`
    - [Scope](#scope) `scope`
- [Module](#module)
- [Hook](#hook) `@hook`
    - [OnConstruct](#onconstruct) `@onConstruct`
    - [OnDispose](#ondispose) `@onDispose`
    - [Inject Property](#inject-property)
    - [Inject Method](#inject-method)
- [Mock](#mock)
- [Error](#error)

## Setup

```shell script
npm install ts-ioc-container reflect-metadata
```
```shell script
yarn add ts-ioc-container reflect-metadata
```

Just put it in the entrypoint file of your project. It should be the first line of the code.
```typescript
import 'reflect-metadata';
```

And `tsconfig.json` should have next options:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Container
`IContainer` consists of:

- Provider is dependency factory which creates dependency
- Injector describes how to inject dependencies to constructor
- Registration is provider factory which registers provider in container

### Basic usage

```typescript
{{{include_file './__tests__/readme/basic.spec.ts'}}}
```

### Scope
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

### Dispose
Sometimes you want to dispose container and all its scopes. For example, when you want to prevent memory leaks. Or you want to ensure that nobody can use container after it was disposed.

- container can be disposed
- when container is disposed then all scopes are disposed too
- when container is disposed then it unregisters all providers and remove all instances

```typescript
{{{include_file './__tests__/readme/disposing.spec.ts'}}}
```

### Lazy
Sometimes you want to create dependency only when somebody want to invoke it's method or property. This is what `lazy` is for.

```typescript
{{{include_file './__tests__/readme/lazy.spec.ts'}}}
```

## Injector
`IInjector` is used to describe how dependencies should be injected to constructor.

- `MetadataInjector` - injects dependencies using `@inject` decorator
- `ProxyInjector` - injects dependencies as dictionary `Record<string, unknown>`
- `SimpleInjector` - just passes container to constructor with others arguments

### Metadata
This type of injector uses `@inject` decorator to mark where dependencies should be injected. It's bases on `reflect-metadata` package. That's why I call it `MetadataInjector`.
Also you can [inject property.](#inject-property)

```typescript
{{{include_file './__tests__/readme/metadataInjector.spec.ts'}}}
```

### Simple
This type of injector just passes container to constructor with others arguments.

```typescript
{{{include_file './__tests__/SimpleInjector.spec.ts'}}}
```

### Proxy
This type of injector injects dependencies as dictionary `Record<string, unknown>`.

```typescript
{{{include_file './__tests__/ProxyInjector.spec.ts'}}}
```

## Provider
Provider is dependency factory which creates dependency.

- `Provider.fromClass(Logger)`
- `Provider.fromValue(logger)`
- `new Provider((container, ...args) => container.resolve(Logger, {args}))`

```typescript
{{{include_file './__tests__/readme/provider.spec.ts'}}}
```

### Singleton
Sometimes you need to create only one instance of dependency per scope. For example, you want to create only one logger per scope.

- Singleton provider creates only one instance in every scope where it's resolved.
- NOTICE: if you create a scope 'A' of container 'root' then Logger of A !== Logger of root.

```typescript
{{{include_file './__tests__/Singleton.spec.ts'}}}
```

### Arguments
Sometimes you want to bind some arguments to provider. This is what `ArgsProvider` is for.
- `provider(args('someArgument'))`
- `provider(argsFn((container) => [container.resolve(Logger), 'someValue']))`
- `Provider.fromClass(Logger).pipe(args('someArgument'))`
- NOTICE: args from this provider has higher priority than args from `resolve` method.

```typescript
{{{include_file './__tests__/ArgsProvider.spec.ts'}}}
```

### Visibility
Sometimes you want to hide dependency if somebody wants to resolve it from certain scope
- `provider(visible(({ isParent, child }) => isParent || child.hasTag('root')))` - dependency will be accessible from scope `root` or from scope where it's registered
- `Provider.fromClass(Logger).pipe(visible(({ isParent, child }) => isParent || child.hasTag('root')))`

```typescript
{{{include_file './__tests__/readme/visibility.spec.ts'}}}
```

### Alias
Alias is needed to group keys
- `@register(asAlias('logger'))` helper assigns `logger` alias to registration.
- `by.aliases((it) => it.has('logger') || it.has('a'))` resolves dependencies which have `logger` or `a` aliases
- `Provider.fromClass(Logger).pipe(alias('logger'))`

```typescript
{{{include_file './__tests__/readme/alias.spec.ts'}}}
```

### Decorator
Sometimes you want to decorate you class with some logic. This is what `DecoratorProvider` is for.
- `provider(decorate((instance, container) => new LoggerDecorator(instance)))`

```typescript
{{{include_file './__tests__/readme/decorate.spec.ts'}}}
```

## Registration
Registration is provider factory which registers provider in container.
- `@register(asKey('logger'))`
- `Registration.fromClass(Logger).to('logger')`
- `Registration.fromClass(Logger)`
- `Registration.fromValue(Logger)`
- `Registration.fromFn((container, ...args) => container.resolve(Logger, {args}))`

### Key
Sometimes you want to register provider with certain key. This is what `key` is for.

- by default, key is class name
- you can assign the same key to different registrations

```typescript
{{{include_file './__tests__/readme/registration.spec.ts'}}}
```

### Scope
Sometimes you need to register provider only in scope which matches to certain condition and their sub scopes. Especially if you want to register dependency as singleton for some tags, for example `root`
- `@register(scope((container) => container.hasTag('root'))` - register provider only in root scope
- `Registration.fromClass(Logger).when((container) => container.hasTag('root'))`

```typescript
{{{include_file './__tests__/ScopeProvider.spec.ts'}}}
```

## Module
Sometimes you want to encapsulate registration logic in separate module. This is what `IContainerModule` is for.

```typescript
{{{include_file './__tests__/readme/containerModule.spec.ts'}}}
```

## Hook
Sometimes you need to invoke methods after construct or dispose of class. This is what hooks are for.

### OnConstruct
```typescript
{{{include_file '__tests__/OnConstruct.spec.ts'}}}
```

### OnDispose
```typescript
{{{include_file '__tests__/OnDispose.spec.ts'}}}
```

### Inject property

```typescript
{{{include_file '__tests__/readme/injectProp.spec.ts'}}}
```

## Error

- [DependencyNotFoundError.ts](..%2F..%2Flib%2Ferrors%2FDependencyNotFoundError.ts)
- [MethodNotImplementedError.ts](..%2F..%2Flib%2Ferrors%2FMethodNotImplementedError.ts)
- [DependencyMissingKeyError.ts](..%2F..%2Flib%2Ferrors%2FDependencyMissingKeyError.ts)
- [ContainerDisposedError.ts](..%2F..%2Flib%2Ferrors%2FContainerDisposedError.ts)

