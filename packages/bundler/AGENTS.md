# AGENTS.md — @ts-ioc-container/bundler

Bundles an application's dependencies into a single container module for
`ts-ioc-container`: the `tic` CLI scans folders and generates a typed bundle
(`useModule(new AppBundle())`). Discovery happens at build time (ADR 0022);
nothing here runs inside the container, and the core package is not changed by
it.

- The CLI is `ts-ioc-container`, with `tic` as a shortcut (both `bin` entries,
  same program): `tic build [<config>...]` is a Unix filter. It reads the config
  file `<config>` (JSON for `.json`, YAML for `.yaml` / `.yml`) — several are
  merged left to right into one bundle — or, without one or with `-`, config
  text from stdin (parsed as YAML, which covers JSON; never merged) — and
  prints the bundle to **stdout**; it writes nothing. Saving is the shell's
  job: `tic build app.bundle.json > src/di/app.bundle.ts`,
  `cat dev.bundle.json | tic build > src/di/dev.bundle.ts`; CI checks with
  `tic build app.bundle.json | diff - src/di/app.bundle.ts`. There is no zero
  config, but an argument that is not a config file stands for one named `app`:
  `tic build [<tsconfig>] <path>...` scans the folders, files and globs given
  (relative to the working directory; `paths.include`) through the aliases of the
  tsconfig (default `./tsconfig.json`), and `tic build <tsconfig>` alone scans the
  folders its aliases point to (`paths.tsconfig: <tsconfig>`). A tsconfig is
  `tsconfig.json` / `tsconfig.*.json`; a `.json` / `.yaml` / `.yml` or
  `<name>.bundle.*` file is a config; anything else is a path. Config files
  cannot be combined with a tsconfig or paths. Progress (each
  bundled class as `  Name: path`, then a `Bundled …` summary), warnings and
  errors go to stderr. The bundle is `export class AppBundle implements
IContainerModule`, applied with `container.useModule(new AppBundle())`.
- Every import in a bundle is written through a tsconfig `paths` alias, so the
  bundle works wherever it is saved; a selected class no alias covers fails the
  build naming its file. There are no relative imports.
- Config fields (schema: `tic.schema.json`), flat: `paths` with `paths.include`
  or `paths.tsconfig` required; `match`, `name`, `tsconfig`, `importExtension` optional.
  Relative paths resolve against the config file; for piped text, against the
  working directory. `name` defaults to the file's stem (`prod.bundle.json` →
  `prod`) and is required for piped text or a file named otherwise; the class
  is `toClassName(name)` — `ProdBundle`.
- A config does **not** extend its tsconfig and never takes its `include`,
  `exclude` or `files`. The `tsconfig` field (default `./tsconfig.json`, may be
  absent; one named explicitly must exist) supplies `paths` aliases — which
  `paths.include` may name and generated imports are written in — and the module
  resolution that sets the import extension. Only `paths.tsconfig` (a tsconfig
  path or glob, or a list, relative to the config — `./packages/*/tsconfig.json`;
  never on by default) turns aliases into files: it also scans the folders the
  aliases of every tsconfig it matches point to (`"@app/*": ["./src/*"]` →
  `./src`, an exact alias its source file; `baseUrl` and `extends` followed,
  `node_modules` and missing targets skipped), with `paths.include` adding to them
  and `paths.exclude` applying to both. An entry matching no file fails the build.
  Imports still go through the config's own `tsconfig`; `paths.tsconfig`
  concatenates when configs merge.
- Selection has two stages, `paths: { include, exclude }` and
  `match: { ..., glob, exclude }`. `paths` is always an object (a string
  or a list in its place is an error); `match` also takes a string or a
  list as a shortcut for `match.glob`. `paths` decides by path which files
  are read and parsed at all. `paths.include` (required unless `paths.tsconfig`:
  one entry or a non-empty list) names what is scanned — folders, always with
  their sub-folders, relative to the config file (`./src/services`) or tsconfig
  aliases (`@app/services`); source files (`./src/Clock.ts`); or globs of files
  (`./src/**/*.service.ts`, `@app/**/*.service.ts` — the folder before the first
  wildcard may be an alias); there is no `{ path, recursive }` form. A file in them is parsed unless it matches one
  of `exclude` (one glob or a list, each relative to the config file or starting
  with a tsconfig alias — `@generated/**`, or `@generated` for the whole folder;
  catch-all `"*"` aliases are skipped; default: test files, `__tests__/`,
  `node_modules/`; a non-empty value replaces it, and the build warns if it drops
  a default). Files `tic build` generated are never input.
- `match: { export, decorators, glob, exclude }` (or `match: '*Service'`
  / `['*Service', '*Repository']` = `match.glob`, default `export` and
  `decorators`) then picks classes of the parsed files; default is every exported,
  non-abstract class decorated with `@register` (`decorators` defaults to
  `["register"]`; `[]` requires none); positive criteria must all hold — `glob` is one glob
  or a list the class name must match one of — and then `exclude` (one glob or a
  list; a plain class name matches only itself) drops classes.
  Decorators match by name, so composed ones must be listed. The build warns when
  two selected classes pass the same plain-identifier first decorator argument (a
  same-token heuristic), unless a decorator they share has differing arguments
  (scope-gated, e.g. `@perPage('a')` vs `@perPage('b')`).
- Several configs merge like webpack-merge (`mergeConfigs`):
  `tic build common.bundle.yml prod.bundle.yml > src/di/prod.bundle.ts`.
  Objects merge field by field; the list fields `paths.include`,
  `paths.exclude`, `match.glob`, `match.exclude` and `match.decorators`
  concatenate without duplicates (a later config only adds); any other value
  set later replaces an earlier one; the `match` shorthand merges as
  `match.glob`. Each file is validated alone (`BUNDLE_CONFIG_FILE_SCHEMA`:
  `paths` optional; errors name the file), the merged result as one config
  (`BUNDLE_CONFIG_SCHEMA`). Defaults apply to the merged config only. The last
  file names the bundle unless one sets `name`; all must sit in one folder.
- Never edit a `*.bundle.ts` by hand — change the classes or the config and
  rerun `tic build`.
- Unknown config fields are errors, at every level.
- Programmatic API: `build({ config, cwd })` (`config`: a file or a list merged
  left to right), `build({ text, cwd })` or `build({ tsconfig, include, cwd })` (as
  `tic build <tsconfig> <path>...`) returns
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
