# Epic: Folder registration

- **Status:** Proposed
- **ADR:** [ADR 0022 - Registration discovery happens at build time, outside the container](../../../../adr/0022-build-time-registration-discovery.md)
- **Public API:** `tic build`, `*.bundle.{json,yaml,yml}`, `build`, `loadConfig`, `mergeConfigs`, `findConfigFiles`
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
- `tic build --tsconfig <file> <config>` reads the config file — JSON for `.json`, YAML for
  `.yaml` / `.yml`; any other extension fails — and prints the bundle to stdout.
  It writes no file: `tic build --tsconfig tsconfig.json app.bundle.json > src/di/app.bundle.ts`.
- Without `<config>`, or with `-`, the config is read from stdin as YAML (which
  covers JSON): `cat dev.bundle.json | tic build --tsconfig tsconfig.json > src/di/dev.bundle.ts`.
  Nothing piped in fails with a usage error; more than one `<config>` too.
- Warnings and errors go to stderr, never into the bundle on stdout; an error
  names the config (`<stdin>` for piped text), and nothing is printed then.
- The config's fields are flat and explicit, and none has a default: `bundleClassName`,
  `importExtension`, `include`, `exclude`, `match.export` and
  `match.decorators` are required, and a missing one fails the build naming it.
  `match` is always an object — a glob or a list in its place is an error. A `tsconfig` field is an error: the tsconfig is given to the
  command.
- `bundleClassName` is the name of the generated class, written as given, nothing
  added: letters, digits and `_`, starting with a capital letter. It is never taken
  from the file name.
- Relative paths in a config file resolve against the file; in piped text,
  against the working directory.
- Several bundles — production, development, test — are several runs, each
  of its own configs; a saved bundle is never registered by another build.
- An invalid config — including an unknown field, such as a leftover `output`
  or `bundles` — fails the build with a message naming the offending field.

### Story: Merge configs, like webpack-merge

As an application developer with one bundle per environment, I can keep what
the environments share in one config and what each adds in another, and build
an environment from both — `tic build --tsconfig tsconfig.json common.bundle.yml prod.bundle.yml >
src/di/prod.bundle.ts` — so that shared settings are written once.

Acceptance criteria:

- `tic build <config>...` merges the configs left to right into one bundle;
  `build({ config: [...] })` does the same.
- Objects merge field by field. The list fields — `include`,
  `exclude`, `match.glob`, `match.exclude`, `match.decorators` —
  concatenate in order, without duplicates; one folder or glob counts as a list
  of one. Any other value set by a later config replaces an earlier one.
- Each config is validated on its own, and an invalid field fails the build
  naming the file it is in. A config may leave any field out; the merged config
  must have them all, and behaves exactly as if it had been written as one config.
- Merged configs must sit in one folder, which their relative paths resolve
  against; configs in different folders fail the build.
- `-` (stdin) cannot be merged with config files; that is a usage error.
- The CLI's warnings and errors name every merged config:
  `common.bundle.yml + prod.bundle.yml: ...`.

### Story: Extend another config

As an application developer, I can name the config a config builds on, so that
an environment is built from one file and what it shares is still written once.

Acceptance criteria:

- `extends` is optional and takes one path, relative to the config file; in
  piped text, to the working directory. Anything but a non-empty string fails
  the build.
- The extended config is merged first and the extending one on top, exactly as
  `tic build <extended> <config>` merges them.
- An extended config may extend another; the furthest is merged first. A cycle
  fails the build naming it.
- A file extended more than once in a build counts once.
- An extended file must exist and sit in the same folder, like any merged config.
- JSON and YAML configs may extend each other.

### Story: Name every input explicitly

As an application developer, I can read a bundle's inputs off its config, so
that what it registers never depends on what my tsconfig happens to compile.

Acceptance criteria:

- A bundle scans its `include` and nothing else; the files its tsconfig
  compiles play no part.
- The generated bundle's header lists the paths it scanned.

### Story: Register the classes of a folder

As an application developer, I can list a folder in a bundle's `include` so that
its classes become registrations of the generated bundle.

Acceptance criteria:

- `include` is one folder or a non-empty list of them; each is scanned
  with its sub-folders. There is no non-recursive form.
- Every exported class that `match` selects is registered.
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

- Selection runs in two stages: a bundle's folders (`include`) and its
  `exclude` globs decide by path
  alone which files are read and parsed; its `match` rule then picks classes out of
  the parsed files.
- `exclude` is a glob or a list of globs of files never read; every other
  source file in `include` is parsed, tests included. `[]` excludes nothing.
- An excluded file is never read.
- Globs are relative to the config file and `/`-separated. Like a folder in
  `include`, an exclude glob may start with a tsconfig `paths` alias instead:
  `@generated/**` reads the folder the alias names, and `@generated` (or
  `@generated/`) drops all of it. An alias with several targets excludes under
  each; a catch-all `"*"` alias is never applied to an exclude glob.
- An invalid rule fails the build naming the offending field.

### Story: Configure which classes a file contributes

As an application developer, I can define how the bundler picks the target
classes out of a file so that a folder mixing services with helpers registers
only what I mean it to.

Acceptance criteria:

- A bundle's `match` rule is an object; a class is selected when it is
  exported, not abstract, and meets every criterion the rule sets.
- `export` is required and restricts which exports count: `"any"`, `"named"` or
  `"default"`.
- `decorators` is required, and requires the class to carry one of the listed
  decorators (`[]` requires none), recognised by name — also when imported under another name or reached as a
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
  registration is last-wins); the warning suggests `match.exclude`.
  Aliased imports are not resolved — the check is syntactic. It does not warn
  when the colliding classes are distinguished by a decorator they share called
  with different arguments (`@perPage('stations')` vs `@perPage('sessions')`):
  those registrations are scope-gated, not last-wins.
- An invalid rule — including a string or a list in place of `match` — fails the
  build naming the offending field.

### Story: Address folders by tsconfig aliases

As an application developer, I can name a path by its `tsconfig.json`
`paths` alias so that the container config speaks the same import paths as the
code.

Acceptance criteria:

- A path is either a folder relative to the config file (`./src/services`) or
  a tsconfig `paths` alias (`@app/services`), resolved through the `paths` of
  the tsconfig given to `tic build --tsconfig <file>`, including `paths` that
  tsconfig inherits through its own `extends`. The tsconfig contributes
  aliases only, never files.
- `--tsconfig` is required and resolves against the working directory: leaving
  it out is a usage error, and a tsconfig that does not exist fails the build.
  None is assumed, not even `./tsconfig.json`.
- A path that is neither an existing folder nor a resolvable alias fails
  the build with a message naming it.
- Generated imports use the most specific matching alias, and only aliases:
  the bundle has no known location, so it works wherever it is saved. A
  selected class no alias covers fails the build naming its file.
- Imports carry `importExtension` as written: `.js` under `moduleResolution`
  `node16` / `nodenext`, `""` for none. It is never inferred from the tsconfig.

### Story: Generate a bundle: a plain container module class

As an application developer, I receive ordinary TypeScript that uses only the
public `ts-ioc-container` API, so that the result type-checks, bundles and
tree-shakes like hand-written code.

Acceptance criteria:

- The bundle exports a class implementing `IContainerModule` whose `applyTo`
  adds one `Registration.fromClass(...)` per class to the container:
  `container.useModule(new AppBundle())`. It exports nothing else.
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
  with `tic build --tsconfig tsconfig.json app.bundle.json | diff - src/di/app.bundle.ts`.

## Notes

Non-goals of this epic: glob patterns as paths, per-path scope or binding
rules, file or class filtering in code (predicates), and registrations other than classes (`fromValue`, `fromFn`).
The container itself is unchanged — discovery lives entirely in the bundler
package (ADR 0022).
