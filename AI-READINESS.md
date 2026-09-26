# AI-Readiness Checklist — `ts-ioc-container`

Goal: an AI agent writing consumer code against the **installed** version of the
package gets it right on the first try, or is steered to the fix by the compiler
or the error it hits. Agents rely on three things: stale training data, whatever
is in `node_modules/ts-ioc-container`, and error output. Every item below
improves one of them.

Paths are relative to `packages/ts-ioc-container/` unless stated otherwise.

## Phase 1 — Ship what agents read (quick wins)

- [ ] **Keep JSDoc in published typings.** `tsconfig.production.json` sets
      `removeComments: true`, and the `types` build uses it, so every JSDoc
      block (including all `@throws` tags) is stripped from `typings/`. Pass
      `--removeComments false` to the `types` entry in
      `packages/scripts/build.mjs`; JS output can keep stripping comments.
      - [ ] Verify: `grep -c '@throws' typings/container/Container.d.ts` > 0
- [ ] **Add `@example` blocks** to the core public API (none exist today):
      - [ ] `register`, `bindTo`, `scope`
      - [ ] `inject`, `by`, `pipe`, `injectProp`
      - [ ] `singleton`, `lazy`, `args`, `argsFn`, `scopeAccess`, `decorate`
      - [ ] `Container`, `createScope`, `resolve`, `dispose`
      - [ ] `SingleToken`, `.args()`, `.argsFn()`, `.lazy()`
      - [ ] `hook`, `HookCollector`, `sequential`, `parallel`, `oncePerInstance`
- [ ] **Consumer-facing `AGENTS.md` in the package** (separate from the
      contributor-facing root `AGENTS.md`), added to `files` in `package.json`
      so it ships at the installed version:
      - [ ] Setup: `import 'reflect-metadata'`, `experimentalDecorators`,
            `emitDecoratorMetadata`
      - [ ] Canonical way per task (register, inject, scope, singleton, args, hooks)
      - [ ] Common mistakes:
            - constructor params without `@inject` resolve to `undefined`
            - `@inject(by(Token))`, not `@inject(Token)` (ADR 0019)
            - hooks are only collected; the app wires a runner (ADR 0016–0018),
              with the three copy-paste runner snippets
            - args arrive as-is; resolve tokens via `token.argsFn(...)`
            - outer scopes cannot resolve inner-scope-only dependencies
      - [ ] "Removed in vN → use X" table for recent majors
            (`OnConstructModule`, `OnDisposeModule`, `OnResolvedModule`,
            `resolved(...)`, `toMappedToken`, `Injectable` on `inject`, …)
- [ ] **`llms.txt`** at the repo root and in the package: short index pointing
      to README sections and `AGENTS.md`.
- [ ] **Ship readable source:** enable `declarationMap: true` and add `lib/**/*`
      to `files`, so go-to-definition lands on commented source.
- [ ] **Fix `homepage`** in `package.json`: it points to the removed
      `igorbabkin.github.io/ts-ioc-container` site. Point it at the package
      README on GitHub.

## Phase 2 — Errors that say how to fix the problem

- [ ] Add a stable `code` to `ContainerError` and each subclass
      (e.g. `IOC_DEPENDENCY_NOT_FOUND`), documented in the package `AGENTS.md`.
- [ ] `DependencyNotFoundError` (`Container.ts`, `EmptyContainer.ts`): include
      the key, the scope's tags, and a hint (not registered / `scope(...)` rule
      excluded it / outer scope resolving an inner-scope dependency).
- [ ] `ArgumentNotFoundError` (`lib/utils/array.ts`): add a message (currently none).
- [ ] `MethodNotImplementedError` (22 throw sites, 9 with just
      `'not implemented'`): name the class and method.
- [ ] `UnsupportedTokenTypeError`: list the supported token types.
- [ ] Rename `CannonSingletonApplyTwiceError` → `CannotApplySingletonTwiceError`
      (keep the old name as a `@deprecated` alias).
- [ ] Tests asserting message and `code` for each error.

## Phase 3 — API stability policy

- [ ] ADR: **deprecate before removal**. A removed or renamed export stays for
      at least one major, marked `@deprecated Use X — see ADR NNNN`.
- [ ] ADR: **batch breaking changes** into planned majors instead of one per change.
- [ ] Mark one canonical path per task in docs; move alternatives
      (`appendArgs`/`appendArgsFn`, `SimpleInjector`/`ProxyInjector`, less common
      token classes) under an "Advanced" heading.
- [ ] Turn likely agent mistakes into **compile errors** where cheap
      (e.g. confirm `@inject(Token)` without `by` fails to type-check).
- [ ] Consider a dev-mode warning when a constructor param has no `@inject`.

## Phase 4 — Test the library with agents

- [ ] Create an eval suite (e.g. `packages/agent-evals/`, `private: true`):
      15–20 prompts such as "register a request-scoped repository that depends
      on a singleton logger", "add an onConstruct hook and run it".
- [ ] Each case: fresh consumer project that has **only the packed tarball**
      (`pnpm pack`), agent solves the prompt, result graded by `tsc` + a test.
- [ ] Record pass rate per release; run before every major.
- [ ] Add a failing case to the suite whenever a user reports an agent mistake.

## Phase 5 — Distribution and migration tooling

- [ ] Get listed in agent-facing doc indexes (Context7-style) — needs a
      current README and `llms.txt`.
- [ ] Codemods for breaking changes (`npx ts-ioc-container-migrate <from> <to>`).
- [ ] Optional: Claude Code skill / plugin wrapping the package `AGENTS.md`
      and migration table.
- [ ] Same treatment for `@ts-ioc-container/react` (JSDoc in typings,
      `AGENTS.md` in tarball, error codes for `OutOfScopeError`).
