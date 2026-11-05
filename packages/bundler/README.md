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
tic build --tsconfig <file> [<config>...]
```

`tic build` prints the bundle to **stdout** and writes nothing. `<config>` is a
config file — JSON for `.json`, YAML for `.yaml` / `.yml`. Several are
[merged](#merging-configs) left to right into one bundle. Without one (or with
`-`) the config is read from **stdin**. `--tsconfig` is required: it names the
tsconfig that supplies the `paths` aliases, relative to the working directory. No tsconfig is assumed, and a missing one is an error.
Progress, warnings and errors go to stderr, so they never end up in the bundle:

```text
Bundling AppBundle...
  Clock: src/infra/Clock.ts
  Greeter: src/services/Greeter.ts
Bundled AppBundle: 2 dependencies from 2 files
```

```bash
# a config file in, the bundle saved by the shell
tic build --tsconfig tsconfig.json app.bundle.json > src/di/app.bundle.ts
tic build --tsconfig tsconfig.json prod.bundle.yml > src/di/prod.bundle.ts

# several configs merged into one bundle, like webpack-merge
tic build --tsconfig tsconfig.json common.bundle.yml prod.bundle.yml > src/di/prod.bundle.ts

# the config piped in — it has no file name, so it sets `name` ("name": "dev")
cat dev.bundle.json | tic build --tsconfig tsconfig.json > src/di/dev.bundle.ts
tic build --tsconfig tsconfig.json < dev.bundle.yml > src/di/dev.bundle.ts

# into any command: format it, show it and save it, ...
tic build --tsconfig tsconfig.json app.bundle.json | npx prettier --stdin-filepath app.bundle.ts > src/di/app.bundle.ts
cat dev.bundle.json | tic build --tsconfig tsconfig.json | tee src/di/dev.bundle.ts

# a config built on the fly
jq '.name = "admin"' app.bundle.json | tic build --tsconfig tsconfig.json > src/di/admin.bundle.ts

# CI: is the saved bundle current?
tic build --tsconfig tsconfig.json app.bundle.json | diff - src/di/app.bundle.ts
```

A bundle can be saved anywhere, because every import in it is written through a
tsconfig `paths` alias (`import { Greeter } from '@app/services/Greeter'`) —
never a path relative to where the file ends up. A selected class no alias
covers is an error naming its file; add a `paths` entry for its folder.

Relative paths in a config file resolve against the file; in a piped config,
against the working directory.

## Configure

A config describes one bundle: its name, the folders it scans and the classes it
registers. Nothing is implied: **no field has a default**, so everything the
build does is written in the config. JSON and YAML are both supported. Point
your editor at the schema:

```json
{
  "$schema": "./node_modules/@ts-ioc-container/bundler/tic.schema.json",
  "name": "app",
  "importExtension": "",
  "paths": {
    "include": ["@app/services", "./src/infra"],
    "exclude": ["**/*.spec.ts", "**/__tests__/**"]
  },
  "match": { "export": "any", "decorators": ["register"] }
}
```

```yaml
# yaml-language-server: $schema=./node_modules/@ts-ioc-container/bundler/tic.schema.json
name: app
importExtension: ''
paths:
  include:
    - '@app/services'
    - ./src/infra
  exclude:
    - '**/*.spec.ts'
    - '**/__tests__/**'
match:
  export: any
  decorators:
    - register
```

| Field             | Meaning                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `name`            | The bundle's name: names the class, `AppBundle`. Never taken from the file name                         |
| `importExtension` | Extension of generated imports, written as given: `.js` under node16/nodenext resolution, `""` for none |
| `paths`           | Which files are parsed — see [Selecting files](#selecting-files)                                        |
| `match`           | Which classes of a parsed file are registered — see [Selecting classes](#selecting-classes)             |

All four are required; merged configs need each in one of them. A missing field
is an error naming it. One more field is optional: [`extends`](#extending-a-config)
names a config to build on.

An unknown field is an error, so a misspelled or removed option never goes
unnoticed.

## Several bundles

Need more than one bundle — per environment, per app? Keep what they share in
one config, what each adds in another, and build each environment from both:

```bash
for env in prod dev test; do
  tic build --tsconfig tsconfig.json common.bundle.yml "$env.bundle.yml" > "src/di/$env.bundle.ts"
done
```

```json
{
  "scripts": {
    "bundle": "tic build --tsconfig tsconfig.json common.bundle.yml prod.bundle.yml > src/di/prod.bundle.ts",
    "bundle:check": "tic build --tsconfig tsconfig.json common.bundle.yml prod.bundle.yml | diff - src/di/prod.bundle.ts"
  }
}
```

```yaml
# common.bundle.yml: what every environment registers
importExtension: ''
paths:
  include:
    - '@app/services'
  exclude:
    - '**/*.spec.ts'
    - '**/__tests__/**'
match:
  export: any
  decorators:
    - register
```

Each environment's config names its bundle and adds its own files and classes:

```yaml
# prod.bundle.yml: + the adapters, minus dev-only *.dev.ts files
name: prod
paths:
  include:
    - ./src/infra
  exclude:
    - '**/*.dev.ts'
```

```yaml
# dev.bundle.yml: + the adapters; the *.dev.ts logger replaces the production one, dropped by class name
name: dev
paths:
  include:
    - ./src/infra
match:
  exclude: JsonLogger
```

`tic build --tsconfig tsconfig.json common.bundle.yml prod.bundle.yml` then scans `@app/services` and
`./src/infra`, and exports `ProdBundle`.

### Merging configs

`tic build --tsconfig tsconfig.json a.bundle.yml b.bundle.yml c.bundle.yml` merges the configs left to
right, the way webpack-merge merges webpack configs:

- objects merge field by field;
- list fields — `paths.include`, `paths.exclude`, `match.glob`, `match.exclude`,
  `match.decorators` — concatenate in order, without duplicates (one folder or
  glob counts as a list of one), so a later config can only add to them;
- any other value (`name`, `importExtension`, `match.export`) set by a later
  config replaces an earlier one.

Each config is validated on its own — an error names the file it is in — so a
shared config may leave any field out; the merged config must have them all.
Merged configs must sit in one folder, which their relative paths resolve
against. A piped config (`-`) is never merged.

### Extending a config

A config can name the one it builds on, so an environment needs only its own
file on the command line:

```yaml
# prod.bundle.yml
extends: ./common.bundle.yml
name: prod
paths:
  include:
    - ./src/infra
```

```bash
tic build --tsconfig tsconfig.json prod.bundle.yml > src/di/prod.bundle.ts
```

This is the same merge as `tic build common.bundle.yml prod.bundle.yml`: the
extended config goes first, the one extending it on top. `extends` is a path
relative to the config file (for a piped config, the working directory), and
JSON and YAML configs may extend each other. The extended config
can have an `extends` of its own; a cycle is an error. A config extended more than
once in a build counts once. It must sit in the same folder as the config extending
it, like any merged config.

A saved bundle is never registered by another build, even when it sits in a
folder that build scans.

## Selection in two stages

A bundle picks its registrations in two stages:

1. **`paths`** — decided by path alone, before anything is read. Only files that
   pass are parsed.
2. **`match`** — decided per class, on the files stage 1 let through.

Parsing is where the time goes, so point `paths` at the folders that hold your
registrations, and `exclude` what they should not contribute:

```json
{
  "paths": {
    "include": "@app/services",
    "exclude": ["**/*.spec.ts", "**/*.test.ts", "**/__tests__/**", "**/legacy/**"]
  },
  "match": { "export": "any", "decorators": ["register"] }
}
```

## Selecting files

`paths` is `{ include, exclude }`. `paths.include` names the folders a bundle's files come from,
and the only ones: what your tsconfig compiles plays no part. It is one folder
or a list, each relative to the config file (`./src/services`) or a tsconfig
`paths` alias (`@app/services`, for a `"@app/*": ["./src/*"]` alias), and
always scanned with its sub-folders. `paths` is always an object — a folder or a
list in place of it is an error — and both fields are required:

```yaml
paths:
  include: ./src/services # one folder
  exclude: [] # nothing excluded
```

```yaml
paths:
  include: # or a list
    - '@app/services'
    - ./src/infra
  exclude: '**/*.dev.ts' # one glob, or a list
```

Within them, a file is parsed unless it matches **one of** `exclude`. Globs are relative to the config file and `/`-separated; `**`
spans folders. Like a folder in `paths.include`, an exclude glob may start with a
tsconfig `paths` alias: with `"@generated/*": ["./src/.generated/*"]`,
`@generated/**` reads `src/.generated/**`, and `@generated` (or `@generated/`)
drops the whole folder. A catch-all `"*"` alias is never applied, so plain globs
such as `**/*.spec.ts` keep their meaning.

| Rule      | Meaning                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------ |
| `include` | Folder, or folders, to scan                                                                            |
| `exclude` | A glob, or a list of them, of files never read; may start with a tsconfig alias. `[]` excludes nothing |

Only what `exclude` lists is left out, so list your test files: test classes
usually carry the same `@register` decorators as production ones.

```json
"paths": {
  "exclude": [
    "**/*.spec.ts",
    "**/*.test.ts",
    "**/*.spec.tsx",
    "**/*.test.tsx",
    "**/__tests__/**",
    "frontend/api/generated/**",
    "@generated"
  ]
}
```

`node_modules` folders are never scanned, whatever `exclude` says.

## Selecting classes

`match` is an object picking the classes of a parsed file; a class must be
exported, not abstract, and meet every criterion that is set:

```json
"match": {
  "export": "named",
  "decorators": ["register", "repository"],
  "glob": "*Service"
}
```

| Criterion    | Required | Meaning                                                                                                                                                                                           |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `export`     | yes      | `any`, `named` or `default` — which exports count                                                                                                                                                 |
| `decorators` | yes      | The class must carry one of these, by name — also renamed imports and `@ioc.register()`; list composed ones. `[]` requires none                                                                   |
| `glob`       | no       | A glob, or a list of them, the class name must match one of: `"*Service"`, `["*Service", "*Repository"]`; an anonymous default export is named after its file (`user-service.ts` → `UserService`) |
| `exclude`    | no       | A glob, or a list of them, the class name must match **none** of: `"*Mock"`, `["MockDashboardRepository", "*Fake"]`                                                                               |

Abstract and non-exported classes are never registered.

### Excluding a single class

When a real implementation and a test-only stand-in are both decorated and both
bind the same token, registration is last-wins and the stand-in silently wins.
`exclude` drops it right in the config. A plain class name is a glob that
matches only itself, so one list drops a class by name and a family by pattern:

```json
"match": {
  "export": "any",
  "decorators": ["repository", "service"],
  "exclude": ["MockDashboardRepository", "*Fake"]
}
```

`exclude` applies after every other criterion, so it combines with
`decorators` and `glob` freely.

### Two classes, one token

As a safety net, the build warns when two selected classes pass the same
plain-identifier first argument to a decorator — usually the binding token, as in
`@repository(IDashboardRepositoryToken)`. The check is syntactic (aliased imports
are not resolved), so it can only be a heuristic:

```text
tic: warning: app.bundle.json: decorator token "IDashboardRepositoryToken" is passed by
HttpDashboardRepository, MockDashboardRepository; registration is last-wins,
exclude one with match.exclude
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
import { type IContainer, type IContainerModule, Registration } from 'ts-ioc-container';
import { MemoryLogger } from '@app/infra/logging/MemoryLogger';
import { Greeter } from '@app/services/Greeter';

export class AppBundle implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(Registration.fromClass(MemoryLogger));
    container.addRegistration(Registration.fromClass(Greeter));
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
import { readFileSync, writeFileSync } from 'node:fs';
import { build } from '@ts-ioc-container/bundler';

const { content, warnings } = build({ config: 'app.bundle.json', tsconfig: 'tsconfig.json' });
writeFileSync('src/di/app.bundle.ts', content);

// or config text, as `tic build` reads from stdin
build({ text: readFileSync('app.bundle.yml', 'utf8'), tsconfig: 'tsconfig.json' });
```
