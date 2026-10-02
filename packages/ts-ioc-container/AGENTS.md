# ts-ioc-container — guide for AI coding agents

This file ships inside the npm package, so it matches the version installed in
`node_modules`. **Trust it over what you remember**: the API changed a lot
between major versions, and code written for an older version usually compiles
badly or not at all. Every recipe below is executed by the package's test suite
(`__tests__/readme/agentRecipes.spec.ts`).

More detail: `README.md` next to this file. Types with JSDoc: `typings/`.
Source: `lib/`.

## Setup

```shell
npm install ts-ioc-container reflect-metadata
```

```typescript
import 'reflect-metadata'; // first line of the entrypoint
```

```json
{ "compilerOptions": { "experimentalDecorators": true, "emitDecoratorMetadata": true } }
```

## Recipes

### Register a class and inject it by token

```typescript
import { bindTo, by, Container, inject, register, Registration as R, scope, singleton, SingleToken } from 'ts-ioc-container';

interface ILogger {
  log(message: string): void;
}
const ILoggerToken = new SingleToken<ILogger>('ILogger');

@register(bindTo(ILoggerToken), scope((s) => s.hasTag('application')), singleton())
class Logger implements ILogger {
  log(message: string) {}
}

class App {
  constructor(@inject(by(ILoggerToken)) private logger: ILogger) {}
}

const container = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));
const app = container.resolve(App); // an unregistered class is constructed by the injector
```

### Request-scoped service depending on an application singleton

```typescript
const IRepositoryToken = new SingleToken<Repository>('IRepository');

@register(bindTo(IRepositoryToken), scope((s) => s.hasTag('request')), singleton())
class Repository {
  constructor(@inject(by(ILoggerToken)) readonly logger: ILogger) {}
}

const app = new Container({ tags: ['application'] })
  .addRegistration(R.fromClass(Logger))
  .addRegistration(R.fromClass(Repository));

const request = app.createScope({ tags: ['request'] }); // one per request
const repo = IRepositoryToken.resolve(request);
request.dispose(); // when the request ends; child scopes are not disposed automatically
```

Use tags `application` / `request` / `transaction` on a backend and
`application` / `page` / `widget` on a frontend.

### Values and factories

```typescript
container
  .addRegistration(R.fromValue('https://api.example.com').bindTo('API_URL'))
  .addRegistration(R.fromFn(({ scope }) => `${scope.resolve<string>('API_URL')}/v1`).bindTo('API_V1'));
```

Use the fluent `.bindTo(...)` only for `fromValue` / `fromFn` and for classes
you don't own. For your own classes, use `@register(bindTo(...))`.

### Runtime arguments

```typescript
@register(bindTo(IClientToken))
class Client {
  constructor(@inject(arg(0)) readonly baseUrl: string) {}
}

IClientToken.args('https://a.example.com').resolve(container);
IClientToken.resolve(container, { args: ['https://b.example.com'] });
container.resolve<Client>('IClient', { args: ['https://c.example.com'] });
```

`token.args(...)`, `token.argsFn(...)` and `token.lazy()` return a **new**
token; the original is never changed.

### Lifecycle hooks (you run them)

The library only **collects** hooks. It ships no hook names, no hook modules and
no runner. Define the hook name, collect on an event, and run the actions:

```typescript
import { hook, HookCollector, type HookType, runInOrder, toTask } from 'ts-ioc-container';

const onInit = (fn: HookType) => hook('onInit', fn);
const onInitHooks = new HookCollector({ key: 'onInit' });

class Service {
  @onInit((ctx) => {
    ctx.invokeMethod({ args: ctx.resolveArgs() }); // hook functions return void
  })
  init() {}
}

container.getInjector().onConstructed((instance, scope) => {
  void runInOrder(onInitHooks.getActions(instance, { scope }).map(toTask));
});
```

Other events to collect on: `container.scopeDisposed.subscribe(...)`,
`container.registered.subscribe((provider) => provider.onResolved(...))`, or the
`onResolve(...)` registration pipe for a single registration. Combine several
hooks on one member with `sequential(...)`, `parallel(...)` or
`oncePerInstance(...)`. Decorating one member twice with the same key replaces
the first hook.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Constructor param is `undefined` | Params without `@inject` are never injected | Annotate every param: `@inject(by(Token))` |
| TS error on `@inject(Token)` | `inject` takes one `InjectFn` | `@inject(by(Token))`, `@inject(by('Key'))`, `@inject(by(Class))` |
| TS error on `container.resolve(Token)` | `container.resolve` takes a key or a class | `Token.resolve(container)` |
| A "singleton" differs per request | A registration without `scope(...)` is copied into every child scope | Add `scope((s) => s.hasTag('application'))` |
| `DependencyNotFoundError` from an outer scope | Outer scopes cannot resolve inner-scope-only dependencies | Register the dependency in the outer scope too, or move the consumer inward |
| Registration missing in an existing child scope | Scopes copy registrations when `createScope()` runs | Register before creating the scope, or add it to the child |
| Constructor receives a token object instead of an instance | Args are passed as-is, never resolved | `Token.argsFn((scope) => [Other.resolve(scope)])` |
| Hook method never runs | Nothing runs hooks for you | Collect with `HookCollector` and run the actions (see above) |
| TS error on a hook arrow function | `HookFn` must return `void` or `Promise<void>` | Use a block body: `(ctx) => { ... }` |
| `@inject` metadata missing at runtime | `reflect-metadata` not imported first | `import 'reflect-metadata'` at the top of the entrypoint |

## Removed APIs (do not use)

| Removed | Use instead |
| --- | --- |
| `@inject(Token)`, `@inject('Key')`, `@inject(Token, ...mappers)` | `@inject(by(Token))`, `@inject(pipe(by(Token), mapFn))` |
| `toMappedToken` | `pipe(by(Token), ...mappers)` |
| `InjectFn` as `(scope, options)` | `({ scope, args }) => ...` — the scope is inside the options object |
| `onConstruct`, `onDispose`, `onResolved` decorators from the library | Define your own: `const onConstruct = (fn: HookType) => hook('onConstruct', fn)` |
| `OnConstructModule`, `OnDisposeModule`, `OnResolvedModule`, `resolved(...)` | Subscribe to `getInjector().onConstructed`, `scopeDisposed`, `registered` yourself |
| Hook execution strategies, `onError` options | Run the collected actions yourself (`runInOrder`, `runAtOnce`, `toTask`) |
| `Async`-suffixed hooks and modules | Hooks are async-capable by default |
| `onceResolved`, `onceResolvedAsync` | `oncePerInstance(hook)` |
| Several hooks passed to one `@hook(...)` | `@hook(key, sequential(a, b))` or `parallel(a, b)` |
| `container.onScopeCreated(...)` and similar methods | `container.scopeCreated.subscribe(...)` (events return an unsubscribe fn) |
| `args(index)` injector helper | `arg(index)`; `args` now injects the whole args array |
| `InjectionToken.getKey()` | Tokens are `Serializable` |
| Args that are tokens being auto-resolved | `token.argsFn((scope) => [Other.resolve(scope)])` |
| `isProxy`, `getProxyTarget` | `unwrapProxy` |

## Errors

All errors extend `ContainerError` and carry a stable `code`:

| Code | Error | Usually means |
| --- | --- | --- |
| `IOC_DEPENDENCY_NOT_FOUND` | `DependencyNotFoundError` | Key not registered in this scope chain, or excluded by `scope(...)` / `scopeAccess(...)` |
| `IOC_DEPENDENCY_MISSING_KEY` | `DependencyMissingKeyError` | A registration has no key: add `bindTo(...)` |
| `IOC_CONTAINER_DISPOSED` | `ContainerDisposedError` | Using a scope after `dispose()` |
| `IOC_PROVIDER_DISPOSED` | `ProviderDisposedError` | Using a provider after its scope was disposed |
| `IOC_EVENT_DISPOSED` | `TypedEventDisposedError` | Subscribing to an event of a disposed scope |
| `IOC_SINGLETON_APPLIED_TWICE` | `CannotApplySingletonTwiceError` | `singleton()` appears twice in one registration |
| `IOC_UNSUPPORTED_TOKEN_TYPE` | `UnsupportedTokenTypeError` | `toToken(...)` got a value that is not a key, class or token |
| `IOC_ARGUMENT_NOT_FOUND` | `ArgumentNotFoundError` | `findArgOrFail` / `argsFn` predicate matched nothing |
| `IOC_CONTAINER_NOT_FOUND` | `ContainerNotFoundError` | No container is associated with the target |
| `IOC_METHOD_NOT_IMPLEMENTED` | `MethodNotImplementedError` | Called a method the object does not support (e.g. on `EmptyContainer`) |
