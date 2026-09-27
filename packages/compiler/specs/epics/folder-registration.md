# Epic: Folder registration

- **Status:** Proposed
- **ADR:** [ADR 0022 - Registration discovery happens at build time, outside the container](../../../../adr/0022-build-time-registration-discovery.md)
- **Public API:** `tic build`, `tic.config.json`, `build`, `loadConfig`
- **Executable spec:** `__tests__/specs/folder-registration.spec.ts`, `__tests__/specs/generated-module.spec.ts`, `__tests__/specs/cli.spec.ts`

## Intent

As an application developer, I want to register every class of a folder at once
so that adding a service means writing the class, not also editing a
hand-maintained list of `addRegistration(...)` calls.

In TypeScript a namespace is an import path, so a folder is addressed the same
way an import is: a path relative to the config file (`./src/services`) or a
`tsconfig.json` `paths` alias (`@app/services`).

## Stories

### Story: Describe the container in a config file

As an application developer, I can describe generated container modules in one
JSON file so that the build is reproducible and reviewable.

Acceptance criteria:

- `tic build` reads `tic.config.json` from the working directory, or the file
  given with `--config <path>`.
- Every relative path in the config resolves against the config file's
  directory, not the working directory.
- The config lists `modules`; each module has an `output` file and at least one
  namespace, and may name the exported module (`name`, default
  `ContainerModule`).
- An invalid config fails the build with a message naming the offending field;
  nothing is written.

### Story: Register the classes of a folder

As an application developer, I can list a folder as a namespace so that its
classes become registrations of the generated module.

Acceptance criteria:

- A namespace is scanned recursively by default; `recursive: false` limits it to
  the folder itself.
- By default every exported class is registered.
- Abstract classes, non-exported classes, `.d.ts` files and files matching
  `exclude` (default: test files, `__tests__/`, `node_modules/`) are never
  registered. `exclude` globs are relative to the config file.
- A class exported by `export { X }`, `export { X as Y }` or `export default` is
  registered and imported under its exported name.
- The generated file is never scanned, even when it lives inside a namespace.
- Registrations are ordered by file path, then by declaration order, so the
  output is stable across machines.

### Story: Configure which classes a file contributes

As an application developer, I can define how the compiler picks the target
classes out of a file so that a folder mixing services with helpers registers
only what I mean it to.

Acceptance criteria:

- A module's `select` rule is an object; a class is selected when it is
  exported, not abstract, and meets every criterion the rule sets. Omitting
  `select` (or a criterion) applies no restriction beyond being exported.
- `export` restricts which exports count: `"any"` (default), `"named"` or
  `"default"`.
- `decorators` requires the class to carry one of the listed decorators,
  recognised by name — also when imported under another name or reached as a
  member (`@ioc.register(...)`). Composed decorators are listed like any other.
- `name` is a glob (`*Service`) the class name must match; for an anonymous
  default export the name is derived from the file name.
- An invalid rule — including the removed string form (`"select": "decorated"`)
  — fails the build naming the offending field.

### Story: Address folders by tsconfig aliases

As an application developer, I can name a namespace by its `tsconfig.json`
`paths` alias so that the container config speaks the same import paths as the
code.

Acceptance criteria:

- A namespace such as `@app/services` resolves through the `paths` of the
  config's `tsconfig` (default `tsconfig.json` next to the config file),
  including `paths` inherited through `extends`.
- A namespace that is neither an existing folder nor a resolvable alias fails
  the build with a message naming the namespace.
- Generated imports use the most specific matching alias; a file no alias
  covers is imported by a path relative to the output file.
- Under `moduleResolution` `node16` / `nodenext` imports carry a `.js`
  extension; `importExtension` in the config overrides the inferred one.

### Story: Generate a plain container module

As an application developer, I receive ordinary TypeScript that uses only the
public `ts-ioc-container` API, so that the result type-checks, bundles and
tree-shakes like hand-written code.

Acceptance criteria:

- The output exports `registrations` (`Registration.fromClass(...)` per class)
  and a module (`IContainerModule`) that adds them to a container.
- Two classes with the same name are both imported, the later one under a
  suffixed local name; the binding key still comes from the class itself.
- Applying the generated module with `container.useModule(...)` makes every
  discovered class resolvable, with its `@register(...)` config honoured.

### Story: Keep generated modules in sync in CI

As a maintainer, I can verify that generated modules are current without
rewriting them so that CI catches a forgotten `tic build`.

Acceptance criteria:

- `tic build --check` writes nothing and exits non-zero when any output is
  missing or differs from what would be generated.
- `tic build` leaves an output that is already current untouched.

## Notes

Non-goals of this epic: glob patterns as namespaces, per-namespace scope or
binding rules, and registrations other than classes (`fromValue`, `fromFn`).
The container itself is unchanged — discovery lives entirely in the compiler
package (ADR 0022).
