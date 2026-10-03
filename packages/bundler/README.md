# @ts-ioc-container/bundler

**Bundles your dependencies into a single container module.** `tic build` scans
the folders you name — by path or tsconfig alias — and generates one typed
bundle that registers every class in them, ready for
[`ts-ioc-container`](https://www.npmjs.com/package/ts-ioc-container):

```ts
const container = new Container().useModule(new AppBundle());
```

Adding a service means writing the class — no hand-maintained list of
`addRegistration(...)` calls to keep in sync. The bundle is ordinary
TypeScript, generated at build time, so it type-checks, bundles and tree-shakes
like code you wrote yourself.

Everything is explicit, and `tic build` is a plain Unix filter: a config goes in
— a file, or text on stdin — and the bundle comes out on stdout. Where it is saved
is up to your shell, and nothing is inferred from what your tsconfig compiles.

## Install

```bash
pnpm add -D @ts-ioc-container/bundler
```

It installs the CLI as `ts-ioc-container`, with **`tic`** as a shortcut —
`ts-ioc-container build` and `tic build` are the same command; the examples
below use the shortcut.

`typescript` (>= 5) is a peer dependency.

## Build

```bash
tic build [<config>]
```

`tic build` prints the bundle to **stdout** and writes nothing. `<config>` is a
config file — JSON for `.json`, YAML for `.yaml` / `.yml`. Without it (or with
`-`) the config is read from **stdin**. Warnings and errors go to stderr, so
they never end up in the bundle.

```bash
# a config file in, the bundle saved by the shell
tic build app.bundle.json > src/di/app.bundle.ts
tic build prod.bundle.yml > src/di/prod.bundle.ts

# the config piped in — it has no file name, so it sets `name` ("name": "dev")
cat dev.bundle.json | tic build > src/di/dev.bundle.ts
tic build < dev.bundle.yml > src/di/dev.bundle.ts

# into any command: format it, show it and save it, ...
tic build app.bundle.json | npx prettier --stdin-filepath app.bundle.ts > src/di/app.bundle.ts
cat dev.bundle.json | tic build | tee src/di/dev.bundle.ts

# a config built on the fly
printf 'name: app\nglob: "@app/services"\n' | tic build > src/di/app.bundle.ts
jq '.name = "admin"' app.bundle.json | tic build > src/di/admin.bundle.ts

# CI: is the saved bundle current?
tic build app.bundle.json | diff - src/di/app.bundle.ts
```

A bundle can be saved anywhere, because every import in it is written through a
tsconfig `paths` alias (`import { Greeter } from '@app/services/Greeter'`) —
never a path relative to where the file ends up. A selected class no alias
covers is an error naming its file; add a `paths` entry for its folder.

Relative paths in a config file resolve against the file; in a piped config,
against the working directory. The bundle is named after the config file —
`prod.bundle.json` exports `ProdBundle` — unless the config sets `name`, which a
piped config, or a file not named `<name>.bundle.json`, must.

## Configure

A config describes one bundle: the folders it scans and the classes it
registers. Point your editor at the schema:

```json
{
  "$schema": "./node_modules/@ts-ioc-container/bundler/tic.schema.json",
  "glob": ["@app/services", "./src/infra"]
}
```

```yaml
# yaml-language-server: $schema=./node_modules/@ts-ioc-container/bundler/tic.schema.json
glob: ['@app/services', ./src/infra]
```

| Field             | Default                                       | Meaning                                                                                                     |
| ----------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `glob`            | — (required)                                  | Which files are parsed — see [Selecting files](#selecting-files)                                            |
| `className`       | exported classes with `@register`             | Which classes of a parsed file are registered — see [Selecting classes](#selecting-classes)                 |
| `name`            | the config file's (`app.bundle.json` → `app`) | The bundle's name: names the class, `AppBundle`. Required for a piped config or a file named otherwise      |
| `tsconfig`        | `./tsconfig.json`                             | Source of the `paths` aliases every import is written through, and of the import extension — never of files |
| `importExtension` | `.js` under node16/nodenext, else none        | Extension of generated imports                                                                              |

An unknown field is an error, so a misspelled or removed option never goes
unnoticed.

## Several bundles

Need more than one bundle — per environment, per app? Keep a config per bundle
and build each one:

```bash
for env in prod dev test; do
  tic build "$env.bundle.yml" > "src/di/$env.bundle.ts"
done
```

```json
{
  "scripts": {
    "bundle": "tic build app.bundle.json > src/di/app.bundle.ts",
    "bundle:check": "tic build app.bundle.json | diff - src/di/app.bundle.ts"
  }
}
```

Each config selects its own files and classes:

```yaml
# prod.bundle.yml: services + adapters, minus dev-only *.dev.ts files
glob:
  glob: ['@app/services', ./src/infra]
  exclude:
    - '**/*.dev.ts'
    - '**/*.spec.ts'
    - '**/*.test.ts'
    - '**/*.spec.tsx'
    - '**/*.test.tsx'
    - '**/__tests__/**'
    - '**/node_modules/**'
```

```yaml
# dev.bundle.yml: the *.dev.ts logger replaces the production one, dropped by class name
glob: ['@app/services', ./src/infra]
className:
  exclude: JsonLogger
```

A saved bundle is never registered by another build, even when it sits in a
folder that build scans.

## Selection in two stages

A bundle picks its registrations in two stages:

1. **`glob`** — decided by path alone, before anything is read. Only files that
   pass are parsed.
2. **`className`** — decided per class, on the files stage 1 let through.

Parsing is where the time goes, so point `glob` at the folders that hold your
registrations, and `exclude` what they should not contribute:

```json
{
  "glob": {
    "glob": "@app/services",
    "exclude": ["**/*.spec.ts", "**/*.test.ts", "**/__tests__/**", "**/node_modules/**", "**/legacy/**"]
  },
  "className": { "decorators": ["register"] }
}
```

## Selecting files

`glob` takes the same shape as [`className`](#selecting-classes):
`{ glob, exclude }`. `glob.glob` names the folders a bundle's files come from,
and the only ones: what your tsconfig compiles plays no part. It is one folder
or a list, each relative to the config file (`./src/services`) or a tsconfig
`paths` alias (`@app/services`, for a `"@app/*": ["./src/*"]` alias), and
always scanned with its sub-folders.

When the default `exclude` is all you need, `glob` itself can be the folders —
a string or a list is a shortcut for `glob.glob`:

```yaml
glob: ./src/services # = glob: { glob: ./src/services }
```

```yaml
glob: ['@app/services', ./src/infra] # = glob: { glob: ['@app/services', ./src/infra] }
```

```yaml
glob: # the object form, for a custom exclude
  glob: ['@app/services', ./src/infra]
  exclude: '**/*.dev.ts'
```

Within them, a file is parsed unless it matches **one of** `exclude`. Globs are relative to the config file and `/`-separated; `**`
spans folders.

| Rule      | Default                                   | Meaning                                                                         |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| `glob`    | — (required)                              | Folder, or folders, to scan                                                     |
| `exclude` | test files, `__tests__/`, `node_modules/` | A glob, or a list of them, of files never read; replaces the default when given |

A non-empty `exclude` replaces the defaults, so restate the ones you still want:

```json
"glob": {
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
parses everything, including tests.

## Selecting classes

By default every exported, non-abstract class of a parsed file that carries
`@register` is registered. `className` changes that; a class must meet every
criterion that is set:

```json
"className": {
  "export": "named",
  "decorators": ["register", "repository"],
  "glob": "*Service"
}
```

| Criterion    | Default        | Meaning                                                                                                                                                                                           |
| ------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `export`     | `any`          | `any`, `named` or `default` — which exports count                                                                                                                                                 |
| `decorators` | `["register"]` | The class must carry one of these, by name — also renamed imports and `@ioc.register()`; list composed ones. `[]` requires none                                                                   |
| `glob`       | —              | A glob, or a list of them, the class name must match one of: `"*Service"`, `["*Service", "*Repository"]`; an anonymous default export is named after its file (`user-service.ts` → `UserService`) |
| `exclude`    | —              | A glob, or a list of them, the class name must match **none** of: `"*Mock"`, `["MockDashboardRepository", "*Fake"]`                                                                               |

Abstract and non-exported classes are never registered.

### Excluding a single class

When a real implementation and a test-only stand-in are both decorated and both
bind the same token, registration is last-wins and the stand-in silently wins.
`exclude` drops it right in the config. A plain class name is a glob that
matches only itself, so one list drops a class by name and a family by pattern:

```json
"className": {
  "decorators": ["repository", "service"],
  "exclude": ["MockDashboardRepository", "*Fake"]
}
```

`exclude` applies after every other criterion, so it combines with
`decorators` and `glob` freely.

### The `className` shortcut

When the default `export` and `decorators` are all you need, `className`
itself can be the class-name globs — a string or a list is a shortcut for
`className.glob`, just as on `glob`:

```yaml
className: '*Service' # = className: { glob: '*Service' }
```

```yaml
className: ['*Service', '*Repository'] # = className: { glob: ['*Service', '*Repository'] }
```

As a safety net, the build warns when two selected classes pass the same
plain-identifier first argument to a decorator — usually the binding token, as in
`@repository(IDashboardRepositoryToken)`. The check is syntactic (aliased imports
are not resolved), so it can only be a heuristic:

```text
tic: warning: app.bundle.json: decorator token "IDashboardRepositoryToken" is passed by
HttpDashboardRepository, MockDashboardRepository; registration is last-wins,
exclude one with className.exclude
```

Classes that are scope-gated are not last-wins, so they do not warn: when the
colliding classes share a decorator called with different arguments, e.g.
`@perPage('stations')` vs `@perPage('sessions')`, each scope registers its own
class and nothing is lost.

## Output

The output is plain TypeScript over the public `ts-ioc-container` API:

```ts
// src/di/app.bundle.ts
// Generated by `tic build`. Do not edit by hand.
// Paths: @app/services, @app/infra
import { type IContainer, type IContainerModule, type IRegistration, Registration } from 'ts-ioc-container';
import { MemoryLogger } from '@app/infra/logging/MemoryLogger';
import { Greeter } from '@app/services/Greeter';

export const registrations: IRegistration[] = [Registration.fromClass(MemoryLogger), Registration.fromClass(Greeter)];

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
other formatter's ignore list) unless you format it in the pipe, so a
`tic build … | diff - …` check compares like with like.

Each class keeps its own `@register(...)` config (key, scope, singleton, …);
an undecorated class is bound by its class name. Discovery is syntactic — no
type checker runs.

## Programmatic API

`build()` returns the bundle and writes nothing, like the CLI:

```ts
import { writeFileSync } from 'node:fs';
import { build } from '@ts-ioc-container/bundler';

const { content, warnings } = build({ config: 'app.bundle.json' });
writeFileSync('src/di/app.bundle.ts', content);

// or config text, as `tic build` reads from stdin
build({ text: 'name: app\nglob:\n  glob: ["@app/services"]\n' });
```
