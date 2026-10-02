# @ts-ioc-container/bundler

**Bundles your dependencies into a single container module.** `tic build` scans
your folders — by path or tsconfig alias — and generates one typed bundle that
registers every class in them, ready for
[`ts-ioc-container`](https://www.npmjs.com/package/ts-ioc-container):

```ts
const container = new Container().useModule(new AppBundle());
```

Adding a service means writing the class — no hand-maintained list of
`addRegistration(...)` calls to keep in sync. The bundle is ordinary
TypeScript, generated at build time, so it type-checks, bundles and tree-shakes
like code you wrote yourself.

In TypeScript a namespace is an import path, so folders are named the way
imports are: relative to the config file (`./src/services`) or through a
`tsconfig.json` `paths` alias (`@app/services`).

## Install

```bash
pnpm add -D @ts-ioc-container/bundler
```

It installs the CLI as `ts-ioc-container`, with **`tic`** as a shortcut —
`ts-ioc-container build` and `tic build` are the same command; the examples
below use the shortcut.

`typescript` (>= 5) is a peer dependency.

## Configure

`tic.config.json`, next to your `tsconfig.json`:

```json
{
  "$schema": "./node_modules/@ts-ioc-container/bundler/tic.schema.json",
  "bundles": [
    {
      "output": "src/di/app.bundle.ts",
      "name": "AppBundle",
      "namespaces": ["@app/services", { "path": "./src/infra", "recursive": false }]
    }
  ]
}
```

| Field                        | Default                                   | Meaning                                                                                      |
| ---------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `tsconfig`                   | `tsconfig.json` (may be absent)           | Source of `paths` aliases and of the import extension                                        |
| `importExtension`            | `.js` under node16/nodenext, else none    | Extension of generated imports                                                               |
| `bundles[].output`           | —                                         | The bundle file (convention: `*.bundle.ts`)                                                  |
| `bundles[].name`             | `Bundle`                                  | Name of the generated class, an `IContainerModule`                                           |
| `bundles[].namespaces`       | —                                         | Folders to scan; `{ path, recursive }` to stop at the folder itself                          |
| `bundles[].select`           | every exported class                      | Which classes of a file are registered — see [Selecting classes](#selecting-classes)          |
| `bundles[].exclude`          | test files, `__tests__/`, `node_modules/` | Globs (relative to the config) never scanned; replaces the default                           |
| `bundles[].additionalExclude`| —                                         | Globs never scanned, added on top of `exclude` (or the defaults) — see [Excluding files](#excluding-files) |
| `bundles[].filterExports`    | `tic.exports.*` next to the config        | File exporting an `ExportPredicate` — see [Filtering classes](#filtering-classes-after-parsing) |
| `bundles[].include`          | `tic.include.*` next to the config        | File exporting an `InclusionPredicate` — see [Including files](#including-files-with-a-predicate) |

## Excluding files

By default test files, `__tests__/` and `node_modules/` are never scanned. To
add one exclusion without restating those defaults, use `additionalExclude`:

```json
{
  "bundles": [
    {
      "output": "src/di/app.bundle.ts",
      "namespaces": ["@app/services"],
      "additionalExclude": ["frontend/api/generated/**", "**/Mock*.ts"]
    }
  ]
}
```

A non-empty `exclude` replaces the defaults; if it omits a default glob the
build warns, since test classes usually carry the same `@register` decorators as
production ones. `exclude: []` deliberately scans everything, including tests —
combine it with `include` when only some tests should join.

## Selecting classes

By default every exported, non-abstract class of a scanned file is registered.
`select` narrows that; a class must meet every criterion that is set:

```json
"select": {
  "export": "named",
  "decorators": ["register", "repository"],
  "nameGlob": "*Service"
}
```

| Criterion          | Default | Meaning                                                                                                     |
| ------------------ | ------- | ----------------------------------------------------------------------------------------------------------- |
| `export`           | `any`   | `any`, `named` or `default` — which exports count                                                           |
| `decorators`       | —       | The class must carry one of these, by name — also renamed imports and `@ioc.register()`; list composed ones |
| `nameGlob`         | —       | Glob on the class name; an anonymous default export is named after its file (`user-service.ts` → `UserService`) |
| `excludeClasses`   | —       | Class names to drop, e.g. `["MockDashboardRepository"]`                                                     |
| `excludeNameGlob`  | —       | Glob the class name must **not** match, e.g. `"*Mock"`                                                      |
| `excludeAliases`   | —       | tsconfig `paths` aliases to drop, e.g. `["services"]` for a `services/*` or `@services/*` alias             |

Abstract and non-exported classes are never registered.

### Excluding a single class

When a real implementation and a test-only stand-in are both decorated and both
bind the same token, registration is last-wins and the stand-in silently wins. A
`tic.exports.*` predicate works, but forces a hand-maintained name list in code;
`excludeClasses` and `excludeNameGlob` drop a class right in the config:

```json
"select": {
  "decorators": ["repository", "service"],
  "excludeClasses": ["MockDashboardRepository"],
  "excludeNameGlob": "*Fake"
}
```

Both apply after every other criterion, so they can be combined with
`decorators` and `nameGlob` freely. Reach for `filterExports` when the rule
needs more than the class name.

`excludeAliases` drops classes by the tsconfig `paths` alias their file resolves
through — handy for excluding a whole namespace without naming its classes:

```json
"select": {
  "excludeAliases": ["services"]
}
```

An entry matches a `paths` pattern such as `services/*` or `@services/*`; a
leading `@` and a trailing `/*` may be omitted.

As a safety net, the build warns when two selected classes pass the same
plain-identifier first argument to a decorator — usually the binding token, as in
`@repository(IDashboardRepositoryToken)`. The check is syntactic (aliased imports
are not resolved), so it can only be a heuristic:

```text
tic: warning: bundles[0]: decorator token "IDashboardRepositoryToken" is passed by
HttpDashboardRepository, MockDashboardRepository; registration is last-wins,
exclude one with select.excludeClasses
```

Classes that are scope-gated are not last-wins, so they do not warn: when the
colliding classes share a decorator called with different arguments, e.g.
`@perPage('stations')` vs `@perPage('sessions')`, each scope registers its own
class and nothing is lost.

## Including files with a predicate

When globs aren't enough, decide in code which files take part:

```ts
type InclusionPredicate = (context: { filename: string }) => boolean;
```

`filename` is the path relative to the config file, `/`-separated
(`src/services/Logger.ts`). A file takes part only when it matches no `exclude`
glob **and** the predicate returns `true`.

By convention there is nothing to configure: put a `tic.include.ts` (or `.cjs`,
`.js`, `.mjs`, `.cts`, `.mts`) next to `tic.config.json` and its default export
applies to every bundle.

```ts
// tic.include.ts
import type { InclusionPredicate } from '@ts-ioc-container/bundler';

const include: InclusionPredicate = ({ filename }) => !filename.includes('/legacy/');
export default include;
```

| Where the predicate comes from       | Applies to    | Wins over                      |
| ------------------------------------ | ------------- | ------------------------------ |
| `build({ include })` (programmatic)  | every bundle  | everything                     |
| `bundles[].include: "./path/file"`   | that bundle   | the conventional file          |
| `tic.include.*` next to the config   | every bundle  | — (used when nothing is named) |

Predicate files are loaded synchronously with `require`: `.cjs` / `.js`
everywhere, `.mjs` on Node 22.12+, `.ts` on Node versions that strip types
(22.18+, 23.6+). Like any `require`d module a file is loaded **once per
process**, so read environment variables inside the predicate, not at the top
of the file.

### Tags: `TagInclusionPredicate`

A file's **tags** are the dot-separated parts of its name between the base name
and the extension — `StripeGateway.production.ts` → `['production']`,
`Report.production.eu.ts` → `['production', 'eu']`, `Shared.ts` → `[]`. Write
a predicate over them and wrap it with `byTags`:

```ts
type TagInclusionPredicate = (tags: string[], context: { filename: string }) => boolean;
```

```ts
// tic.include.ts
import { byTags } from '@ts-ioc-container/bundler';

export default byTags((tags) => !tags.includes('manual')); // Scheduler.manual.ts is never generated
```

`byTags` returns an ordinary `InclusionPredicate`, so it goes anywhere one
does. `fileTags(filename)` is exported too. More examples — folders, name
conventions, environments, environment × region — run as tests in
[`__tests__/examples/inclusion-predicates.spec.ts`](__tests__/examples/inclusion-predicates.spec.ts).

## Filtering classes after parsing

`include` decides on whole files before they are read. To decide class by
class, right after a file is parsed, use an `ExportPredicate`. It runs on every
exported, non-abstract class that passes `select`:

```ts
type FilterPredicate<Target> = (value: Target) => boolean;
type ExportPredicate = FilterPredicate<ExportContext>;

interface ExportContext {
  filename: string;     // relative to the config: 'src/Mailer.ts'
  exportName: string;   // 'default' for a default export
  className: string;    // an anonymous default export is named after its file
  isDefault: boolean;
  decorators: string[]; // renamed imports resolved: `register as reg` -> 'register'
  tags: string[];       // file-name tags, as byTags reads them
}
```

```ts
// tic.exports.ts, next to tic.config.json: picked up by convention
import type { ExportPredicate } from '@ts-ioc-container/bundler';

const filterExports: ExportPredicate = ({ exportName }) => !/(Stub|Mock|Fake)$/.test(exportName);
export default filterExports;
```

It is found and loaded like an inclusion predicate: `build({ filterExports })`,
else the bundle's `filterExports` file, else a `tic.exports.*` next to the
config. Examples (test doubles sharing a file, decorator combinations, tags
with class names) run as tests in
[`__tests__/examples/inclusion-predicates.spec.ts`](__tests__/examples/inclusion-predicates.spec.ts).

## Recipe: generate per environment

Keep environment-specific implementations side by side, named by convention:
`*.production.ts` joins only production, `*.development.ts` only development,
and every other file is shared.

```text
src/services/
├── Shared.ts                        → every environment
├── StripeGateway.production.ts      → production only
└── FakeGateway.development.ts       → development only
```

One helper turns the convention into a predicate — the environment tags a file
carries must all be the wanted one, and a file without any is shared:

```js
// tic/for-env.cjs
const { byTags } = require('@ts-ioc-container/bundler');
const ENVS = ['development', 'production', 'test'];

module.exports = (env) => byTags((tags) => tags.filter((tag) => ENVS.includes(tag)).every((tag) => tag === env));
```

### A. One bundle per environment (recommended)

Every environment gets its own bundle, and both are committed. The files don't
depend on who ran `tic build`, so `tic build --check` stays stable in CI.

```json
{
  "bundles": [
    {
      "output": "src/di/app.production.bundle.ts",
      "name": "AppBundle",
      "namespaces": ["@app/services"],
      "include": "./tic/production.cjs"
    },
    {
      "output": "src/di/app.development.bundle.ts",
      "name": "AppBundle",
      "namespaces": ["@app/services"],
      "include": "./tic/development.cjs"
    }
  ]
}
```

```js
// tic/production.cjs
module.exports = require('./for-env.cjs')('production');
// tic/development.cjs
module.exports = require('./for-env.cjs')('development');
```

To keep development code out of the production build, the production entry
point must import **only** the production bundle — a bundler includes what is
imported, and a registration keeps its class alive, so nothing can be dropped
after the fact. Give each environment its own entry:

```ts
// src/main.production.ts — production build entry
import { Container } from 'ts-ioc-container';
import { AppBundle } from './di/app.production.bundle';

export const container = new Container().useModule(new AppBundle());
```

```ts
// src/main.development.ts — development entry
import { Container } from 'ts-ioc-container';
import { AppBundle } from './di/app.development.bundle';

export const container = new Container().useModule(new AppBundle());
```

With a single entry, pick the bundle with a dynamic `import()`: the bundler
splits each into its own chunk and only the chosen one is loaded — the other
chunk is still emitted, just never fetched.

```ts
const { AppBundle } =
  process.env.NODE_ENV === 'production'
    ? await import('./di/app.production.bundle')
    : await import('./di/app.development.bundle');
```

| How the app picks the bundle                                     | Development classes in the production build |
| ---------------------------------------------------------------- | ------------------------------------------- |
| One entry per environment, importing its own bundle              | ✅ none                                     |
| Recipe B below — only the production bundle exists at build time | ✅ none                                     |
| Dynamic `import()` of the bundle                                 | ⚠️ emitted as a separate chunk, never loaded |
| Static imports of both bundles plus a runtime condition          | ❌ both bundles, in full                    |

Don't rely on the bundler dropping a statically imported bundle behind
`process.env.NODE_ENV === 'production'`: the classes it imports run decorators
at load time, which bundlers treat as side effects and keep.

### B. One output, environment chosen when `tic build` runs

The smallest production build: only the production bundle ever exists while it
is built. For pipelines that generate at deploy time instead of committing the
output:

```js
// tic.include.cjs — picked up by convention
const forEnv = require('./tic/for-env.cjs');

// Read TIC_ENV per call: the file is loaded once per process.
module.exports = (context) => forEnv(process.env.TIC_ENV ?? 'development')(context);
```

```bash
TIC_ENV=production tic build
```

The output now depends on `TIC_ENV`. Either don't commit it (generate it in
every pipeline), or run `tic build --check` with the same `TIC_ENV` it was
generated with.

## Build

```bash
tic build                 # tic.config.json in the working directory
tic build -c path/to/tic.config.json
tic build --check         # CI: write nothing, exit 1 if a bundle is out of date
```

The output is plain TypeScript over the public `ts-ioc-container` API:

```ts
// src/di/app.bundle.ts
// Generated by `tic build` from ../../tic.config.json. Do not edit by hand.
// Namespaces: @app/services, @app/infra
import { type IContainer, type IContainerModule, type IRegistration, Registration } from 'ts-ioc-container';
import { MemoryLogger } from '@app/infra/logging/MemoryLogger';
import { Greeter } from '@app/services/Greeter';

export const registrations: IRegistration[] = [
  Registration.fromClass(MemoryLogger),
  Registration.fromClass(Greeter),
];

export class AppBundle implements IContainerModule {
  applyTo(container: IContainer): void {
    for (const registration of registrations) container.addRegistration(registration);
  }
}
```

```ts
const container = new Container().useModule(new AppBundle());
```

Treat `*.bundle.ts` as build output: add it to `.prettierignore` (and any
other formatter's ignore list), since `--check` compares files byte for byte.

Each class keeps its own `@register(...)` config (key, scope, singleton, …);
an undecorated class is bound by its class name. Discovery is syntactic — no
type checker runs.
