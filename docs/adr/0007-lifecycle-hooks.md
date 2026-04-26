# ADR 0007 — Lifecycle hooks via reflect-metadata and opt-in modules

- **Status:** Accepted
- **Date:** 2026-04-26
- **Deciders:** core maintainers
- **Tags:** hooks, lifecycle, metadata

## Context

Some dependencies need lifecycle behavior when they are constructed or when a
scope is disposed. Examples include property injection, initialization,
cleanup, and resource release. Running this behavior automatically for every
project would add metadata assumptions and lifecycle cost to projects that do
not need it.

## Decision

Store hook declarations with `reflect-metadata`, but activate lifecycle
execution through container modules.

Decorators such as `onConstruct` and `onDispose` attach hook metadata to class
methods. `HooksRunner` reads that metadata and executes hook functions or
hook classes. `AddOnConstructHookModule` and `AddOnDisposeHookModule` opt a
container into running those hooks during instance construction and scope
disposal.

Disposal hooks run for the container or scope being disposed. Disposal is local:
disposing a parent container does not automatically dispose child scopes or run
child-scope dispose hooks. The host application owns each child scope lifecycle
and should dispose the child explicitly when that lifecycle ends.

Synchronous hook execution rejects promises and points callers at the async
execution path.

> [!IMPORTANT]
> Lifecycle hooks are opt-in. Register the construct/dispose modules, or add
> equivalent hooks manually, before expecting decorated lifecycle methods to run.

> [!WARNING]
> Disposing a parent scope does not run child-scope dispose hooks. Dispose each
> child scope explicitly when its lifecycle ends.

## Consequences

**Positive**

- Lifecycle behavior is available without becoming mandatory container
  behavior.
- Hook classes can be resolved through the container, so hook logic can use DI.
- Hook execution is centralized in `HooksRunner`.
- Local disposal maps cleanly to frameworks with explicit child lifecycles,
  such as React component trees.

**Negative / trade-offs**

- Projects using hook decorators need `reflect-metadata`.
- Lifecycle hooks must be enabled with modules, which is one more setup step.
- Async hooks require explicit async execution support and cannot be hidden in
  the synchronous path.
- Child scope cleanup is not implicit; applications must dispose child scopes
  explicitly to run their dispose hooks.

## References

- `lib/hooks/hook.ts`
- `lib/hooks/HooksRunner.ts`
- `lib/hooks/onConstruct.ts`
- `lib/hooks/onDispose.ts`
- `lib/hooks/HookContext.ts`
- `docs/src/pages/hooks.mdx`
