---
name: ts-ioc-container-architect
description: Architect for applications and frameworks built on ts-ioc-container. Use when designing or writing code that uses ts-ioc-container - dependency injection, scopes (application/request/page/widget), tokens, @register/@inject/@hook - and whenever the task is a cross-cutting engine on top of it - a mediator or middleware pipeline, proxying/AOP around a class, declarative action guards, error bubbling, retry, unit of work, layer decorators (@service, @repository), or a reusable container module.
---

# ts-ioc-container architect

`ts-ioc-container` is a DI container _and_ a meta-framework engine: scopes,
tokens, provider pipes, hooks and transparent proxies are the parts an
application assembles its own framework from. Your job is to pick the right
pattern from the cookbook, adapt it, and keep it consistent with the rules
below.

## 1. Read the installed version first

The API changed a lot between majors; your memory of it is probably stale.
Before writing code, read what ships with the installed package:

- `node_modules/ts-ioc-container/AGENTS.md`: setup, recipes, pitfalls, removed APIs, error codes
- `node_modules/ts-ioc-container/README.md`: the full docs. Every example in it
  is an executed test, so you can copy from it at this version. Its
  **Cookbook** section holds complete architectures.
- `node_modules/ts-ioc-container/typings/`: JSDoc, including `@throws` and `@example`

If something below contradicts those files, the files win.

## 2. Pick a pattern

Match the problem to a recipe, then open that recipe's README section and adapt
the code. Don't redesign from scratch.

| Problem                                                                                | README section                                      | Built from                                                                 |
| -------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| Run logging / auth / caching / metrics around a service's methods, pluggable per scope | Cookbook → Mediator: proxy calls through middleware | `decorate(...)` proxy, `GroupAliasToken` middleware, method metadata       |
| UI action needs guards (online? confirmed?) and follow-ups (toast, refresh)            | Cookbook → Declarative action pipeline              | `@hook` key + `sequential(...)`, `HookFn` steps resolving from `ctx.scope` |
| Errors should be handled by the innermost owner (widget → page → app)                  | Cookbook → Error bubbling through scopes            | `GroupAliasToken` resolved per scope, `HookCollector`                      |
| Replay a failed call when connectivity / session recovers                              | Cookbook → Retry later                              | `addMethodTag`, `decorate(...)` proxy, app-wide queue                      |
| Several services change records in one request; write once, all-or-nothing             | Cookbook → Unit of work per request                 | request scope, `singleton(cacheKey)`, `byArgs(...)`, commit hook           |
| Name the architecture: `@service`, `@repository`, `@perRequest('admin')`               | Cookbook → Layer and scope decorators               | `register(Group, ...mappers)`, `scope(...)`, `createComposeClassDecorator` |
| Per-request state in a web server                                                      | Cookbook → Per-request scope                        | `createScope({ tags: ['request'] })`, `dispose()`                          |
| Feature flags, A/B variants                                                            | Registration → Feature flags                        | `MultiVariantFeatureToken`, `ToggleFeatureToken`                           |
| Ship a reusable engine                                                                 | Module                                              | `IContainerModule`, `container.useModule(...)`                             |
| Many registrations discovered at build time                                            | Module → Bundle a module at build time              | `@ts-ioc-container/bundler` (`tic build`)                                  |

Most engines combine two or three of these. A typical frontend uses
layers + action pipeline + error bubbling + retry; a typical backend uses
layers + mediator + unit of work.

## 3. Design rules

- **Scopes have names.** Backend: `application` / `request` / `transaction`.
  Frontend: `application` / `page` / `widget`. Wrap them in scope decorators
  (`perApp()`, `perRequest(name?)`) instead of repeating `scope((s) => s.hasTag(...))`.
- **A registration without `scope(...)` is copied into every child scope.** Use
  that on purpose: a mediator or middleware with no scope rule is built in the
  scope that resolves it, so it sees that scope's dependencies. Pin real
  singletons with `scope(...)` + `singleton()`.
- **Outer scopes cannot see inner ones.** An application-scoped class can't
  inject a request-scoped dependency. Move the consumer inward or resolve
  lazily from the scope at call time.
- **Tokens, not strings.** `const IFooToken = new SingleToken<IFoo>('IFoo')`.
  Groups (layers, middleware, controllers): `GroupAliasToken`.
- **`@register(Token, ...mappers)`.** Never `@register(bindTo(Token))`, and
  never two `@register`s on one class: give layer decorators a `...mappers`
  parameter. Use the fluent `.bindTo(...)` only for `R.fromValue` / `R.fromFn`.
- **Every constructor param gets `@inject(...)`**, usually `@inject(by(Token))`.
  Params without it are `undefined`. Runtime args are passed as they are and
  never resolved; use `token.argsFn(...)` or `byArgs(...)`.
- **Hooks are yours.** The library ships no hook names and no runner. Define
  `const onX = (fn: HookType) => hook('onX', fn)` and a `HookCollector`, and run
  the actions where your engine raises the event (`runInOrder` / `runAtOnce`
  over `actions.map(toTask)`). A `HookFn` returns `void` or `Promise<void>`.
- **Proxies go through `ProxyRegistry.getInstance().createProxy(...)`**, never
  `new Proxy`, so `unwrapProxy`, `hasInstance` and metadata reads see through
  them. Keep one wrapper per method so `obj.m === obj.m`. A method that calls
  `this.other()` reaches the real instance, so that inner call skips the proxy.
- **Policies live on methods** (`addMethodMeta` / `addMethodTag`), and the
  middleware that enforces them reads them (`getMethodMeta` / `getMethodTags`).
  Business methods hold business logic only.
- **Every feature flag has a fallback** registration (`fallbackOf(feature)`).

## 4. Deliver

1. Name the scopes and the vocabulary (scope decorators, layer decorators, hook keys).
2. Declare tokens next to their interfaces.
3. Write the engine pieces (proxy pipe, mediator, collectors, runners) once, in
   their own module, exported as an `IContainerModule`.
4. Write the application classes using only the vocabulary.
5. Prove it with a test in the style of the cookbook: build a real `Container`,
   open the scopes, resolve through tokens, assert behaviour. Cover the failure
   path too (guard rejects, error bubbles, request rolls back).

Before finishing, check the pitfalls table in the installed `AGENTS.md` against
your code.
