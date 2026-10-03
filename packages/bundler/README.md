# @ts-ioc-container/bundler

**Bundles your dependencies into a single container module.** `tic build` scans
what your tsconfig compiles and generates one typed bundle that registers every
class in it, ready for
[`ts-ioc-container`](https://www.npmjs.com/package/ts-ioc-container):

```ts
const container = new Container().useModule(new AppBundle());
```

Adding a service means writing the class — no hand-maintained list of
`addRegistration(...)` calls to keep in sync. The bundle is ordinary
TypeScript, generated at build time, so it type-checks, bundles and tree-shakes
like code you wrote yourself.

A bundle config **is** a tsconfig that `extends` yours — `include`, `exclude`
and `compilerOptions` mean what they mean to `tsc` — plus a few fields of the
bundler's own.

## Install

```bash
pnpm add -D @ts-ioc-container/bundler
```

It installs the CLI as `ts-ioc-container`, with **`tic`** as a shortcut —
`ts-ioc-container build` and `tic build` are the same command; the examples
below use the shortcut.

`typescript` (>= 5) is a peer dependency.

## Zero config

With a `tsconfig.json`, there is nothing to configure:

```bash
tic build
```

```text
wrote     src/base.bundle.ts (12 registrations)
```

The bundle registers every exported class decorated with `@register` among the
files your `tsconfig.json` compiles, test files excluded, and lands at the root
of those sources — `rootDir`, else their common folder (`src/`), so `tsc`
compiles it too. It exports `BaseBundle`:

```ts
import { BaseBundle } from './base.bundle';

const container = new Container().useModule(new BaseBundle());
```

`tic build` works on the package it is invoked in: it walks up from the working
directory to the nearest `package.json` — the project root, or in a monorepo
the package — and uses the `tsconfig.json` there. It never falls back to a
workspace root's tsconfig.

## Configure

To change a default, add a config file next to your `tsconfig.json`. One config
file describes one bundle and is named `<name>.bundle.json` — `app.bundle.json`:

```json
{
  "$schema": "./node_modules/@ts-ioc-container/bundler/tic.schema.json",
  "output": "src/di/app.bundle.ts"
}
```

or, in YAML, `<name>.bundle.yaml` / `<name>.bundle.yml` — same fields, same schema:

```yaml
# yaml-language-server: $schema=./node_modules/@ts-ioc-container/bundler/tic.schema.json
extends: ./tsconfig.json
output: src/di/app.bundle.ts
include: [src/**/*.service.ts]
compilerOptions:
  classes:
    decorators: [register, service]
```

An empty YAML file is a bundle with every setting at its default. Describing
one bundle in two formats (`app.bundle.json` and `app.bundle.yaml`) is an error.

Every field is optional; `{}` is the zero-config bundle. The tsconfig fields:

| Field             | Default                           | Meaning                                                                                       |
| ----------------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| `extends`         | `./tsconfig.json` (may be absent) | The tsconfig this config extends; one named here must exist                                   |
| `include`         | the extended tsconfig's           | Which files are scanned — see [Selecting files](#selecting-files)                              |
| `exclude`         | the extended tsconfig's           | Which of them are left out — see [Selecting files](#selecting-files)                           |
| `compilerOptions` | the extended tsconfig's           | tsconfig compiler options (`paths`, `rootDir`, `moduleResolution`, …) plus the bundler's below |

The bundler's own fields, at the top level:

| Field     | Default                        | Meaning                                                                                                                 |
| --------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `baseUrl` | the config file's directory    | The base `include`, `exclude` and `output` resolve against, so they need not repeat a shared prefix such as `src`; also passed to TypeScript as `compilerOptions.baseUrl` |
| `output`  | `<root>/<name>.bundle.ts`      | The bundle file; `<root>` as in [Zero config](#zero-config)                                                             |
| `name`    | the config's stem, else `base` | The bundle's name (`production.bundle.json` → `production`): names the default output and the class, `ProductionBundle` |

and under `compilerOptions`:

| Option            | Default                                | Meaning                                                                                     |
| ----------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `classes`         | exported classes with `@register`      | Which classes of a scanned file are registered — see [Selecting classes](#selecting-classes) |
| `importExtension` | `.js` under node16/nodenext, else none | Extension of generated imports                                                              |

An unknown top-level field is an error, so a misspelled or removed option never
goes unnoticed. Every other compiler option is handed to TypeScript, which
reports an unknown one (`Unknown compiler option 'pathz'. Did you mean 'paths'?`).

`baseUrl` lets a config read in source terms instead of from the package root:

```json
{
  "baseUrl": "src",
  "output": ".generated/container.bundle.ts",
  "exclude": [".generated/**", "db/testing/**"]
}
```

writes `src/.generated/container.bundle.ts` from everything under `src/` except
those two folders — with `baseUrl` set, an omitted `include` scans the whole
`baseUrl` folder. `extends` still resolves against the config file.

Generated imports read like the tsconfig you compile with: a file covered by a
`paths` alias is imported in that alias form, a file under `baseUrl` in
`baseUrl` form (`services/Logger`), and anything else relative to the bundle.

## Several bundles

Need more than one bundle — per environment, per app? Add a config per bundle.
`tic build` builds every `*.bundle.json`, `*.bundle.yaml` and `*.bundle.yml` at
the package root:

```text
production.bundle.json    → src/di/production.bundle.ts
development.bundle.json   → src/di/development.bundle.ts
test.bundle.json          → src/di/test.bundle.ts
```

Each one can extend its own tsconfig and select its own files:

```jsonc
// production.bundle.json
{
  "extends": "./tsconfig.production.json",
  "exclude": ["src/**/*.development.ts"]
}
```

It writes `src/production.bundle.ts`, exporting `ProductionBundle`.

A bundle generated by one config is never registered by another, even when it
sits in a folder the other scans.

## Selecting files

The files a bundle scans are the files its config compiles, as `tsc` would see
them: the extended tsconfig's `files` / `include` / `exclude` (following its own
`extends`), with this config's `include` and `exclude` replacing the parent's —
exactly as in a child tsconfig. Globs are relative to `baseUrl`, defaulting to
the config file's directory.

Test files (`*.spec.ts`, `*.test.ts`, their `.tsx` twins and `__tests__/`) and
`node_modules/` are never scanned, whatever the tsconfig compiles, since test
classes usually carry the same `@register` decorators as production ones. Files
`tic build` generated are never input either.

Parsing is where the time goes, so when your project names files by convention
(`user.service.ts`, `user.repository.ts`), say so in `include` and the bundler
never reads anything else:

```json
{
  "output": "src/di/app.bundle.ts",
  "include": ["src/**/*.service.ts", "src/**/*.repository.ts"],
  "exclude": ["src/legacy/**"]
}
```

## Selecting classes

By default every exported, non-abstract class of a scanned file that carries
`@register` is registered. `compilerOptions.classes` changes that; a class must
meet every criterion that is set:

```json
"compilerOptions": {
  "classes": {
    "export": "named",
    "decorators": ["register", "repository"],
    "name": "*Service"
  }
}
```

| Criterion          | Default | Meaning                                                                                                     |
| ------------------ | ------- | ----------------------------------------------------------------------------------------------------------- |
| `export`           | `any`   | `any`, `named` or `default` — which exports count                                                           |
| `decorators`       | `["register"]` | The class must carry one of these, by name — also renamed imports and `@ioc.register()`; list composed ones. `[]` requires none |
| `name`         | —       | Glob the class name must match, e.g. `"*Service"`; an anonymous default export is named after its file (`user-service.ts` → `UserService`) |
| `excludeClasses`   | —       | Class names to drop, e.g. `["MockDashboardRepository"]`                                                     |
| `excludeName`  | —       | Glob the class name must **not** match, e.g. `"*Mock"`                                                      |

Abstract and non-exported classes are never registered.

### Excluding a single class

When a real implementation and a test-only stand-in are both decorated and both
bind the same token, registration is last-wins and the stand-in silently wins.
`excludeClasses` and `excludeName` drop a class right in the config:

```json
"compilerOptions": {
  "classes": {
    "decorators": ["repository", "service"],
    "excludeClasses": ["MockDashboardRepository"],
    "excludeName": "*Fake"
  }
}
```

Both apply after every other criterion, so they can be combined with
`decorators` and `name` freely.

As a safety net, the build warns when two selected classes pass the same
plain-identifier first argument to a decorator — usually the binding token, as in
`@repository(IDashboardRepositoryToken)`. The check is syntactic (aliased imports
are not resolved), so it can only be a heuristic:

```text
tic: warning: app.bundle.json: decorator token "IDashboardRepositoryToken" is passed by
HttpDashboardRepository, MockDashboardRepository; registration is last-wins,
exclude one with compilerOptions.classes.excludeClasses
```

Classes that are scope-gated are not last-wins, so they do not warn: when the
colliding classes share a decorator called with different arguments, e.g.
`@perPage('stations')` vs `@perPage('sessions')`, each scope registers its own
class and nothing is lost.

## Build

```bash
tic build                 # every *.bundle.{json,yaml,yml} of this package, else its tsconfig.json
tic build -c app.bundle.json -c admin/admin.bundle.json   # only these
tic build --check         # CI: write nothing, exit 1 if a bundle is out of date
```

The output is plain TypeScript over the public `ts-ioc-container` API:

```ts
// src/di/app.bundle.ts
// Generated by `tic build` from ../../app.bundle.json. Do not edit by hand.
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
