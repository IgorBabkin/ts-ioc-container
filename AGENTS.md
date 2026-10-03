# Repository Guidelines

## Project Structure & Module Organization

Core library code lives in `lib/`, organized by concern: `container/`, `provider/`, `injector/`, `registration/`, `token/`, `hooks/`, and `errors/`. Product-facing behavior specs live in `specs/`; architectural decisions live in `adr/`. Tests live in `__tests__/`: `__tests__/specs/` contains executable acceptance specs, `__tests__/readme/` contains executable documentation examples, and the remaining folders generally mirror the source layout (for example `lib/injector/` maps to `__tests__/injector/`). Supporting scripts are in `scripts/`. Treat `cjm/`, `esm/`, and `typings/` as build outputs, not source files.

## Build, Test, and Development Commands

- `pnpm install`: install root and workspace dependencies.
- `pnpm run build`: generate CommonJS, ESM, and declaration outputs.
- `pnpm test`: run the Vitest suite.
- `pnpm run test:spec`: run executable acceptance specs only.
- `pnpm run test:coverage`: run tests with coverage summary and `lcov`.
- `pnpm run type-check`: run strict TypeScript checks without emitting files.
- `pnpm run lint`: lint `lib/`, `__tests__/`, and `scripts/`.
- `pnpm run format`: format TypeScript files with Prettier.
- `pnpm exec vitest run __tests__/container/IocContainer.spec.ts`: run a single test file.

## Coding Style & Naming Conventions

Use TypeScript with strict typing and 2-space indentation. Follow existing naming patterns: PascalCase for classes and many implementation files (`Container.ts`), `I*` prefixes for interfaces (`IContainer.ts`), and `.spec.ts` for tests. Export public API changes through `lib/index.ts`. ESLint and Prettier are the enforced standards; run `pnpm run lint` and `pnpm run format` before opening a PR.

## Testing Guidelines

Vitest is the test runner. Add public behavior coverage in `__tests__/specs/` when changing an accepted spec, and add focused implementation or regression tests alongside the relevant area of the codebase. Prefer behavior-focused specs that cover container resolution, scopes, hooks, provider behavior, and token behavior. Use file names like `FeatureName.spec.ts`. Run `pnpm test` locally before submitting; use `pnpm run test:coverage` for larger changes.

## Commit & Pull Request Guidelines

Commits follow conventional commits. A release-triggering commit (`feat`, `fix`, `perf`, `docs`, or `!`) must be scoped to the exact package name, e.g. `feat(ts-ioc-container): add hasRegistration` or `fix(@ts-ioc-container/react): ...`; any other scope releases nothing. Never use explicit bump tags (`[major]`, `[minor]`, `[patch]`, `[skip-bump]`): the release tool applies them to every package and ignores the scope, so a scoped commit with `[major]` bumps all packages (this happened in PR #223); encode the level with the commit type and `!` instead. Non-release types (`test`, `ci`, `chore`, `refactor`, `style`) may use a free-form scope, e.g. `test(token): cover alias resolution`. Keep subjects under 100 characters. Releases are cut by `release-monorepo-semantically`; its agent guide (pipeline, release context, config, error codes) is at `node_modules/release-monorepo-semantically/llms.txt`, and `.release.json` validates against the schema it ships. PRs should include a clear summary, linked issue if applicable, and notes on tests run.

## Documentation & Generated Files

Do not edit generated outputs directly. Update source files in `lib/`, update behavior specs in `specs/`, and record durable decisions in `docs/adr/`. For README changes edit `.readme.hbs.md` and regenerate with `pnpm run generate:docs`.
