# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript IoC container library providing dependency injection with type safety, scoping, lifecycle hooks, and multiple injection strategies. Zero runtime dependencies (except `reflect-metadata`).

Uses **pnpm** workspaces:
- Root: the library itself
- `docs/`: Astro documentation site (separate workspace)

## Common Commands

```bash
pnpm test                        # Run all tests
pnpm run test:coverage           # Run tests with coverage
pnpm run type-check              # TypeScript type checking (no emit)
pnpm run lint:fix                # Auto-fix linting issues
pnpm run build                   # Build all formats (CJS, ESM, types)
pnpm run generate:docs           # Regenerate README.md from .readme.hbs.md

pnpm exec jest __tests__/path/to/test.spec.ts   # Run a single test file
pnpm exec jest -t "test name pattern"            # Run tests matching pattern

pnpm --filter ts-ioc-container-docs run build   # Build docs site
```

## Architecture

### Container as Linked List

`Container` is a **linked list node** — each instance holds a `parent` reference (an `IContainer`, defaulting to `EmptyContainer` at the root). Child scopes are created via `createScope({ tags })` and linked to their parent.

**Resolution cascades up the parent chain**: if a key isn't found in the current scope (or fails the `scopeAccess` rule), resolution delegates to `this.parent.resolve(...)`. `EmptyContainer` terminates the chain by throwing `DependencyNotFoundError`.

### Four Core Abstractions

1. **Container** (`lib/container/Container.ts`) — manages provider map, alias map, scopes, instances, and lifecycle hooks. `createScope` clones matching registrations into the new child scope.

2. **Registration** (`lib/registration/Registration.ts`) — wraps a Provider with binding key and scope match rules. `registration.applyTo(scope)` is called during `createScope`; the scope match rule decides whether to register into that scope.

3. **Provider** (`lib/provider/Provider.ts`) — factory that creates/returns instances. Composed via `.pipe(...)` with transforms: `singleton()`, `lazy()`, `args()`, `argsFn()`, `scopeAccess()`, `decorate()`.

4. **Injector** (`lib/injector/`) — three strategies for constructor injection:
   - `MetadataInjector`: reads `@inject` decorators via `reflect-metadata` (default)
   - `SimpleInjector`: passes the container itself as the first constructor argument
   - `ProxyInjector`: injects a `Record<string, unknown>` proxy as the first argument

### Pipe System

**`ProviderPipe`** is an interface with two methods: `mapProvider` (transforms `IProvider`) and `mapRegistration` (transforms `IRegistration`). All exported pipe functions (`singleton()`, `lazy()`, `args()`, etc.) are `ProviderPipe` objects created via `registerPipe()`.

- **`IProvider.pipe()`** — accepts raw functions or `ProviderPipe` objects (extracts `mapProvider`)
- **`IRegistration.pipe()` and `@register()`** — accepts `ProviderPipe` objects (calls `mapRegistration`) plus registration-only pipes (`bindTo()`, `scope()`)

`scope()` and `bindTo()` are **not** `ProviderPipe` — they only work at registration level.

Pipe order generally doesn't matter except for `decorate()`: it wraps the instance at the point it appears in the chain, so order relative to `lazy()` changes whether you decorate the proxy or the real instance.

### Scope Access vs Scope Match Rules

Two distinct concepts:
- **ScopeMatchRule** (via `scope(...)`): determines which scopes a registration is cloned into during `createScope`
- **ScopeAccessRule** (via `scopeAccess(...)`): controls whether a provider can be resolved from a given invocation scope

### Cross-Scope Injection Limitation

Inner scopes can access outer (parent) dependencies, but **outer scopes cannot access inner (child) dependencies**. If registration A uses `scope((c) => c.hasTag('parent'))` and its constructor injects B which is only registered in child scopes, A will fail with `DependencyNotFoundError` — because A's providers are only registered in the parent, which has no access to child-scope providers.

Workaround: register A for both scopes, or use `scopeAccess` for visibility control instead of scope match rules.

### Token Types

`SingleToken`, `GroupAliasToken`, `SingleAliasToken`, `GroupInstanceToken`, `ClassToken`, `FunctionToken`, `ConstantToken` — all in `lib/token/`. Tokens define how a dependency key is resolved (single instance, group by alias, group by predicate, etc.).

### Token Immutability (One-Way Linked List)

`token.args(...)`, `token.argsFn(...)`, and `token.lazy()` always return **new token instances** — the parent token is never mutated. Think of it as a one-way linked list: parent → many independent children. Each token stores its own contribution to the args chain and delegates to its parent for the rest.

This means the same base token can be safely specialized at multiple injection sites:
```typescript
const ApiToken = new SingleToken<IApiClient>('IApiClient');
const dataToken = ApiToken.args('https://data.api.com', 5000);  // new token
const userToken = ApiToken.args('https://users.api.com', 1000); // another new token, ApiToken unchanged
```

Chaining appends to the sequence: `token.args('a').argsFn(() => ['b', 'c'])` produces args `['a', 'b', 'c']`.

All token classes accept `{ getArgsFn?, isLazy? }` as an optional second constructor argument for internal state propagation. Never pass this from outside — use `.args()`, `.argsFn()`, `.lazy()` instead.

### ProxyInjector Conventions

- **`args` reserved keyword**: `deps.args` returns the raw `args[]` array passed at resolve time
- **Alias convention**: property names containing `"alias"` (case-insensitive) resolve via `resolveByAlias` instead of `resolve`

### resolveByArgs and Token Args

`resolveByArgs` is an `ArgsFn` that maps each element of the `args` array: `InjectionToken` instances are resolved from the container, constructors are resolved by type, primitives pass through. Use with `setArgsFn(resolveByArgs)` on providers that need to accept token arguments:

```typescript
@register(bindTo(EntityManagerToken), setArgsFn(resolveByArgs))
class EntityManager {
  constructor(public repo: IRepository) {}
}
// ValueToken is resolved and its value passed as constructor arg
EntityManagerToken.args(ValueToken).resolve(container);
```

### Hooks

`@onConstruct` and `@onDispose` decorators trigger after construction / on disposal. Requires adding `AddOnConstructHookModule` / `AddOnDisposeHookModule` to the container. `@hook` is the generic base. `injectProp` enables property injection within hooks.

## Important File Conventions

- **Edit source only**: `lib/` — never `cjm/`, `esm/`, `typings/` (build outputs)
- **README.md is generated**: edit `.readme.hbs.md`, then run `pnpm run generate:docs`
- **Tests mirror source**: `__tests__/` structure matches `lib/`
- **All public APIs** exported from `lib/index.ts`

## Test Scope Name Conventions

- Backend: `application`, `request`, `transaction`
- Frontend: `application`, `page`, `widget`

## Commit Message Conventions

### Scopes that prevent package releases (use these when no API change)
`docs`, `test`, `ci`, `chore`, `refactor`, `style`

### Scopes that trigger releases (semantic-release)
`feat` → minor bump, `fix` / `perf` → patch bump, `BREAKING CHANGE` → major bump

### Special rules
- Documentation site changes (`docs/src/pages/`): **always** `docs(pages):` — never `fix(docs):` or `feat(docs):`
- CI performance improvements: **always** `ci(perf):` — never `perf(ci):` (which would trigger a release)

**Before committing**: ask "should this trigger a package release?" If not, use a non-release type.