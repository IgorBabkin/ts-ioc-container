# AGENTS.md — @ts-ioc-container/bundler

Bundles an application's dependencies into a single container module for
`ts-ioc-container`: the `tic` CLI scans folders and generates a typed bundle
(`useModule(new AppBundle())`). Discovery happens at build time (ADR 0022);
nothing here runs inside the container, and the core package is not changed by
it.

- The CLI is `ts-ioc-container`, with `tic` as a shortcut (both `bin` entries,
  same program): `tic build --tsconfig <file> [<config>...]` is a Unix filter. It reads the config
  file `<config>` (JSON for `.json`, YAML for `.yaml` / `.yml`) — several are
  merged left to right into one bundle — or, without one or with `-`, config
  text from stdin (parsed as YAML, which covers JSON; never merged) — and
  prints the bundle to **stdout**; it writes nothing. Saving is the shell's
  job: `tic build --tsconfig tsconfig.json app.bundle.json > src/di/app.bundle.ts`,
  `cat dev.bundle.json | tic build --tsconfig tsconfig.json > src/di/dev.bundle.ts`; CI checks with
  `tic build --tsconfig tsconfig.json app.bundle.json | diff - src/di/app.bundle.ts`. Progress (each
  bundled class as `  Name: path`, then a `Bundled …` summary), warnings and
  errors go to stderr. The bundle is `export class AppBundle implements
IContainerModule`, applied with `container.useModule(new AppBundle())`.
- Every import in a bundle is written through a tsconfig `paths` alias, so the
  bundle works wherever it is saved; a selected class no alias covers fails the
  build naming its file. There are no relative imports.
- Config fields (schema: `tic.schema.json`) are flat — no field nests another, so
  configs merge one level deep, and related fields share a prefix; a test enforces it —
  and **none has a default**:
  `bundleClassName`, `importExtension`, `include`, `exclude`, `matchExport` and
  `matchDecorators` are required (`matchGlob`, `matchExclude` are optional
  filters). JSON and YAML both work. Relative paths resolve against the config
  file; for piped text, against the working directory. `bundleClassName` is the
  generated class, written as given (letters, digits, `_`, a capital first); it never
  comes from the file.
  `importExtension` is written as given (`""` for none), never inferred.
- A config does **not** name a tsconfig, and a bundle never takes files from one.
  The required `--tsconfig` option of `tic build` (the `tsconfig` option of
  `build()`; relative to the working directory, must exist, nothing is assumed)
  only supplies `paths` aliases — which `include` may
  name and generated imports are written in (most specific alias, else a
  relative path).
- Selection has two stages, `include` and `exclude`, then the `match*` fields.
  `include` and `exclude` decide by path which files are read
  and parsed at all. `include` (required: one folder or a
  non-empty list) names the folders scanned, always with their sub-folders —
  relative to the config file (`./src/services`) or tsconfig aliases
  (`@app/services`); there is no `{ path, recursive }` form. A file in them is parsed unless it matches one
  of `exclude` (one glob or a list, each relative to the config file or starting
  with a tsconfig alias — `@generated/**`, or `@generated` for the whole folder;
  catch-all `"*"` aliases are skipped; `[]` excludes nothing, so test files are
  scanned unless listed). `node_modules` folders are never walked, and files
  `tic build` generated are never input.
- `matchExport`, `matchDecorators`, `matchGlob` and `matchExclude` then pick
  classes of the parsed files: exported, non-abstract classes meeting `matchExport` and
  `matchDecorators` (`[]` requires none); positive criteria must all hold — `matchGlob` is one glob
  or a list the class name must match one of — and then `matchExclude` (one glob or a
  list; a plain class name matches only itself) drops classes.
  Decorators match by name, so composed ones must be listed. The build warns when
  two selected classes pass the same plain-identifier first decorator argument (a
  same-token heuristic), unless a decorator they share has differing arguments
  (scope-gated, e.g. `@perPage('a')` vs `@perPage('b')`).
- Several configs merge like webpack-merge (`mergeConfigs`):
  `tic build --tsconfig tsconfig.json common.bundle.yml prod.bundle.yml > src/di/prod.bundle.ts`.
  The list fields `include`,
  `exclude`, `matchGlob`, `matchExclude` and `matchDecorators`
  concatenate without duplicates (a later config only adds); any other value
  set later replaces an earlier one. Each file is validated alone
  (`BUNDLE_CONFIG_FILE_SCHEMA`: every field optional; errors name the file), the
  merged result as one config (`BUNDLE_CONFIG_SCHEMA`). All must sit in
  one folder.
- `extends: ./common.bundle.yml` (optional; a path relative to the config file, or to
  the working directory for piped text) merges that config first and this one on top:
  the same merge as naming both on the command line, so the files must share a folder.
  It chains, a cycle fails the build, and a file extended twice counts once.
- Never edit a `*.bundle.ts` by hand — change the classes or the config and
  rerun `tic build`.
- Unknown config fields are errors, at every level.
- Programmatic API: `build({ config, cwd })` (`config`: a file or a list merged
  left to right) or `build({ text, cwd })` returns
  `{ content, bundle, registrations, warnings }` and writes nothing;
  `loadConfig(file | files)`, `run(argv, io)` (`io.stdin` backs piped configs); every error the
  bundler raises on purpose is a `TicError` with a stable `code`
  (`TicConfigError` = `INVALID_CONFIG`, `NamespaceNotFoundError`, `UsageError`,
  …).
- Internals follow `release-monorepo-semantically` (ADR 0023): `createContainer(io)`
  in `lib/app.ts` is the composition root; `Application` resolves the controller
  registered under the command name (`@register('build')`) and runs its
  `@onDefault(invoke)` action (a word in the action position that names no
  declared action is the default action's argument: `tic build <config>`), which parses its own options with
  `@inject(pipe(commandArgs, parseOptions(spec), validate(SCHEMA)))`. Work lives in
  services behind tokens (`IBundleServiceKey`, `ITicConfigServiceKey`, …); pure
  logic in `lib/features/bundle/domain/`. A new command is a controller plus a module.
- The config schema is `BUNDLE_CONFIG_SCHEMA` (zod); `tic.schema.json` is generated
  from its per-file variant `BUNDLE_CONFIG_FILE_SCHEMA` with `pnpm run generate:schema`
  — never edit it by hand.
