# Epic: Folder registration

- **Status:** Proposed
- **ADR:** [ADR 0022 - Registration discovery happens at build time, outside the container](../../../../adr/0022-build-time-registration-discovery.md)
- **Public API:** `tic build`, `*.bundle.{json,yaml,yml}`, `build`, `loadConfig`, `findConfigFiles`
- **Executable spec:** `__tests__/specs/folder-registration.spec.ts`, `__tests__/specs/bundle.spec.ts`, `__tests__/specs/cli.spec.ts`

## Intent

As an application developer, I want to register every class my project
compiles at once so that adding a service means writing the class, not also
editing a hand-maintained list of `addRegistration(...)` calls.

A bundle config is a tsconfig: the files it scans are the files it compiles,
chosen with the same `extends` / `include` / `exclude` a tsconfig uses.

## Stories

### Story: Describe the container in a config file

As an application developer, I can describe a generated bundle in one JSON
file so that the build is reproducible and reviewable.

Acceptance criteria:

- The CLI installs as `ts-ioc-container`, with `tic` as a shortcut: both
  `bin` entries run the same program.
- One config file describes one bundle and is named `<name>.bundle.json`, or
  `<name>.bundle.yaml` / `<name>.bundle.yml` in YAML — same fields, same
  schema; an empty YAML file is every setting at its default. One bundle
  described in two formats fails the build naming both files. It is shaped
  like a tsconfig, every field optional: `extends`, `include`, `exclude` and
  `compilerOptions` as in a tsconfig, plus the bundler's `output` (by
  convention `*.bundle.ts`) and `name` at the top level and
  `importExtension` and `classes` under `compilerOptions`.
- `name` is the bundle's name — letters, digits, `-` and `_`, starting with a
  letter — and defaults to the config file's stem (`production.bundle.json` →
  `production`), else `base`. The generated class is named after it:
  `ProductionBundle`, `BaseBundle`, `my-app` → `MyAppBundle`.
- `output` defaults to `<root>/<name>.bundle.ts`: `<root>` is the compiled
  `rootDir`, else the common folder of the files compiled, else the config's
  folder.
- `tic build` works on the package it is invoked in: the nearest folder with a
  `package.json`, from the working directory up — the project root, or the
  package in a monorepo; never a workspace root above it.
- There it builds every `*.bundle.{json,yaml,yml}`, in name order; `--config <path>`
  (repeatable, relative to the working directory) builds only the named
  configs.
- Zero config: with no config file, `tic build` (and `build()` without a
  config) builds one bundle from the package's `tsconfig.json`, every setting
  at its default. With neither, it fails with a hint naming the package.
- Several bundles — `production.bundle.json`, `development.bundle.json`,
  `test.bundle.json` — are several configs; a bundle one config generated is
  never registered by another.
- `extends` and `baseUrl` resolve against the config file's directory, not the
  working directory; `include`, `exclude` and `output` resolve against
  `baseUrl`, defaulting to the config file's directory.
- An invalid config — including an unknown top-level field, such as a
  leftover `files` section — fails the build with a message naming the config
  and the offending field; nothing is written for it. Compiler options other
  than the bundler's are validated by TypeScript, which names an unknown one.

### Story: A bundle extends a tsconfig

As an application developer, I can point a bundle at my tsconfig so that it
registers what my project compiles without restating its folders.

Acceptance criteria:

- `extends` names the tsconfig the bundle config extends, relative to the
  config file; default `./tsconfig.json`, which may be absent. A tsconfig named
  explicitly must exist.
- The bundle's files are the files the config compiles, as `tsc` parses it:
  the extended tsconfig's `files` / `include` / `exclude`, following its own
  `extends`, with the config's `include` and `exclude` replacing the parent's.
- The config's `compilerOptions`, without the bundler's own, apply on top of
  the extended tsconfig's — e.g. `paths` aliases for the generated imports.

### Story: Root the config at a baseUrl

As an application developer, I can set one `baseUrl` so my `include`,
`exclude` and `output` need not repeat a shared prefix such as `src`.

Acceptance criteria:

- `baseUrl` is relative to the config file; `include`, `exclude` and `output`
  resolve against it, defaulting to the config file's directory.
- When `include` is omitted, the whole `baseUrl` folder (`.`) is scanned; without
  `baseUrl`, an omitted `include` still inherits the extended tsconfig's.
- `extends` still resolves against the config file, not `baseUrl`.
- The resolved `baseUrl` is also handed to TypeScript as
  `compilerOptions.baseUrl` (unless the config sets that itself), so the
  generated imports are written in `baseUrl` form.
- Without `baseUrl`, every path resolves as before.

### Story: Register the classes of the files compiled

As an application developer, I can include a folder in a bundle config so
that its classes become registrations of the generated bundle.

Acceptance criteria:

- An included folder is scanned recursively, as `tsc` does; a single-star glob
  (`src/services/*`) limits it to the folder itself.
- By default every exported class is registered.
- Abstract classes, non-exported classes and `.d.ts` files are never
  registered.
- A class exported by `export { X }`, `export { X as Y }` or `export default` is
  registered and imported under its exported name.
- The generated file is never scanned, even when it lives inside a scanned folder.
- Registrations are ordered by file path, then by declaration order, so the
  output is stable across machines.

### Story: Select files by name before parsing

As an application developer whose project names files by convention
(`user.service.ts`), I can tell the bundler which files to parse, so that it
never reads the rest and bundling stays fast as the project grows.

Acceptance criteria:

- `include` globs pick the files that are scanned; a file outside them is
  never read.
- `exclude` globs drop files that `include` matches.
- Test files, `__tests__/` and `node_modules/` are never scanned, whatever is
  compiled.
- Globs are relative to the config file and `/`-separated.
- A non-list `include` or `exclude` fails the build naming the field.

### Story: Configure which classes a file contributes

As an application developer, I can define how the bundler picks the target
classes out of a file so that a folder mixing services with helpers registers
only what I mean it to.

Acceptance criteria:

- A bundle's `compilerOptions.classes` rule is an object; a class is selected when it is
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
  registration is last-wins); the warning suggests
  `compilerOptions.classes.excludeClasses`.
  Aliased imports are not resolved — the check is syntactic. It does not warn
  when the colliding classes are distinguished by a decorator they share called
  with different arguments (`@perPage('stations')` vs `@perPage('sessions')`):
  those registrations are scope-gated, not last-wins.
- An invalid rule — including a string (`"classes": "decorated"`) — fails the
  build naming the offending field (`compilerOptions.classes`).

### Story: Write imports in tsconfig alias form

As an application developer, I receive imports in the `tsconfig.json` `paths`
alias form my code uses, so that the bundle reads like hand-written code.

Acceptance criteria:

- Aliases are the `paths` the config compiles with: the extended tsconfig's,
  including `paths` it inherits through its own `extends`, or the config's
  own `compilerOptions.paths`.
- Generated imports use the most specific matching alias; a file no alias
  covers is imported relative to the tsconfig's `baseUrl` when it is under
  that folder, and otherwise by a path relative to the output file.
- Under `moduleResolution` `node16` / `nodenext` imports carry a `.js`
  extension; `compilerOptions.importExtension` overrides the inferred one.

### Story: Write imports in baseUrl form

As an application developer whose `tsconfig.json` sets `baseUrl`, I receive
imports relative to it, so that the bundle reads like my non-relative,
`baseUrl`-resolved code.

Acceptance criteria:

- `baseUrl` is the resolved `baseUrl` the config compiles with, including one
  inherited through `extends`, resolved against the tsconfig that declares it.
- A file under `baseUrl` that no `paths` alias covers is imported as the bare
  specifier relative to `baseUrl` (`services/Logger`); a `paths` alias that
  matches still wins, and a file outside `baseUrl` is imported relative to the
  output file.
- `baseUrl` only widens resolution: without it, imports stay relative to the
  output as before.


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

Non-goals of this epic: per-folder scope or binding rules, file or class filtering in code (predicates), and registrations other than classes (`fromValue`, `fromFn`).
The container itself is unchanged — discovery lives entirely in the bundler
package (ADR 0022).
