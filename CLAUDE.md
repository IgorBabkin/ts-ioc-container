# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript IoC container library providing dependency injection with type safety, scoping, lifecycle hooks, and multiple injection strategies. Zero runtime dependencies (except `reflect-metadata`).

Uses **pnpm** workspaces:
- Root: the library itself (`ts-ioc-container`)
- `packages/react`: `@ts-ioc-container/react` — React bindings (`Scope`, `ScopeContext`, `useScopeOrFail`, `useResolveOrFail`, `OutOfScopeError`)
- `packages/scripts`: `@ts-ioc-container/scripts` — private build/release tooling shared across packages (`build.mjs`, `postbuild-extensions.mjs`, `generate-readme/`, release commit template)
- `docs/`: Astro documentation site (separate, private workspace)

Both `ts-ioc-container` and `@ts-ioc-container/react` are released independently by
[`release-monorepo-semantically`](https://github.com/IgorBabkin/release-monorepo-semantically)
— see [Release](#release) below. `docs` is `private: true` and never released.

## Common Commands

```bash
pnpm test                        # Run all tests (core package)
pnpm run test:coverage           # Run tests with coverage (core package)
pnpm run type-check              # TypeScript type checking (no emit, core package)
pnpm run lint:fix                # Auto-fix linting issues (core package)
pnpm run build                   # Build all formats (CJS, ESM, types) for the core package
pnpm run generate:docs           # Regenerate README.md from .readme.hbs.md

pnpm run test:react              # Run @ts-ioc-container/react tests
pnpm run type-check:react        # Type check @ts-ioc-container/react
pnpm run lint:react              # Lint @ts-ioc-container/react
pnpm run build:react             # Build @ts-ioc-container/react

pnpm run test:all                # Run tests for every released package
pnpm run build:all               # Build every released package

pnpm exec vitest run __tests__/path/to/test.spec.ts   # Run a single test file (from the package's own directory)
pnpm exec vitest -t "test name pattern"                # Run tests matching pattern

pnpm --filter ts-ioc-container-docs run build   # Build docs site
```

## Release

Both packages are released by `release-monorepo-semantically`, driven directly
by a sequence of `pnpm exec monorepo-semantic-release <step> --context "$RELEASE_CONTEXT"`
steps in `.github/workflows/publish.yml` — one workflow step per pipeline step,
matching the tool's own README usage example (no wrapper script). It discovers
packages via the `workspaces` field in the root `package.json` (not
`pnpm-workspace.yaml`, which is only for `pnpm install`), and matches commit
scopes to package `name`s exactly — e.g. `feat(@ts-ioc-container/react): ...`
or `feat(ts-ioc-container): ...`.

To preview a release locally without mutating anything, run the same steps by
hand with `--dry-run` appended to each (see the tool's README "Usage" section);
`report` always requires a clean working tree, dry-run or not.

The root `.npmrc` sets `workspaces-update=false`. Without it, `pnpm version`
(used by the package-manager release step) treats the root `workspaces` field
as an npm/yarn-workspaces marker and silently runs `npm install` to reconcile
`package-lock.json` — undesirable and slow in this pnpm-only repo. Don't remove
that setting without re-checking for that side effect.

The release commit template lives at
`packages/scripts/release/templates/release-commit-msg.hbs` — it overrides the tool's
default `[skip-ci]` marker (hyphenated, not recognized by GitHub Actions) with
`[skip ci]`, so the release commit the pipeline pushes doesn't re-trigger
`publish.yml`.

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

### Token Args and Explicit Injection

**Constructor params without `@inject` resolve to `undefined`.** Injection is
explicit — annotate every parameter that should come from the container or the
runtime args list.

When args are forwarded into a constructor (via `token.args(...)`,
`appendArgs(...)`, `appendArgsFn(...)`), the injector resolves any element that is an
`InjectionToken` and passes everything else through as a literal. **Bare
constructors are not auto-resolved** — wrap a class in `ClassToken` to opt into
resolution.

```typescript
@register(bindTo(EntityManagerToken), singleton(MultiCache.fromFirstArg))
class EntityManager {
  constructor(@inject(args(0)) public repo: IRepository) {}
}
// UserRepositoryToken is an InjectionToken — auto-resolved before reaching @inject(args(0))
EntityManagerToken.args(UserRepositoryToken).resolve(container);
```

### Hooks

`@onConstruct` and `@onContainerDisposed` decorators trigger after construction / on disposal. Requires adding `AddOnConstructHookModule` / `AddOnDisposeHookModule` to the container. `@hook` is the generic base. `injectProp` enables property injection within hooks.

### `@throws` JSDoc Convention

Every function/method that can `throw` — directly, or indirectly via a method it calls (e.g. `Container.resolve` cascading into `EmptyContainer.resolve`) — gets a JSDoc comment with one `@throws {ErrorClass} condition` tag per distinct error type. See `lib/container/Container.ts`, `lib/container/EmptyContainer.ts`, `lib/provider/Provider.ts`, `lib/registration/Registration.ts`, `lib/hooks/HooksRunner.ts`, `lib/token/*.ts` for examples.

## Important File Conventions

- **Edit source only**: `lib/` — never `cjm/`, `esm/`, `typings/` (build outputs)
- **README.md is generated**: edit `.readme.hbs.md`, then run `pnpm run generate:docs`
- **Tests mirror source**: `__tests__/` structure matches `lib/`
- **All public APIs** exported from `lib/index.ts`

## Test Scope Name Conventions

- Backend: `application`, `request`, `transaction`
- Frontend: `application`, `page`, `widget`

## Git Conventions

- **The main branch is `main`, not `master`.** Target `main` as the base for pull requests, and always create new branches from `main` (`git checkout -b my-branch origin/main`) — never from `master`, which is a stale, protected, long-diverged branch. Do not trust a local `origin/HEAD` symref or tool-reported "main branch" hint without verifying against `gh repo view --json defaultBranchRef` or `git ls-remote --symref origin HEAD` first, since a stale local checkout can point `origin/HEAD` at `master`.

## Commit Message Conventions

### Types that prevent package releases (use these when no API change)
`docs`, `test`, `ci`, `chore`, `refactor`, `style`

### Types that trigger releases
`feat` → minor bump, `fix` / `perf` → patch bump, `BREAKING CHANGE` (or `!` after
the type/scope) → major bump

### Scope must be the exact package name

`release-monorepo-semantically` (see [Release](#release)) matches a commit to a
package by comparing the commit's parenthetical **scope** against that
package's `name` field **exactly** — not a substring, not a free-form label.
A release-triggering commit must scope to `ts-ioc-container` or
`@ts-ioc-container/react`:

```
feat(ts-ioc-container): add X
fix(@ts-ioc-container/react): correct Y
```

A commit scoped to anything else (`feat(hooks): ...`, `fix(docs): ...`) —
including the free-form, feature-area scopes this repo used historically —
**will not trigger a release for either package.** Non-release types
(`docs`, `test`, `ci`, `chore`, `refactor`, `style`) can still use a free-form
scope, or none, since they never trigger a release regardless of scope.

### Special rules
- Documentation site changes (`docs/src/pages/`): **always** `docs(pages):` — never `fix(docs):` or `feat(docs):`
- CI performance improvements: **always** `ci(perf):` — never `perf(ci):` (which would trigger a release)

**Before committing**: ask "should this trigger a package release?" If so, scope
it to the exact package name. If not, use a non-release type.
