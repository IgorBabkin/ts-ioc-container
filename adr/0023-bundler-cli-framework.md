# ADR 0023 — The bundler CLI is built on the container, like `release-monorepo-semantically`

- **Status:** Proposed
- **Date:** 2026-10-03
- **Deciders:** core maintainers
- **Tags:** tooling, bundler, cli

## Context

`@ts-ioc-container/bundler` (ADR 0022) grew as a set of free functions: `build()`
loaded a config, scanned, rendered and wrote the bundle; `cli.ts` hand-parsed
`argv` and decided which configs to build; `config.ts` validated
`*.bundle.json` with a hand-written checker, and `tic.schema.json` was
maintained by hand next to it — two definitions of one shape that could drift.

[`release-monorepo-semantically`](https://github.com/IgorBabkin/release-monorepo-semantically),
the release tool this repository already uses, is a CLI built on
`ts-ioc-container` itself: a composition root of feature modules, controllers
registered under their command name whose actions are hooks, services behind
`SingleToken`s, zod-validated config that also generates the published JSON
Schema, and domain exceptions with stable codes. One shape for both tools lowers
the cost of working on either, and makes the bundler a real consumer of the
library it generates code for.

## Decision

Structure the bundler the way `release-monorepo-semantically` is structured:

- **Composition root** (`lib/app.ts`): `createContainer(io)` builds one
  `Container` per run from `CommonModule`, `BuildModule` and `HelpModule`.
- **Application** (`lib/cli/Application.ts`): `tic <command> [action] [--flags]`
  resolves the controller registered under `<command>` and runs the hooks it
  declares under `[action]` (`@onDefault(invoke)` / `@action(name, invoke)`),
  handing the raw command line to the hook as runtime args. Failures go to the
  `IErrorHandler`, which returns the exit code. `--help` / `--version` are
  aliases of the `help` / `version` commands.
- **Controllers** (`features/<feature>/<Feature>Controller.ts`) are CLI adapters:
  an action parses its own options at the parameter,
  `@inject(pipe(commandArgs, parseOptions(spec), validate(SCHEMA)))`, calls
  services and prints. `BuildController` builds every discovered config, names
  the config in each warning and error, and turns stale bundles under `--check`
  into a `StaleBundlesError`, so every non-zero exit flows through one handler.
- **Services** behind tokens: `IBundleBuilder` (one config → one bundle, what
  `build()` used to be), `ITicConfigService` (load a JSON/YAML config, discover
  which configs to build), `IFileSystemService`, `IRenderService`,
  `IOutputService`, `ILogger`. Pure domain code (scanning, tsconfig reading,
  import paths, globs, config-file discovery, token collisions, the bundle view)
  stays as functions under `features/build/domain/`.
- **Config** is one zod schema, `BUNDLE_CONFIG_SCHEMA`; `tic.schema.json` is
  generated from it (`pnpm run generate:schema`) and a test fails when the
  committed file is stale. Error messages keep their `field: expected …` form;
  string lists are validated as one value so a bad element is reported at the
  list, as the author wrote it.
- **Errors** extend `TicError`, which carries a stable `code`
  (`INVALID_CONFIG`, `NAMESPACE_NOT_FOUND`, `USAGE`, `STALE_BUNDLES`, …).

Deliberate differences from the release tool: options are parsed with
`node:util` `parseArgs` instead of commander (no dependency, and commander 14
needs Node 20 while the bundler supports 18); core's own `invoke` combinator
replaces a local `execute()`; and `run(argv, io)` returns the exit code instead
of setting `process.exitCode`, so it stays callable from tests and scripts.

The public API is kept: `build()`, `run()` and `loadConfig()` are facades that
build a container, resolve the service and dispose it.

## Consequences

**Positive**

- The JSON Schema editors validate against cannot drift from what `tic build`
  accepts.
- Each piece is unit-testable with mocks (`moq.ts`); a new command is a
  controller plus a module, without touching `Application`.
- The bundler dog-foods `@register`, `@inject`, `pipe`, hooks and
  `HookCollector` — a regression there shows up in the bundler's own tests.

**Negative / trade-offs**

- New runtime dependencies: `ts-ioc-container` (`workspace:*`), `reflect-metadata`
  and `zod`. Every core release already cascaded into a bundler release (it was
  a dev dependency), so the release graph does not change.
- More files and indirection for what is still a single-command tool.
- Messages for unknown or malformed flags now come from `parseArgs`
  (`Unknown option '--watch'`), and running `tic` with no command prints
  `missing command` above the usage.

## References

- ADR 0022
- `packages/bundler/lib/app.ts`, `packages/bundler/lib/cli/`, `packages/bundler/lib/features/`
- `release-monorepo-semantically`: `src/index.ts`, `src/cli/`, `src/features/`
