# AGENTS.md — @ts-ioc-container/compiler

Build-time registration discovery for `ts-ioc-container` (ADR 0022). Ships the
`tic` CLI; nothing here runs inside the container, and the core package is not
changed by it.

- `tic build` reads `tic.config.json` (schema: `tic.schema.json`) and writes one
  bundle per `bundles[]` entry — a generated class, `export class AppBundle implements IContainerModule`, applied with `container.useModule(new AppBundle())`. `--check` writes nothing and exits 1
  when an output is stale — run it in CI.
- A namespace is a folder: relative to the config file, or a tsconfig `paths`
  alias. Generated imports use the most specific alias, else a relative path.
- Default selection is every exported, non-abstract class. A module's
  `select: { export, decorators, nameGlob }` narrows it; a class must meet every
  criterion set. Decorators match by name, so composed ones must be listed.
- Never edit a `*.bundle.ts` by hand — change the classes or the config and
  rerun `tic build`.
- Files take part when they match no `exclude` glob **and** an
  `InclusionPredicate` (`({ filename }) => boolean`, filename relative to the
  config) returns true. The predicate comes from `build({ include })`, else the
  bundle's `include` file, else a conventional `tic.include.*` next to the
  config. Predicate files are `require`d once per process — read env vars
  inside the predicate. README "Recipe: generate per environment" shows the
  per-environment setup.
- Prefer `byTags((tags, context) => ...)` (a `TagInclusionPredicate`) over parsing
  file names: tags are the dot-parts between base name and extension
  (`Report.production.eu.ts` → `['production', 'eu']`). Usage examples:
  `__tests__/examples/inclusion-predicates.spec.ts`.
- For a lean production build, the production entry must import only the
  production bundle (README "One bundle per environment"); statically importing
  both bundles ships both.
- Programmatic API: `build({ config, cwd, check })`, `run(argv, io)`,
  `loadConfig(file)`; errors are `TicConfigError` / `NamespaceNotFoundError`
  (both `TicError`).
