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

Folders are named the way imports are: relative to the config file (`./src/services`) or through a
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

`.bundles.json`, next to your `tsconfig.json`:

```json
{
  "$schema": "./node_modules/@ts-ioc-container/bundler/tic.schema.json",
  "bundles": [
    {
      "output": "src/di/app.bundle.ts",
      "name": "AppBundle",
      "paths": ["@app/services", { "path": "./src/infra", "recursive": false }]
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
| `bundles[].tags`             | `[]`                                      | Tags associated with the bundle                                                              |
| `bundles[].paths`            | —                                         | Folders to scan; `{ path, recursive }` to stop at the folder itself                          |
| `bundles[].files`            | every source file but tests               | Which files are parsed, by path — see [Selecting files](#selecting-files)                    |
| `bundles[].classes`          | every exported class                      | Which classes of a parsed file are registered — see [Selecting classes](#selecting-classes)  |

An unknown field is an error, so a misspelled or removed option never goes
unnoticed.

## Selection in two stages

A bundle picks its registrations in two stages:

1. **`files`** — decided by path alone, before anything is read. Only files that
   pass are parsed.
2. **`classes`** — decided per class, on the files stage 1 let through.

Parsing is where the time goes, so when your project names files by convention
(`user.service.ts`, `user.repository.ts`), say so in `files.include` and the
bundler never reads anything else:

```json
{
  "output": "src/di/app.bundle.ts",
  "paths": ["@app/services"],
  "files": { "include": ["**/*.service.ts", "**/*.repository.ts"] },
  "classes": { "decorators": ["register"] }
}
```

## Selecting files

Globs are relative to the config file and `/`-separated; `**` spans folders.
A file is parsed when it matches **one of** `include` and **none of** `exclude`.

| Rule      | Default                                   | Meaning                                                    |
| --------- | ----------------------------------------- | ---------------------------------------------------------- |
| `include` | every source file                         | Globs a file must match one of, e.g. `"**/*.service.ts"`   |
| `exclude` | test files, `__tests__/`, `node_modules/` | Globs of files never read; replaces the default when given |

A non-empty `exclude` replaces the defaults, so restate the ones you still want:

```json
"files": {
  "exclude": [
    "**/*.spec.ts",
    "**/*.test.ts",
    "**/*.spec.tsx",
    "**/*.test.tsx",
    "**/__tests__/**",
    "**/node_modules/**",
    "frontend/api/generated/**"
  ]
}
```

If it omits a default glob the build warns, since test classes usually carry
the same `@register` decorators as production ones. `"exclude": []` deliberately
parses everything, including tests. Giving only `include` keeps the default
`exclude`, so `**/*.service.ts` still skips `user.service.spec.ts`.

## Selecting classes

By default every exported, non-abstract class of a parsed file is registered.
`classes` narrows that; a class must meet every criterion that is set:

```json
"classes": {
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

Abstract and non-exported classes are never registered.

### Excluding a single class

When a real implementation and a test-only stand-in are both decorated and both
bind the same token, registration is last-wins and the stand-in silently wins.
`excludeClasses` and `excludeNameGlob` drop a class right in the config:

```json
"classes": {
  "decorators": ["repository", "service"],
  "excludeClasses": ["MockDashboardRepository"],
  "excludeNameGlob": "*Fake"
}
```

Both apply after every other criterion, so they can be combined with
`decorators` and `nameGlob` freely.

As a safety net, the build warns when two selected classes pass the same
plain-identifier first argument to a decorator — usually the binding token, as in
`@repository(IDashboardRepositoryToken)`. The check is syntactic (aliased imports
are not resolved), so it can only be a heuristic:

```text
tic: warning: bundles[0]: decorator token "IDashboardRepositoryToken" is passed by
HttpDashboardRepository, MockDashboardRepository; registration is last-wins,
exclude one with classes.excludeClasses
```

Classes that are scope-gated are not last-wins, so they do not warn: when the
colliding classes share a decorator called with different arguments, e.g.
`@perPage('stations')` vs `@perPage('sessions')`, each scope registers its own
class and nothing is lost.

## Build

```bash
tic build                 # .bundles.json in the working directory
tic build -c path/to/.bundles.json
tic build --check         # CI: write nothing, exit 1 if a bundle is out of date
```

The output is plain TypeScript over the public `ts-ioc-container` API:

```ts
// src/di/app.bundle.ts
// Generated by `tic build` from ../../.bundles.json. Do not edit by hand.
// Paths: @app/services, @app/infra
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
