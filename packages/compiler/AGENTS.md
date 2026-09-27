# AGENTS.md — @ts-ioc-container/compiler

Build-time registration discovery for `ts-ioc-container` (ADR 0022). Ships the
`tic` CLI; nothing here runs inside the container, and the core package is not
changed by it.

- `tic build` reads `tic.config.json` (schema: `tic.schema.json`) and writes one
  generated module per `modules[]` entry. `--check` writes nothing and exits 1
  when an output is stale — run it in CI.
- A namespace is a folder: relative to the config file, or a tsconfig `paths`
  alias. Generated imports use the most specific alias, else a relative path.
- Default selection is every exported, non-abstract class. A module's
  `select: { export, decorators, nameGlob }` narrows it; a class must meet every
  criterion set. Decorators match by name, so composed ones must be listed.
- Never edit a `*.generated.ts` by hand — change the classes or the config and
  rerun `tic build`.
- Programmatic API: `build({ config, cwd, check })`, `run(argv, io)`,
  `loadConfig(file)`; errors are `TicConfigError` / `NamespaceNotFoundError`
  (both `TicError`).
