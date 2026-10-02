# Epic: Folder registration

- **Status:** Proposed
- **ADR:** [ADR 0022 - Registration discovery happens at build time, outside the container](../../../../adr/0022-build-time-registration-discovery.md)
- **Public API:** `tic build`, `*.bundle.json`, `build`, `loadConfig`, `findConfigFiles`
- **Executable spec:** `__tests__/specs/folder-registration.spec.ts`, `__tests__/specs/bundle.spec.ts`, `__tests__/specs/cli.spec.ts`

## Intent

As an application developer, I want to register every class of a folder at once
so that adding a service means writing the class, not also editing a
hand-maintained list of `addRegistration(...)` calls.

A folder is addressed the same way an import is: a path relative to the config file (`./src/services`) or a
`tsconfig.json` `paths` alias (`@app/services`).

## Stories

### Story: Describe the container in a config file

As an application developer, I can describe a generated bundle in one JSON
file so that the build is reproducible and reviewable.

Acceptance criteria:

- The CLI installs as `ts-ioc-container`, with `tic` as a shortcut: both
  `bin` entries run the same program.
- One config file describes one bundle and is named `<name>.bundle.json`. Its
  fields are flat and all optional: `output` (by convention `*.bundle.ts`),
  `name`, `tags`, `extends`, `importExtension`, `files` and
  `classes`.
- `name` is the bundle's name — letters, digits, `-` and `_`, starting with a
  letter — and defaults to the config file's stem (`production.bundle.json` →
  `production`), else `base`. The generated class is named after it:
  `ProductionBundle`, `BaseBundle`, `my-app` → `MyAppBundle`.
- `output` defaults to `<root>/<name>.bundle.ts`: `<root>` is the tsconfig's
  `rootDir`, else the common folder of the files it compiles. Without a
  tsconfig, `output` is required.
- `tic build` works on the package it is invoked in: the nearest folder with a
  `package.json`, from the working directory up — the project root, or the
  package in a monorepo; never a workspace root above it.
- There it builds every `*.bundle.json`, in name order; `--config <path>`
  (repeatable, relative to the working directory) builds only the named
  configs.
- Zero config: with no `*.bundle.json`, `tic build` (and `build()` without a
  config) builds one bundle from the package's `tsconfig.json`, every setting
  at its default. With neither, it fails with a hint naming the package.
- Several bundles — `production.bundle.json`, `development.bundle.json`,
  `test.bundle.json` — are several configs; a bundle one config generated is
  never registered by another.
- Every relative path in the config resolves against the config file's
  directory, not the working directory.
- An invalid config — including an unknown field, such as a leftover
  `bundles` list — fails the build with a message naming the config and the
  offending field; nothing is written for it.

### Story: A bundle extends a tsconfig

As an application developer, I can point a bundle at my tsconfig so that it
registers what my project compiles without restating its folders.

Acceptance criteria:

- `extends` names the tsconfig the bundle builds on, relative to the config
  file; default `./tsconfig.json`, which may be absent. A tsconfig named
  explicitly must exist.
- Without `files.paths`, the bundle's candidates are the files the tsconfig
  compiles — its `files` / `include` / `exclude`, following its own `extends`.
- `files.paths` overrides that set, as a child tsconfig's `include` overrides
  its parent's. With no tsconfig to extend, `files.paths` is required.
- `files.include`, `files.exclude` and the default test excludes filter the
  candidates either way.

### Story: Register the classes of a folder

As an application developer, I can list a folder in a bundle's `files.paths` so that
its classes become registrations of the generated bundle.

Acceptance criteria:

- A path is scanned recursively by default; `recursive: false` limits it to
  the folder itself.
- By default every exported class is registered.
- Abstract classes, non-exported classes and `.d.ts` files are never
  registered.
- A class exported by `export { X }`, `export { X as Y }` or `export default` is
  registered and imported under its exported name.
- The generated file is never scanned, even when it lives inside a scanned path.
- Registrations are ordered by file path, then by declaration order, so the
  output is stable across machines.

### Story: Select files by name before parsing

As an application developer whose project names files by convention
(`user.service.ts`), I can tell the bundler which files to parse, so that it
never reads the rest and bundling stays fast as the project grows.

Acceptance criteria:

- Selection runs in two stages: a bundle's `files` rule — its candidates (the
  tsconfig's file set, or `paths`) and the `include` / `exclude` globs — decides by path
  alone which files are read and parsed; its `classes` rule then picks classes out of
  the parsed files.
- `files.include` is a non-empty list of globs; a file is parsed only when it
  matches one of them. Omitted, every source file qualifies.
- A file outside `include` is never read.
- `files.exclude` lists globs of files never read (default: test files,
  `__tests__/`, `node_modules/`) and wins over `include`. Giving only `include`
  keeps the default `exclude`.
- Globs are relative to the config file and `/`-separated.
- A non-empty `exclude` replaces the defaults. An explicit `exclude: []` still
  parses tests deliberately. When a non-empty `exclude` omits a default glob,
  the build reports a warning (the escape hatch stays: `[]` warns for nothing).
- An invalid rule fails the build naming the offending field.

### Story: Configure which classes a file contributes

As an application developer, I can define how the bundler picks the target
classes out of a file so that a folder mixing services with helpers registers
only what I mean it to.

Acceptance criteria:

- A bundle's `classes` rule is an object; a class is selected when it is
  exported, not abstract, and meets every criterion the rule sets. Omitting
  a criterion applies no restriction, except `decorators`.
- `decorators` defaults to `["register"]`: by default only classes decorated
  with `@register` are registered. `"decorators": []` requires none.
- `export` restricts which exports count: `"any"` (default), `"named"` or
  `"default"`.
- `decorators` requires the class to carry one of the listed decorators,
  recognised by name — also when imported under another name or reached as a
  member (`@ioc.register(...)`). Composed decorators are listed like any other.
- `name` is a glob (`*Service`) the class name must match; for an anonymous
  default export the name is derived from the file name.
- `excludeClasses` drops classes by exact name and `excludeName` drops classes
  whose name matches a glob; both apply after every other criterion.
- The build warns, per bundle, when two selected classes pass the same
  plain-identifier first argument to a decorator (a same-token heuristic, since
  registration is last-wins); the warning suggests `classes.excludeClasses`.
  Aliased imports are not resolved — the check is syntactic. It does not warn
  when the colliding classes are distinguished by a decorator they share called
  with different arguments (`@perPage('stations')` vs `@perPage('sessions')`):
  those registrations are scope-gated, not last-wins.
- An invalid rule — including a string (`"classes": "decorated"`) — fails the
  build naming the offending field.

### Story: Address folders by tsconfig aliases

As an application developer, I can name a path by its `tsconfig.json`
`paths` alias so that the container config speaks the same import paths as the
code.

Acceptance criteria:

- A path such as `@app/services` resolves through the `paths` of the
  tsconfig the config `extends` (default `./tsconfig.json` next to the config
  file, which may be absent; one named explicitly must exist),
  including `paths` that tsconfig inherits through its own `extends`.
- A path that is neither an existing folder nor a resolvable alias fails
  the build with a message naming it.
- Generated imports use the most specific matching alias; a file no alias
  covers is imported by a path relative to the output file.
- Under `moduleResolution` `node16` / `nodenext` imports carry a `.js`
  extension; `importExtension` in the config overrides the inferred one.

### Story: Generate a bundle: a plain container module class

As an application developer, I receive ordinary TypeScript that uses only the
public `ts-ioc-container` API, so that the result type-checks, bundles and
tree-shakes like hand-written code.

Acceptance criteria:

- The bundle exports `registrations` (`Registration.fromClass(...)` per class)
  and a class implementing `IContainerModule` that adds them to a container:
  `container.useModule(new AppBundle())`.
- Two classes with the same name are both imported, the later one under a
  suffixed local name; the binding key still comes from the class itself.
- Applying the bundle with `container.useModule(new AppBundle())` makes every
  discovered class resolvable, with its `@register(...)` config honoured.
- The layout of the bundle is declared by a protocol — a Handlebars
  template in `lib/protocols/` (`Bundle.ts.hbs`), precompiled at
  build time — so the shape of the output is read in one place, not assembled
  in code. Names and paths are written verbatim, never HTML-escaped.

### Story: Keep bundles in sync in CI

As a maintainer, I can verify that bundles are current without
rewriting them so that CI catches a forgotten `tic build`.

Acceptance criteria:

- `tic build --check` writes nothing and exits non-zero when any output is
  missing or differs from what would be generated.
- `tic build` leaves an output that is already current untouched.

## Notes

Non-goals of this epic: glob patterns as paths, per-path scope or binding
rules, file or class filtering in code (predicates), and registrations other than classes (`fromValue`, `fromFn`).
The container itself is unchanged — discovery lives entirely in the bundler
package (ADR 0022).
