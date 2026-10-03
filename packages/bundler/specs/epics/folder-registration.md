# Epic: Folder registration

- **Status:** Proposed
- **ADR:** [ADR 0022 - Registration discovery happens at build time, outside the container](../../../../adr/0022-build-time-registration-discovery.md)
- **Public API:** `tic build`, `*.bundle.{json,yaml,yml}`, `build`, `loadConfig`, `findConfigFiles`
- **Executable spec:** `__tests__/specs/folder-registration.spec.ts`, `__tests__/specs/bundle.spec.ts`, `__tests__/specs/cli.spec.ts`

## Intent

As an application developer, I want to register every class of a folder at once
so that adding a service means writing the class, not also editing a
hand-maintained list of `addRegistration(...)` calls.

A folder is addressed the same way an import is: a path relative to the config file (`./src/services`) or a
`tsconfig.json` `paths` alias (`@app/services`).

## Stories

### Story: Describe the container in a config

As an application developer, I can describe a generated bundle in one config
and build it in a shell pipeline, so that the build is reproducible,
reviewable and composes with any other tool.

Acceptance criteria:

- The CLI installs as `ts-ioc-container`, with `tic` as a shortcut: both
  `bin` entries run the same program.
- `tic build <config>` reads the config file — JSON for `.json`, YAML for
  `.yaml` / `.yml`; any other extension fails — and prints the bundle to stdout.
  It writes no file: `tic build app.bundle.json > src/di/app.bundle.ts`.
- Without `<config>`, or with `-`, the config is read from stdin as YAML (which
  covers JSON): `cat dev.bundle.json | tic build > src/di/dev.bundle.ts`.
  Nothing piped in fails with a usage error; more than one `<config>` too.
- Warnings and errors go to stderr, never into the bundle on stdout; an error
  names the config (`<stdin>` for piped text), and nothing is printed then.
- The config's fields are flat and explicit: `glob` with its `paths` is
  required — a folder (`glob: ./src`) or a list of folders is shorthand for
  `{ paths: [...] }` with the default `exclude`; `name`, `tsconfig`, `importExtension` and `className` are optional.
- `name` is the bundle's name — letters, digits, `-` and `_`, starting with a
  letter — and defaults to the config file's stem (`production.bundle.json` →
  `production`); piped text, or a file named otherwise, must set it. The
  generated class is named after it: `ProductionBundle`, `my-app` →
  `MyAppBundle`.
- Relative paths in a config file resolve against the file; in piped text,
  against the working directory.
- Several bundles — production, development, test — are several configs and
  several runs; a saved bundle is never registered by another build.
- An invalid config — including an unknown field, such as a leftover `output`
  or `bundles` — fails the build with a message naming the offending field.

### Story: Name every input explicitly

As an application developer, I can read a bundle's inputs off its config, so
that what it registers never depends on what my tsconfig happens to compile.

Acceptance criteria:

- A bundle scans its `glob.paths` and nothing else; the files its tsconfig
  compiles play no part.
- The generated bundle's header lists the paths it scanned.

### Story: Register the classes of a folder

As an application developer, I can list a folder in a bundle's `glob.paths` so that
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

- Selection runs in two stages: a bundle's `glob` rule — its `paths` and its
  `exclude` globs — decides by path
  alone which files are read and parsed; its `className` rule then picks classes out of
  the parsed files.
- `glob.exclude` is a glob or a list of globs of files never read (default: test files,
  `__tests__/`, `node_modules/`); every other source file in `paths` is parsed.
  There is no `include`: it is an unknown field.
- An excluded file is never read.
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

- A bundle's `className` rule is an object; a class is selected when it is
  exported, not abstract, and meets every criterion the rule sets. Omitting
  a criterion applies no restriction, except `decorators`.
- `decorators` defaults to `["register"]`: by default only classes decorated
  with `@register` are registered. `"decorators": []` requires none.
- `export` restricts which exports count: `"any"` (default), `"named"` or
  `"default"`.
- `decorators` requires the class to carry one of the listed decorators,
  recognised by name — also when imported under another name or reached as a
  member (`@ioc.register(...)`). Composed decorators are listed like any other.
- `glob` is a glob (`*Service`), or a non-empty list of them, the class name
  must match one of; for an anonymous default export the name is derived from
  the file name.
- `exclude` is a glob, or a non-empty list of them, the class name must match
  none of; it applies after every other criterion. A plain class name is a glob
  matching only itself, so `["MockUserRepository", "*Fake"]` drops one class by
  name and a family by pattern.
- The build warns, per bundle, when two selected classes pass the same
  plain-identifier first argument to a decorator (a same-token heuristic, since
  registration is last-wins); the warning suggests `className.exclude`.
  Aliased imports are not resolved — the check is syntactic. It does not warn
  when the colliding classes are distinguished by a decorator they share called
  with different arguments (`@perPage('stations')` vs `@perPage('sessions')`):
  those registrations are scope-gated, not last-wins.
- An invalid rule — including a string (`"className": "decorated"`) — fails the
  build naming the offending field.

### Story: Address folders by tsconfig aliases

As an application developer, I can name a path by its `tsconfig.json`
`paths` alias so that the container config speaks the same import paths as the
code.

Acceptance criteria:

- A path is either a folder relative to the config file (`./src/services`) or
  a tsconfig `paths` alias (`@app/services`), resolved through the `paths` of
  the config's `tsconfig` (default `./tsconfig.json` next to the config,
  which may be absent; one named explicitly must exist), including `paths`
  that tsconfig inherits through its own `extends`. The tsconfig contributes
  aliases and module resolution only, never files.
- A path that is neither an existing folder nor a resolvable alias fails
  the build with a message naming it.
- Generated imports use the most specific matching alias, and only aliases:
  the bundle has no known location, so it works wherever it is saved. A
  selected class no alias covers fails the build naming its file.
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

As a maintainer, I can verify that a saved bundle is current so that CI
catches a forgotten `tic build`.

Acceptance criteria:

- The same config always prints the same bundle, so a saved bundle is checked
  with `tic build app.bundle.json | diff - src/di/app.bundle.ts`.

## Notes

Non-goals of this epic: glob patterns as paths, per-path scope or binding
rules, file or class filtering in code (predicates), and registrations other than classes (`fromValue`, `fromFn`).
The container itself is unchanged — discovery lives entirely in the bundler
package (ADR 0022).
