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
tic build [<config>...]
```

`tic build` prints the bundle to **stdout** and writes nothing. `<config>` is a
config file — JSON for `.json`, YAML for `.yaml` / `.yml`. Several are
[merged](#merging-configs) left to right into one bundle. Without one (or with
`-`) the config is read from **stdin**. Progress, warnings and errors go to
stderr, so they never end up in the bundle:

```text
Bundling AppBundle...
  Clock: src/infra/Clock.ts
  Greeter: src/services/Greeter.ts
Bundled AppBundle: 2 dependencies from 2 files
```

```bash
# a config file in, the bundle saved by the shell
tic build app.bundle.json > src/di/app.bundle.ts
tic build prod.bundle.yml > src/di/prod.bundle.ts

# several configs merged into one bundle, like webpack-merge
tic build common.bundle.yml prod.bundle.yml > src/di/prod.bundle.ts

# the config piped in — it has no file name, so it sets `name` ("name": "dev")
cat dev.bundle.json | tic build > src/di/dev.bundle.ts
tic build < dev.bundle.yml > src/di/dev.bundle.ts

# into any command: format it, show it and save it, ...
tic build app.bundle.json | npx prettier --stdin-filepath app.bundle.ts > src/di/app.bundle.ts
cat dev.bundle.json | tic build | tee src/di/dev.bundle.ts

# a config built on the fly
printf 'name: app\npaths:\n  include: "@app/services"\n' | tic build > src/di/app.bundle.ts
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
`prod.bundle.json` exports `ProdBundle`; of several merged, after the last —
unless the config sets `name`, which a piped config, or a file not named
`<name>.bundle.json`, must.

## Configure

A config describes one bundle: the folders it scans and the classes it
registers. Point your editor at the schema:

```json
{
  "$schema": "./node_modules/@ts-ioc-container/bundler/tic.schema.json",
  "paths": { "include": ["@app/services", "./src/infra"] }
}
```

```yaml
# yaml-language-server: $schema=./node_modules/@ts-ioc-container/bundler/tic.schema.json
paths:
  include:
    - '@app/services'
    - ./src/infra
```

| Field             | Default                                       | Meaning                                                                                                     |
| ----------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `paths`           | — (required)                                  | Which files are parsed — see [Selecting files](#selecting-files). Merged configs need it in one of them     |
| `match`           | exported classes with `@register`             | Which classes of a parsed file are registered — see [Selecting classes](#selecting-classes)                 |
| `name`            | the config file's (`app.bundle.json` → `app`) | The bundle's name: names the class, `AppBundle`. Required for a piped config or a file named otherwise      |
| `tsconfig`        | `./tsconfig.json`                             | Source of the `paths` aliases every import is written through, and of the import extension — never of files |
| `importExtension` | `.js` under node16/nodenext, else none        | Extension of generated imports                                                                              |

An unknown field is an error, so a misspelled or removed option never goes
unnoticed.

## Several bundles

Need more than one bundle — per environment, per app? Keep what they share in
one config, what each adds in another, and build each environment from both:

```bash
for env in prod dev test; do
  tic build common.bundle.yml "$env.bundle.yml" > "src/di/$env.bundle.ts"
done
```

```json
{
  "scripts": {
    "bundle": "tic build common.bundle.yml prod.bundle.yml > src/di/prod.bundle.ts",
    "bundle:check": "tic build common.bundle.yml prod.bundle.yml | diff - src/di/prod.bundle.ts"
  }
}
```

```yaml
# common.bundle.yml: what every environment registers
paths:
  include:
    - '@app/services'
```

Each environment's config adds its own files and classes:

```yaml
# prod.bundle.yml: + the adapters, minus dev-only *.dev.ts files
paths:
  include:
    - ./src/infra
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
# dev.bundle.yml: + the adapters; the *.dev.ts logger replaces the production one, dropped by class name
paths:
  include:
    - ./src/infra
match:
  exclude: JsonLogger
```

`tic build common.bundle.yml prod.bundle.yml` then scans `@app/services` and
`./src/infra`, and exports `ProdBundle`.

### Merging configs

`tic build a.bundle.yml b.bundle.yml c.bundle.yml` merges the configs left to
right, the way webpack-merge merges webpack configs:

- objects merge field by field;
- list fields — `paths.include`, `paths.exclude`, `match.glob`, `match.exclude`,
  `match.decorators` — concatenate in order, without duplicates (one folder or
  glob counts as a list of one), so a later config can only add to them;
- any other value (`name`, `tsconfig`, `importExtension`, `match.export`) set
  by a later config replaces an earlier one;
- the `match` shorthand merges as `match.glob`.

Each config is validated on its own — an error names the file it is in — so a
shared config may leave `paths` out; the merged config must have
`paths.include`. Defaults apply to the merged config only: a `paths.exclude` in
any of them replaces the default excludes, as it does in a single config, so
list the defaults in the shared config to keep them. The bundle is named after
the last config, unless one sets `name` — so leave `name` out of a shared
config. Merged configs must sit in one folder, which their relative paths
resolve against. A piped config (`-`) is never merged.

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
    "exclude": ["**/*.spec.ts", "**/*.test.ts", "**/__tests__/**", "**/node_modules/**", "**/legacy/**"]
  },
  "match": { "decorators": ["register"] }
}
```

## Selecting files

`paths` is `{ include, exclude }`. `paths.include` names the folders a bundle's files come from,
and the only ones: what your tsconfig compiles plays no part. It is one folder
or a list, each relative to the config file (`./src/services`) or a tsconfig
`paths` alias (`@app/services`, for a `"@app/*": ["./src/*"]` alias), and
always scanned with its sub-folders. `paths` is always an object — a folder or a
list in place of it is an error — and `exclude` may be left out to keep the default:

```yaml
paths:
  include: ./src/services # one folder
```

```yaml
paths:
  include: # or a list
    - '@app/services'
    - ./src/infra
  exclude: '**/*.dev.ts' # a custom exclude
```

Within them, a file is parsed unless it matches **one of** `exclude`. Globs are relative to the config file and `/`-separated; `**`
spans folders. Like a folder in `paths.include`, an exclude glob may start with a
tsconfig `paths` alias: with `"@generated/*": ["./src/.generated/*"]`,
`@generated/**` reads `src/.generated/**`, and `@generated` (or `@generated/`)
drops the whole folder. A catch-all `"*"` alias is never applied, so plain globs
such as `**/*.spec.ts` keep their meaning.

| Rule      | Default                                   | Meaning                                                                                                          |
| --------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `include` | — (required)                              | Folder, or folders, to scan                                                                                      |
| `exclude` | test files, `__tests__/`, `node_modules/` | A glob, or a list of them, of files never read; may start with a tsconfig alias; replaces the default when given |

A non-empty `exclude` replaces the defaults, so restate the ones you still want:

```json
"paths": {
  "exclude": [
    "**/*.spec.ts",
    "**/*.test.ts",
    "**/*.spec.tsx",
    "**/*.test.tsx",
    "**/__tests__/**",
    "**/node_modules/**",
    "frontend/api/generated/**",
    "@generated"
  ]
}
```

If it omits a default glob the build warns, since test classes usually carry
the same `@register` decorators as production ones. `"exclude": []` deliberately
parses everything, including tests.

## Selecting classes

By default every exported, non-abstract class of a parsed file that carries
`@register` is registered. `match` changes that; a class must meet every
criterion that is set:

```json
"match": {
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
"match": {
  "decorators": ["repository", "service"],
  "exclude": ["MockDashboardRepository", "*Fake"]
}
```

`exclude` applies after every other criterion, so it combines with
`decorators` and `glob` freely.

### The `match` shortcut

When the default `export` and `decorators` are all you need, `match`
itself can be the class-name globs — a string or a list is a shortcut for
`match.glob`:

```yaml
match: '*Service' # = match: { glob: '*Service' }
```

```yaml
match: ['*Service', '*Repository'] # = match: { glob: ['*Service', '*Repository'] }
```

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

## Smoke-testing the bundles

`tic build` reads files and decorators — it never follows `@inject`. A config
which leaves out the folder a dependency lives in still builds, without a
warning, and the app it wires fails on the first resolve that needs it:
`common.bundle.yml` alone registers `Greeter`, but not the `ILogger` it injects.

Catch that in CI with a smoke test per bundle. Apply the bundle to a container
whose `registered` event is subscribed first — child scopes copy the listener,
so it records every key of the whole scope tree — open the scopes your app
opens, and resolve every recorded key in the scope it landed in:

```ts
import { Container, type DependencyKey, type IContainer, type IContainerModule } from 'ts-ioc-container';
import { DevBundle } from '@app/di/dev.bundle';
import { ProdBundle } from '@app/di/prod.bundle';

function smokeTest(bundle: IContainerModule): string[] {
  const root = new Container({ tags: ['application'] });
  const registered: Array<[IContainer, DependencyKey]> = [];
  root.registered.subscribe((_provider, key, scope) => registered.push([scope, key]));

  root.useModule(bundle);
  root.createScope({ tags: ['request'] }); // every scope the app opens at runtime

  const failures: string[] = [];
  for (const [scope, key] of registered) {
    try {
      scope.resolve(key);
    } catch (e) {
      failures.push(`${String(key)}: ${(e as Error).message}`);
    }
  }
  return failures;
}

it.each([
  ['prod', new ProdBundle()],
  ['dev', new DevBundle()],
])('the %s bundle resolves every class it registers', (_env, bundle) => {
  expect(smokeTest(bundle)).toEqual([]);
});
```

Test **every** bundle: each environment is a different container, so `prod`
passing says nothing about `dev`. Together with `bundle:check` (the saved
bundle is current) it covers the whole pipeline — config → bundle → working
container.

The test resolves what was registered, so it cannot see:

- a constructor parameter without `@inject` — it is `undefined`, not an error;
- dependencies behind `lazy()`, until they are used;
- `container.resolve(...)` calls inside methods;
- providers that need runtime args, or are hidden on purpose by
  `scopeAccess(...)` — filter those keys out, or resolve them with test args.

Swap clients of external systems (database, HTTP) for test doubles first — a
`test.bundle.yml` of doubles is one way — so the test checks the wiring, not
the network. See
[Smoke testing](https://github.com/IgorBabkin/ts-ioc-container/tree/main/packages/ts-ioc-container#smoke-testing)
in the `ts-ioc-container` README for the same recipe with request and
transaction scopes.

## Programmatic API

`build()` returns the bundle and writes nothing, like the CLI:

```ts
import { writeFileSync } from 'node:fs';
import { build } from '@ts-ioc-container/bundler';

const { content, warnings } = build({ config: 'app.bundle.json' });
writeFileSync('src/di/app.bundle.ts', content);

// or config text, as `tic build` reads from stdin
build({ text: 'name: app\npaths:\n  include: ["@app/services"]\n' });
```
