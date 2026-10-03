# AGENTS.md — @ts-ioc-container/bundler

Bundles an application's dependencies into a single container module for
`ts-ioc-container`: the `tic` CLI scans what a tsconfig compiles and generates a typed bundle
(`useModule(new AppBundle())`). Discovery happens at build time (ADR 0022);
nothing here runs inside the container, and the core package is not changed by
it.

- The CLI is `ts-ioc-container`, with `tic` as a shortcut (both `bin` entries,
  same program). One config file describes one bundle: `<name>.bundle.json`, or the same in
  YAML as `<name>.bundle.yaml` / `.yml` (an empty YAML file = all defaults)
  (schema: `tic.schema.json`), shaped like a tsconfig — `extends`, `include`,
  `exclude`, `compilerOptions` — plus the bundler's `baseUrl`, `output` and `name`
  at the top level and `compilerOptions.importExtension` / `compilerOptions.classes`;
  all optional. `tic build` works on
  the package it is invoked in (nearest `package.json` up from the working
  directory; never a workspace root): it builds every `*.bundle.{json,yaml,yml}` there
  (or the ones named with repeatable `-c`), else — zero config — one bundle
  from that package's `tsconfig.json` with every default. Each writes one class — `export class AppBundle implements IContainerModule`,
  applied with `container.useModule(new AppBundle())`. Several bundles (e.g.
  `production.bundle.json`, `development.bundle.json`) mean several configs.
  `--check` writes nothing and exits 1 when an output is stale — run it in CI.
- A config is a tsconfig that `extends` another (default `./tsconfig.json`, may
  be absent; one named explicitly must exist): TypeScript parses it with the
  bundler's own fields removed, so the files it compiles (its `include` /
  `exclude` replacing the parent's) are the bundle's file set, and the merged
  `paths` aliases, `baseUrl` and module resolution shape the generated imports
  (most specific alias, else a path relative to `baseUrl` when the file is under
  it, else a relative path). Every compiler option but `classes`
  and `importExtension` goes to TypeScript, which reports unknown ones.
  The top-level `baseUrl` (default the config's directory) is the base the
  config's own `include`, `exclude` and `output` resolve against — so they need
  not repeat a shared prefix — and is passed to TypeScript as
  `compilerOptions.baseUrl` unless that is set too; `extends` stays relative to
  the config file. With `baseUrl` set, an omitted `include` defaults to the whole
  `baseUrl` folder (`.`); without it, an omitted `include` still inherits the
  extended tsconfig's.
  `output` defaults to `<root>/<name>.bundle.ts`: root = compiled `rootDir`,
  else the common folder of the files compiled. `name` defaults to the config's
  stem (`production.bundle.json` → `production`), else `base`; the class is
  `toClassName(name)` — `ProductionBundle`, `BaseBundle`.
- Test files, `__tests__/` and `node_modules/` (`DEFAULT_EXCLUDE`) are never
  scanned, whatever is compiled; neither are files `tic build` generated. With
  file naming conventions, a narrow `include` is the speed lever — nothing else
  is read.
- `compilerOptions.classes: { export, decorators, name, excludeClasses, excludeName }`
  picks classes of the scanned files; default is every exported,
  non-abstract class decorated with `@register` (`decorators` defaults to
  `["register"]`; `[]` requires none); positive criteria must all hold and then `excludeClasses` (exact
  names) and `excludeName` (glob) drop classes.
  Decorators match by name, so composed ones must be listed. The build warns when
  two selected classes pass the same plain-identifier first decorator argument (a
  same-token heuristic), unless a decorator they share has differing arguments
  (scope-gated, e.g. `@perPage('a')` vs `@perPage('b')`).
- Never edit a `*.bundle.ts` by hand — change the classes or the config and
  rerun `tic build`.
- Unknown config fields are errors, except inside `compilerOptions`, where
  TypeScript reports unknown compiler options.
- Programmatic API: `build({ config, cwd, check })` (one config, one output),
  `findConfigFiles(dir)`, `run(argv, io)`, `loadConfig(file)`; every error the
  bundler raises on purpose is a `TicError` with a stable `code`
  (`TicConfigError` = `INVALID_CONFIG`, `UsageError`,
  `StaleBundlesError`, …).
- Internals follow `release-monorepo-semantically` (ADR 0023): `createContainer(io)`
  in `lib/app.ts` is the composition root; `Application` resolves the controller
  registered under the command name (`@register('build')`) and runs its
  `@onDefault(invoke)` action, which parses its own options with
  `@inject(pipe(commandArgs, parseOptions(spec), validate(SCHEMA)))`. Work lives in
  services behind tokens (`IBundleBuilderKey`, `ITicConfigServiceKey`, …); pure
  logic in `lib/features/build/domain/`. A new command is a controller plus a module.
- The config schema is `BUNDLE_CONFIG_SCHEMA` (zod); `tic.schema.json` is generated
  from it with `pnpm run generate:schema` — never edit it by hand.
