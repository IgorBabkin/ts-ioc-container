# AI-Readiness Checklist

Goal: an AI agent writing consumer code against the **installed** version of
`ts-ioc-container` gets it right on the first try, or is steered to the fix by
the compiler or the error it hits. Agents rely on three things: stale training
data, whatever is in `node_modules/ts-ioc-container`, and error output. Every
item below improves one of them. Policy: [ADR 0020](adr/0020-agent-readable-api-and-deprecation-policy.md).

Paths are relative to `packages/ts-ioc-container/` unless stated otherwise.

## Phase 1 — Ship what agents read

- [x] Keep JSDoc in published typings (`--removeComments false` for the `types`
      build in `packages/scripts/build.mjs`); `@throws` tags now reach `typings/`
- [x] JSDoc on the public API: 171 of 197 exported declarations (was 44); the
      rest are internal (`AliasMap`) or small option types
- [x] `@example` blocks on the core API:
  - [x] `register`, `bindTo`, `scope`
  - [x] `inject`, `arg`, `argsFn`, `pipe`
  - [x] `singleton`, `lazy`, `appendArgs`, `appendArgsFn`, `scopeAccess`, `decorate`, `registerPipe`
  - [x] `Container`, `Registration`, `IContainer.resolve`, `IContainer.createScope`
  - [x] `SingleToken`, `GroupAliasToken`, `FunctionToken`, `select`
  - [x] `hook`, `IContainerModule`, `SimpleInjector`, `ProxyInjector`
- [x] Consumer `AGENTS.md` in both packages, listed in `files`
  - [x] Setup, recipes, pitfalls, removed-API table, error codes
  - [x] Recipes and pitfalls executed by `__tests__/readme/agentRecipes.spec.ts`
- [x] `llms.txt` at the repo root
- [x] Ship readable source: declaration maps and `lib/**/*` in `files`
- [x] Fix `homepage` in both `package.json`s (pointed at the removed docs site)
- [x] `pnpm run verify:package-contents` passes with the new `files` entries

## Phase 2 — Errors that say how to fix the problem

- [x] Stable `code` on `ContainerError` and every subclass, documented in `AGENTS.md`
- [x] `DependencyNotFoundError` lists the likely causes (not registered,
      `scope(...)`, `scopeAccess(...)`, registered after `createScope()`)
- [x] `ArgumentNotFoundError` from `findArgOrFail` has a message
- [x] `MethodNotImplementedError`: all 22 sites name the class and method
- [x] `UnsupportedTokenTypeError` lists the supported inputs
- [x] `ContainerDisposedError`, `ProviderDisposedError`, `TypedEventDisposedError`,
      `DependencyMissingKeyError` say what to do
- [x] `CannonSingletonApplyTwiceError` → `CannotApplySingletonTwiceError`, old name
      kept as a `@deprecated` alias
- [x] react `OutOfScopeError` has `code: 'IOC_OUT_OF_SCOPE'` and a fix hint
- [x] Tests: `__tests__/errors.spec.ts`, react adapter spec

## Phase 3 — API stability policy

- [ ] Accept [ADR 0020](adr/0020-agent-readable-api-and-deprecation-policy.md)
      (deprecate before removal, batch breaking changes) — **Proposed, needs a maintainer decision**
- [x] Likely agent mistakes fail at compile time, locked in by tests:
      `@inject(Token)` without `by`, `container.resolve(Token)`
- [ ] Mark one default approach per task in `.readme.hbs.md`; move alternatives
      (`appendArgs` / `appendArgsFn`, `SimpleInjector` / `ProxyInjector`, less common
      token classes) under an "Advanced" heading
- [ ] Dev-mode warning when a constructor param has no `@inject` (needs a design:
      parameter count is visible via `Target.length`, but default params hide it)

## Phase 4 — Test the library with agents

- [ ] Eval suite (e.g. `packages/agent-evals/`, `private: true`): 15–20 prompts,
      each solved by an agent in a fresh project that has only the `pnpm pack`
      tarball, graded by `tsc` + a test; needs an API key in CI
- [ ] Track pass rate per release; add a case for every reported agent mistake

## Phase 5 — Distribution and migration tooling

- [x] Release docs: `docs(<package>)` commits publish a patch
      (`report.bumps` in `.release.json`, `release-monorepo-semantically` 1.12.1)
- [ ] Submit the repo to agent doc indexes (Context7-style) — external, maintainer action
- [ ] Codemods for breaking changes (`npx ts-ioc-container-migrate <from> <to>`)
- [ ] Optional: Claude Code skill / plugin wrapping `AGENTS.md`
