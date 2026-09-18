# ADR 0019 — `@inject` takes one `InjectFn`; the scope travels inside the options

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** core maintainers
- **Tags:** injection, api-design, tokens

## Context

`@inject` accepted an `Injectable` — an `InjectFn`, an `InjectionToken`, a
`DependencyKey` or a constructor — followed by up to ten typed mapper overloads,
and normalized all of it through `toMappedToken` into a `FunctionToken` which
`resolveArgs` later resolved. `injectProp` mirrored the same overload ladder.
That was three things in one decorator: a resolver, a token coercion and a
mapping pipeline, with the coercion deciding on the caller's behalf that a token
parameter forwards the class's runtime args (the cascade of
[ADR 0005](0005-token-immutability.md)'s `forwardArgs`) — a decision the
consumer could neither see nor opt out of at the parameter.

Alongside it, every callback the library hands a resolution context took the
scope *beside* the options — `InjectFn` was `(scope, options)`, `ArgsFn` was
`(scope, options?)`, `ResolveDependency` was `(container, options)`, and
`IProvider.resolve` / `IInjector.resolve` / `Injector.createInstance` had the
same positional scope ahead of an options object. Consumers wrote `(_, { args })`
to reach the one field they wanted, and `args`, the simplest picker, was
`(c, { args = [] }) => args` with a parameter it never used.

## Decision

**`inject(fn)` and `injectProp(fn)` take exactly one argument, an `InjectFn`.**
No `Injectable` union, no mapper rest parameters, no `toMappedToken`. The
function is the contract:

```typescript
@inject(({ scope }) => scope.resolve('Key'))                     // a key
@inject(({ scope, args }) => Token.resolve(scope, { args }))     // a token, args forwarded
@inject(({ scope }) => Token.resolve(scope))                     // a token, args not forwarded
@inject(arg(0))                                                  // a runtime argument
@inject(pipe(({ scope }) => scope.resolve<Config>('Config'), takeApiUrl(), requireHttps()))
```

Mapping is composition: `pipe(fn, ...mappers)` (already exported) returns an
`InjectFn`, so it goes wherever one does. `resolveArgs` stores the functions and
calls each with the options it is given. `toToken` and `Injectable` stay for
`select.token(...)` and `toToken(...)`, which convert user input into tokens.

**The scope travels inside the options.** `InjectOptions` is
`{ scope: IContainer; args?: unknown[] }`; `ProviderOptions` adds `lazy?`.
Every function handed a resolution context takes that one object:

| Before                                                   | After                                        |
| -------------------------------------------------------- | -------------------------------------------- |
| `InjectFn = (scope, options) => T`                       | `InjectFn = (options: ProviderOptions) => T` |
| `ArgsFn = (scope, options?) => unknown[]`                | `ArgsFn = (options: InjectOptions) => unknown[]` |
| `ResolveDependency = (container, options) => T`          | `ResolveDependency = (options: ProviderOptions) => T` |
| `IProvider.resolve(container, options)`                  | `IProvider.resolve(options)`                 |
| `IInjector.resolve(container, Target, options?)`         | `IInjector.resolve(Target, options)`         |
| `Injector.createInstance(scope, Target, options?)`       | `Injector.createInstance(Target, options)`   |
| `resolveArgs(target)(scope, options)`                    | `resolveArgs(target)(options)`               |

The calls where the caller already addresses a scope keep it positional —
`container.resolve(key, options)` because the container *is* the scope, and
`token.resolve(scope, options)` / `token.argsFn((scope) => ...)` because a
token is resolved *from* a scope. Those take `ResolveOptions`, which is
`ProviderOptions` without `scope` (`ResolveOneOptions` adds `child`), so the
scope is never repeated inside an object passed next to it.

## Consequences

**Positive**

- One decorator argument, one shape: `@inject` reads as "call this with the
  context, inject the result". The ten overloads of `inject` and `injectProp`
  and the `toMappedToken` coercion are gone.
- The runtime-args cascade is written at the parameter — `{ args }` forwarded or
  not — instead of being implied by handing over a token. The library's
  explicit-injection stance (nothing in the args list is ever resolved for the
  caller) now applies to the decorator too.
- Every context callback destructures what it uses: `({ args = [] }) => args`,
  `({ scope }) => scope.resolve(...)`, `({ scope, ...options }) => scope.resolve(Target, options)`.
  No `_` placeholders for a scope the callback does not need.
- A custom injector or provider implements one signature with one options
  object, and a `ProviderOptions` value can be passed through unchanged.

**Negative / trade-offs**

- Breaking, with no shim: every `@inject(Token)`, `@inject('key')`,
  `@inject(Class)` and `injectProp('key')` becomes a function, and every
  `(scope, options)` callback, custom injector and direct `provider.resolve` /
  `injector.resolve` call changes shape.
- The shortest token injection grew from `@inject(Token)` to
  `@inject(({ scope, args }) => Token.resolve(scope, { args }))`. This ADR is
  the basis for what comes next, not the last word on the ergonomics; any
  shorthand builds on the single-`InjectFn` contract rather than beside it.
- Type inference from a token's generic to the parameter now flows through the
  function's return type instead of the `Injectable<T>` overloads.

## References

- `lib/injector/MetadataInjector.ts` — `inject`, `arg` / `args` / `argsFn`, `resolveArgs`
- `lib/hooks/injectProp.ts`, `lib/hooks/HookContext.ts` — `injectProp`, `setProperty`
- `lib/injector/IInjector.ts` — `InjectOptions`, `IInjector.resolve`, `Injector.createInstance`
- `lib/provider/IProvider.ts` — `ProviderOptions`, `ResolveOptions`, `ArgsFn`, `ResolveDependency`
- `lib/utils/fp.ts` — `pipe`
- `__tests__/specs/injector-strategies.spec.ts` — the single-function contract and `pipe` composition
- [ADR 0002 — Pluggable injector strategies](0002-pluggable-injectors.md)
- [ADR 0005 — Token immutability](0005-token-immutability.md)
- [ADR 0009 — Token taxonomy](0009-token-taxonomy.md)
