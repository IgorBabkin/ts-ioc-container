# AGENTS.md — @ts-ioc-container/bundler

Bundles an application's dependencies into a single container module for
`ts-ioc-container`: the `tic` CLI scans folders and generates a typed bundle
(`useModule(new AppBundle())`). Discovery happens at build time (ADR 0022);
nothing here runs inside the container, and the core package is not changed by
it.

- The CLI is `ts-ioc-container`, with `tic` as a shortcut (both `bin` entries,
  same program). `tic build` reads `.bundles.json` (schema: `tic.schema.json`) and writes one
  bundle per `bundles[]` entry — a generated class, `export class AppBundle implements IContainerModule`, applied with `container.useModule(new AppBundle())`. `--check` writes nothing and exits 1
  when an output is stale — run it in CI.
- Selection has two stages. `files: { paths, include, exclude }` decides by path
  which files are read and parsed at all. `paths` (required) are the folders
  scanned: relative to the config file, or tsconfig `paths` aliases; generated
  imports use the most specific alias, else a relative path. Within them (globs
  relative to the config) a file
  must match one of `include` (default: all) and none of `exclude` (default:
  test files, `__tests__/`, `node_modules/`; a non-empty list replaces it, and
  the build warns if it drops a default). With file naming conventions,
  `include` is the speed lever — nothing else is read.
- `classes: { export, decorators, name, excludeClasses, excludeName }`
  then picks classes of the parsed files; default is every exported,
  non-abstract class; positive criteria must all hold and then `excludeClasses` (exact
  names) and `excludeName` (glob) drop classes.
  Decorators match by name, so composed ones must be listed. The build warns when
  two selected classes pass the same plain-identifier first decorator argument (a
  same-token heuristic), unless a decorator they share has differing arguments
  (scope-gated, e.g. `@perPage('a')` vs `@perPage('b')`).
- Never edit a `*.bundle.ts` by hand — change the classes or the config and
  rerun `tic build`.
- Unknown config fields are errors.
- Programmatic API: `build({ config, cwd, check })`, `run(argv, io)`,
  `loadConfig(file)`; errors are `TicConfigError` / `NamespaceNotFoundError`
  (both `TicError`).
