---
name: run-local
description: Start, stop, restart and check this repo locally (запусти, останови, перезапусти локально). Use when asked to run the project, start or stop its dev watchers, or try the tic, openapi-to-zod, openapi-to-server or openapi-to-client CLIs for real.
---

# Run this repo locally

This workspace has no server or web app: it publishes libraries and one-shot
CLIs. "Running" it means one of two things:

- **Dev watchers**: long-running processes that re-run on every source change.
  These are what start, stop and restart act on.
- **CLIs**: commands that run once, print or write their output and exit. They
  have nothing to stop.

Run everything from the checkout you are working in. Each worktree has its own
`node_modules`, build output and watcher state.

## Setup

```bash
pnpm install --frozen-lockfile
pnpm run build
```

Rebuild after pulling or switching branches: build output is gitignored and is
not refreshed by checkout. The build takes about 10 seconds.

## Dev watchers

```bash
.claude/skills/run-local/scripts/dev.sh start            # tests + types
.claude/skills/run-local/scripts/dev.sh watch bundler    # start, then follow the log
.claude/skills/run-local/scripts/dev.sh status
.claude/skills/run-local/scripts/dev.sh logs tests
.claude/skills/run-local/scripts/dev.sh restart types
.claude/skills/run-local/scripts/dev.sh stop             # every target
```

| Target           | What it does                                                    | In `start` by default |
| ---------------- | --------------------------------------------------------------- | --------------------- |
| `tests`          | `vitest watch` on the core package                              | yes                   |
| `types`          | `tsc --noEmit --watch` on the core package                      | yes                   |
| `react`          | `vitest watch` on `@ts-ioc-container/react`                     | no                    |
| `bundler`        | rebuilds `@ts-ioc-container/bundler` on `lib/` change           | no                    |
| `openapi-zod`    | rebuilds `@ts-ioc-container/openapi-to-zod` on `lib/` change    | no                    |
| `openapi-server` | rebuilds `@ts-ioc-container/openapi-to-server` on `lib/` change | no                    |

The script detaches each target into its own process group and keeps its pid
and log in `node_modules/.cache/run-local/`. `stop` signals the whole group, so
no pnpm child survives it. Starting a running target is a no-op, and `restart`
is `stop` then `start`.

`watch` is `start` followed by `tail -F` on the targets' logs, for a person at
a terminal. Ctrl-C ends the tail only, so the targets keep running until `stop`.
An agent should use `start` and read `logs` instead, because `watch` never exits.

The rebuild targets keep the CLIs current while you edit, which also rules out
the stale build described under Gotchas.

Stop what you started before ending the session.

## CLIs

Write output into the scratchpad, never over the fixtures: `*.bundle.ts` files
are generated and committed.

**Bundler.** Run it from the fixture project, because `--tsconfig` is relative
to the working directory:

```bash
cd packages/bundler/__tests__/fixtures/app
node ../../../cjm/bin.js build --tsconfig tsconfig.json common.bundle.yml dev.bundle.yml
```

This prints `DevBundle` to stdout and progress to stderr. To check it, pipe it
into `diff - src/di/dev.bundle.ts`, which should print nothing.

**OpenAPI generators.** Both flags are required:

```bash
node packages/openapi-to-zod/bin/openapi-to-zod.js --input packages/openapi-to-zod/__tests__/swagger.yaml --output "$OUT/zod.ts"
node packages/openapi-to-server/bin/openapi-to-server.js --input packages/openapi-to-server/__tests__/swagger.yaml --output "$OUT/server.ts"
node packages/openapi-to-server/bin/openapi-to-client.js --input packages/openapi-to-server/__tests__/swagger.yaml --output "$OUT/client.ts"
```

## Gotchas

- **Never call a bare `tic`.** On macOS it resolves to `/usr/bin/tic`, the
  ncurses terminfo compiler. `pnpm --filter @ts-ioc-container/bundler exec tic`
  hits the same binary, because a package does not link its own bin. Use
  `node packages/bundler/cjm/bin.js`.
- **`Unknown option '--tsconfig'` means a stale build.** `cjm/` is older than
  `lib/`, so run `pnpm run build`. The same applies whenever a CLI disagrees
  with its source.
- **The fixture configs are partial.** `dev.bundle.yml` alone fails validation.
  Pass `common.bundle.yml` first: configs merge left to right.
