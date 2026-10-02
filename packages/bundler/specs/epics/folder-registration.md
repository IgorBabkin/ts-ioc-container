# Epic: Folder registration

- **Status:** Proposed
- **ADR:** [ADR 0022 - Registration discovery happens at build time, outside the container](../../../../adr/0022-build-time-registration-discovery.md)
- **Public API:** `tic build`, `tic.config.json`, `build`, `loadConfig`, `InclusionPredicate`, `TagInclusionPredicate`, `byTags`, `fileTags`, `ExportPredicate`, `ExportContext`
- **Executable spec:** `__tests__/specs/folder-registration.spec.ts`, `__tests__/specs/bundle.spec.ts`, `__tests__/specs/cli.spec.ts`

## Intent

As an application developer, I want to register every class of a folder at once
so that adding a service means writing the class, not also editing a
hand-maintained list of `addRegistration(...)` calls.

In TypeScript a namespace is an import path, so a folder is addressed the same
way an import is: a path relative to the config file (`./src/services`) or a
`tsconfig.json` `paths` alias (`@app/services`).

## Stories

### Story: Describe the container in a config file

As an application developer, I can describe generated bundles in one
JSON file so that the build is reproducible and reviewable.

Acceptance criteria:

- The CLI installs as `ts-ioc-container`, with `tic` as a shortcut: both
  `bin` entries run the same program.
- `tic build` reads `tic.config.json` from the working directory, or the file
  given with `--config <path>`.
- Every relative path in the config resolves against the config file's
  directory, not the working directory.
- The config lists `bundles`; each bundle has an `output` file (by convention
  `*.bundle.ts`) and at least one namespace, and may name the generated class
  (`name`, default `Bundle`).
- An invalid config fails the build with a message naming the offending field;
  nothing is written.

### Story: Register the classes of a folder

As an application developer, I can list a folder as a namespace so that its
classes become registrations of the generated bundle.

Acceptance criteria:

- A namespace is scanned recursively by default; `recursive: false` limits it to
  the folder itself.
- By default every exported class is registered.
- Abstract classes, non-exported classes, `.d.ts` files and files matching
  `exclude` (default: test files, `__tests__/`, `node_modules/`) are never
  registered. `exclude` globs are relative to the config file.
- A non-empty `exclude` replaces the defaults; `additionalExclude` adds globs on
  top of `exclude` (or the defaults when `exclude` is omitted), so one extra
  exclusion does not mean restating the test-file defaults. An explicit
  `exclude: []` still scans tests deliberately. When a non-empty `exclude` omits
  a default glob, the build reports a warning (the escape hatch stays: `[]`
  warns for nothing).
- A class exported by `export { X }`, `export { X as Y }` or `export default` is
  registered and imported under its exported name.
- The generated file is never scanned, even when it lives inside a namespace.
- Registrations are ordered by file path, then by declaration order, so the
  output is stable across machines.

### Story: Decide which files take part with a predicate

As an application developer, I can exclude files from code generation with a
function of my own — by convention, without configuring anything — so that
rules globs cannot express (naming schemes, folder conventions, allow-lists)
live in code.

Acceptance criteria:

- An `InclusionPredicate` is `(context: { filename: string }) => boolean`;
  `filename` is the file's path relative to the config file, `/`-separated
  (`src/services/Logger.ts`). A file takes part only when it matches no
  `exclude` glob **and** the predicate returns `true`.
- Implicit, by convention: a `tic.include.{cjs,js,mjs,ts,cts,mts}` file next to
  the config applies to every bundle; its default export (or `module.exports`)
  is the predicate. Without one, no predicate applies.
- Declarative: a bundle's `include` names a predicate file explicitly (relative
  to the config file) and overrides the conventional one.
- Programmatic: `build({ include })` takes the predicate itself and overrides
  both.
- The predicate is loaded synchronously (`require`), so `build` stays
  synchronous. Like any `require`d module it is loaded once per process; a
  predicate that depends on the environment reads it when called.
- The README's "generate per environment" recipe is executable: both of its
  variants run as tests.
- A predicate file that is missing or does not export a function fails the
  build with a message naming the file.

### Story: Decide by filename tags

As an application developer, I can write a predicate over a file's tags instead
of parsing its name myself, so that conventions such as
`StripeGateway.production.ts` read as what they mean.

Acceptance criteria:

- A file's tags are the dot-separated parts of its name between the base name
  and the extension: `Shared.ts` → `[]`, `StripeGateway.production.ts` →
  `['production']`, `Report.production.eu.ts` → `['production', 'eu']`.
- A `TagInclusionPredicate` is `(tags: string[], context: { filename }) =>
  boolean`; `byTags(predicate)` wraps it into an `InclusionPredicate`, so it is
  used anywhere one is — `build({ include })`, a bundle's `include` file, or the
  conventional `tic.include.*`.
- `fileTags(filename)` is exported for predicates that need the tags elsewhere.
- Usage examples run as tests (`__tests__/examples/`).

### Story: Filter classes right after parsing

As an application developer, I can decide class by class, in code, which parsed
exports become registrations, so that rules the declarative `select` cannot
express — naming schemes, decorator combinations, per-class environments — live
in code.

Acceptance criteria:

- An `ExportPredicate` is `(context: ExportContext) => boolean`, called for
  every exported, non-abstract class that passes `select`. A class becomes a
  registration only when it returns `true`.
- `ExportContext` carries `filename` (relative to the config, `/`-separated),
  `exportName` (`'default'` for a default export), `className` (an anonymous
  default export is named after its file), `isDefault`, `decorators` (names,
  renamed imports resolved) and `tags` (the file-name tags `byTags` reads).
- It is found like an `InclusionPredicate`: `build({ filterExports })`, else a
  bundle's `filterExports` file, else a conventional
  `tic.exports.{cjs,js,mjs,ts,cts,mts}` next to the config; loaded
  synchronously, once per process. A missing file or a non-function export
  fails the build naming the file.

### Story: Configure which classes a file contributes

As an application developer, I can define how the bundler picks the target
classes out of a file so that a folder mixing services with helpers registers
only what I mean it to.

Acceptance criteria:

- A bundle's `select` rule is an object; a class is selected when it is
  exported, not abstract, and meets every criterion the rule sets. Omitting
  `select` (or a criterion) applies no restriction beyond being exported.
- `export` restricts which exports count: `"any"` (default), `"named"` or
  `"default"`.
- `decorators` requires the class to carry one of the listed decorators,
  recognised by name — also when imported under another name or reached as a
  member (`@ioc.register(...)`). Composed decorators are listed like any other.
- `nameGlob` is a glob (`*Service`) the class name must match; for an anonymous
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

Non-goals of this epic: glob patterns as namespaces, per-namespace scope or
binding rules, and registrations other than classes (`fromValue`, `fromFn`).
The container itself is unchanged — discovery lives entirely in the bundler
package (ADR 0022).
