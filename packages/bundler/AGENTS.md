# AGENTS.md — @ts-ioc-container/bundler

Bundles an application's dependencies into a single container module for
`ts-ioc-container`: the `tic` CLI scans folders and generates a typed bundle
(`useModule(new AppBundle())`). Discovery happens at build time (ADR 0022);
nothing here runs inside the container, and the core package is not changed by
it.

- The CLI is `ts-ioc-container`, with `tic` as a shortcut (both `bin` entries,
  same program). One config file describes one bundle: `<name>.bundle.json`
  (schema: `tic.schema.json`), flat — `output`, `name`, `tags`, `extends`,
  `importExtension`, `files`, `classes`, all optional. `tic build` works on
  the package it is invoked in (nearest `package.json` up from the working
  directory; never a workspace root): it builds every `*.bundle.json` there
  (or the ones named with repeatable `-c`), else — zero config — one bundle
  from that package's `tsconfig.json` with every default. Each writes one class — `export class AppBundle implements IContainerModule`,
  applied with `container.useModule(new AppBundle())`. Several bundles (e.g.
  `production.bundle.json`, `development.bundle.json`) mean several configs.
  `--check` writes nothing and exits 1 when an output is stale — run it in CI.
- A config `extends` a tsconfig (default `./tsconfig.json`, may be absent; one
  named explicitly must exist), like a child tsconfig: what it compiles is the
  bundle's file set, and its `paths` aliases and module resolution shape the
  generated imports (most specific alias, else a relative path). `output`
  defaults to `<root>/<name>.bundle.ts`: root = tsconfig `rootDir`, else the
  common folder of its files; name from `<name>.bundle.json`, else `app`.
- Selection has two stages. `files: { paths, include, exclude }` decides by path
  which files are read and parsed at all. `paths` override the tsconfig's file
  set with folders (relative to the config, or tsconfig aliases); required when
  there is no tsconfig. A candidate must match one of `include` (default: all)
  and none of `exclude` (default: test files, `__tests__/`, `node_modules/`; a
  non-empty list replaces it, and the build warns if it drops a default). Globs
  are relative to the config. With file naming conventions, `include` is the
  speed lever — nothing else is read. Files `tic build` generated are never input.
- `classes: { export, decorators, name, excludeClasses, excludeName }`
  then picks classes of the parsed files; default is every exported,
  non-abstract class decorated with `@register` (`decorators` defaults to
  `["register"]`; `[]` requires none); positive criteria must all hold and then `excludeClasses` (exact
  names) and `excludeName` (glob) drop classes.
  Decorators match by name, so composed ones must be listed. The build warns when
  two selected classes pass the same plain-identifier first decorator argument (a
  same-token heuristic), unless a decorator they share has differing arguments
  (scope-gated, e.g. `@perPage('a')` vs `@perPage('b')`).
- Never edit a `*.bundle.ts` by hand — change the classes or the config and
  rerun `tic build`.
- Unknown config fields are errors, at every level.
- Programmatic API: `build({ config, cwd, check })` (one config, one output),
  `findConfigFiles(dir)`, `run(argv, io)`, `loadConfig(file)`; errors are `TicConfigError` / `NamespaceNotFoundError`
  (both `TicError`).
