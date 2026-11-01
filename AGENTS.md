# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm workspace; the root is a shell and is never published. The core library is `packages/ts-ioc-container/`: source in `lib/` (organized by concern: `container/`, `provider/`, `injector/`, `registration/`, `token/`, `hooks/`, `metadata/`, `errors/`), tests in `__tests__/`, product specs in `specs/`. Its `__tests__/readme/` holds the executable examples and cookbook recipes that `README.md` includes, and `__tests__/specs/` the executable acceptance specs; the remaining test folders mirror `lib/`. Other packages: `packages/react` (React bindings), `packages/bundler` (the `tic` CLI), `packages/openapi-to-server`, `packages/openapi-to-zod`, and the private `packages/scripts` (build and release tooling). Architectural decisions live in `adr/` at the root. Treat `cjm/`, `esm/`, and `typings/` as build outputs, not source files. `CLAUDE.md` has the full architecture notes.

Each published package ships its own consumer `AGENTS.md` (listed in `files`); keep it in sync with the API, and keep its recipes executed by a test (`packages/ts-ioc-container/__tests__/readme/agentRecipes.spec.ts` for the core).

## Build, Test, and Development Commands

- `pnpm install`: install root and workspace dependencies.
- `pnpm run build`: generate CommonJS, ESM, and declaration outputs.
- `pnpm test`: run the Vitest suite.
- `pnpm run test:spec`: run executable acceptance specs only.
- `pnpm run test:coverage`: run tests with coverage summary and `lcov`.
- `pnpm run type-check`: run strict TypeScript checks without emitting files.
- `pnpm run lint`: lint every package.
- `pnpm run format`: format TypeScript files with Prettier.
- `pnpm exec vitest run __tests__/readme/mediator.spec.ts`: run a single test file (from the package's own directory).

## Coding Style & Naming Conventions

Use TypeScript with strict typing and 2-space indentation. Follow existing naming patterns: PascalCase for classes and many implementation files (`Container.ts`), `I*` prefixes for interfaces (`IContainer.ts`), and `.spec.ts` for tests. Export public API changes through `lib/index.ts`. ESLint and Prettier are the enforced standards; run `pnpm run lint` and `pnpm run format` before opening a PR.

## Testing Guidelines

Vitest is the test runner. Add public behavior coverage in `__tests__/specs/` when changing an accepted spec, and add focused implementation or regression tests alongside the relevant area of the codebase. Prefer behavior-focused specs that cover container resolution, scopes, hooks, provider behavior, and token behavior. Use file names like `FeatureName.spec.ts`. Run `pnpm test` locally before submitting; use `pnpm run test:coverage` for larger changes.

## Commit & Pull Request Guidelines

Commits follow conventional commits. A release-triggering commit (`feat`, `fix`, `perf`, `docs`, or `!`) must be scoped to the exact package name, e.g. `feat(ts-ioc-container): add hasRegistration` or `fix(@ts-ioc-container/react): ...`; any other scope releases nothing. Non-release types (`test`, `ci`, `chore`, `refactor`, `style`) may use a free-form scope, e.g. `test(token): cover alias resolution`. Keep subjects under 100 characters. Releases are cut by `release-monorepo-semantically`; its agent guide (pipeline, release context, config, error codes) is at `node_modules/release-monorepo-semantically/llms.txt`, and `.release.json` validates against the schema it ships. PRs should include a clear summary, linked issue if applicable, and notes on tests run.

## Documentation & Generated Files

Do not edit generated outputs directly. Update source files in `lib/`, update behavior specs in `specs/`, and record durable decisions in `adr/`. For core README changes edit `packages/ts-ioc-container/.readme.hbs.md` and regenerate with `pnpm run generate:docs`; a new cookbook recipe is a spec in `__tests__/readme/` included from that template.
