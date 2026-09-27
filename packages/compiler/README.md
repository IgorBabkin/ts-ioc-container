# @ts-ioc-container/compiler

Build-time companion for [`ts-ioc-container`](../ts-ioc-container). The `tic`
CLI scans folders for classes and generates a container module that registers
them — so adding a service means writing the class, not also editing a list of
`addRegistration(...)` calls.

In TypeScript a namespace is an import path, so folders are named the way
imports are: relative to the config file (`./src/services`) or through a
`tsconfig.json` `paths` alias (`@app/services`).

## Install

```bash
pnpm add -D @ts-ioc-container/compiler
```

`typescript` (>= 5) is a peer dependency.

## Configure

`tic.config.json`, next to your `tsconfig.json`:

```json
{
  "$schema": "./node_modules/@ts-ioc-container/compiler/tic.schema.json",
  "modules": [
    {
      "output": "src/di/app.generated.ts",
      "name": "AppModule",
      "namespaces": ["@app/services", { "path": "./src/infra", "recursive": false }]
    }
  ]
}
```

| Field                        | Default                                   | Meaning                                                                                      |
| ---------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `tsconfig`                   | `tsconfig.json` (may be absent)           | Source of `paths` aliases and of the import extension                                        |
| `importExtension`            | `.js` under node16/nodenext, else none    | Extension of generated imports                                                               |
| `modules[].output`           | —                                         | Generated file                                                                               |
| `modules[].name`             | `ContainerModule`                         | Name of the exported `IContainerModule`                                                      |
| `modules[].namespaces`       | —                                         | Folders to scan; `{ path, recursive }` to stop at the folder itself                          |
| `modules[].select`           | every exported class                      | Which classes of a file are registered — see [Selecting classes](#selecting-classes)          |
| `modules[].exclude`          | test files, `__tests__/`, `node_modules/` | Globs (relative to the config) never scanned; replaces the default                           |
| `modules[].include`          | `tic.include.*` next to the config        | File exporting an `InclusionPredicate` — see [Including files](#including-files-with-a-predicate) |

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

| Criterion    | Default | Meaning                                                                                                     |
| ------------ | ------- | ----------------------------------------------------------------------------------------------------------- |
| `export`     | `any`   | `any`, `named` or `default` — which exports count                                                           |
| `decorators` | —       | The class must carry one of these, by name — also renamed imports and `@ioc.register()`; list composed ones |
| `nameGlob`   | —       | Glob on the class name; an anonymous default export is named after its file (`user-service.ts` → `UserService`) |

Abstract and non-exported classes are never registered.

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
applies to every module.

```ts
// tic.include.ts
import type { InclusionPredicate } from '@ts-ioc-container/compiler';

const include: InclusionPredicate = ({ filename }) => !filename.includes('/legacy/');
export default include;
```

| Where the predicate comes from       | Applies to    | Wins over                      |
| ------------------------------------ | ------------- | ------------------------------ |
| `build({ include })` (programmatic)  | every module  | everything                     |
| `modules[].include: "./path/file"`   | that module   | the conventional file          |
| `tic.include.*` next to the config   | every module  | — (used when nothing is named) |

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
import { byTags } from '@ts-ioc-container/compiler';

export default byTags((tags) => !tags.includes('manual')); // Scheduler.manual.ts is never generated
```

`byTags` returns an ordinary `InclusionPredicate`, so it goes anywhere one
does. `fileTags(filename)` is exported too. More examples — folders, name
conventions, environments, environment × region — run as tests in
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
const { byTags } = require('@ts-ioc-container/compiler');
const ENVS = ['development', 'production', 'test'];

module.exports = (env) => byTags((tags) => tags.filter((tag) => ENVS.includes(tag)).every((tag) => tag === env));
```

### A. One generated module per environment (recommended)

Every environment is generated and committed; the app picks one at startup.
The files don't depend on who ran `tic build`, so `tic build --check` stays
stable in CI.

```json
{
  "modules": [
    {
      "output": "src/di/app.production.generated.ts",
      "name": "AppModule",
      "namespaces": ["@app/services"],
      "include": "./tic/production.cjs"
    },
    {
      "output": "src/di/app.development.generated.ts",
      "name": "AppModule",
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

```ts
// src/di/container.ts
import { AppModule as ProductionModule } from './app.production.generated';
import { AppModule as DevelopmentModule } from './app.development.generated';

export const container = new Container().useModule(
  process.env.NODE_ENV === 'production' ? ProductionModule : DevelopmentModule,
);
```

Both modules are imported statically, so a bundle contains both. If
development code must not ship, pick the module with a dynamic `import()`, or
let your bundler replace `process.env.NODE_ENV` so the unused branch is
dropped.

### B. One output, environment chosen when `tic build` runs

For pipelines that generate at deploy time instead of committing the output:

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
tic build --check         # CI: write nothing, exit 1 if a generated module is out of date
```

The output is plain TypeScript over the public `ts-ioc-container` API:

```ts
// Generated by `tic build` from ../../tic.config.json. Do not edit by hand.
import { type IContainer, type IContainerModule, type IRegistration, Registration } from 'ts-ioc-container';
import { MemoryLogger } from '@app/infra/logging/MemoryLogger';
import { Greeter } from '@app/services/Greeter';

export const registrations: IRegistration[] = [
  Registration.fromClass(Greeter),
  Registration.fromClass(MemoryLogger),
];

export const AppModule: IContainerModule = { applyTo(container) { /* addRegistration each */ } };
```

```ts
const container = new Container().useModule(AppModule);
```

Treat `*.generated.ts` as build output: add it to `.prettierignore` (and any
other formatter's ignore list), since `--check` compares files byte for byte.

Each class keeps its own `@register(...)` config (key, scope, singleton, …);
an undecorated class is bound by its class name. Discovery is syntactic — no
type checker runs.
