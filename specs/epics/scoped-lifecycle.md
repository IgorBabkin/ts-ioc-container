# Epic: Scoped lifecycle

- **Status:** Accepted
- **ADR:** [ADR 0006 - Tag-based scoping with separate match and access rules](../../docs/adr/0006-tag-scoping-and-access.md)
- **Public API:** `Container.createScope`, `scope`, `scopeAccess`, `singleton`, `dispose`
- **Executable spec:** `__tests__/specs/scoped-lifecycle.spec.ts`

## Intent

As an application developer, I want nested containers for application, request,
transaction, page, or widget lifecycles so that dependencies can be isolated and
cleaned up at the boundary where they are used.

## Stories

### Story: Isolate request-scoped services

As a web application developer, I can create a child scope per request so
request-specific services do not leak between concurrent requests.

Acceptance criteria:

- A registration with a request scope rule is not available from the application
  container when the application container does not match the rule.
- Matching child scopes can resolve the request-scoped registration.
- A singleton request-scoped registration is cached inside each matching child
  scope, not shared between sibling request scopes.

### Story: Preserve scope creation timing

As a maintainer, I can reason about which registrations exist in a child scope
based on when the child was created.

Acceptance criteria:

- Existing parent registrations are applied when a child scope is created.
- An existing child scope can still fall back to later unscoped parent
  registrations.
- Scoped registrations added to a parent after a child already exists are not
  retroactively applied to that existing child.
- A new matching child created after the scoped registration is added receives
  that registration.

### Story: Dispose local lifecycle resources

As an application developer, I can dispose a child scope when its lifecycle ends
without destroying the parent application container.

Acceptance criteria:

- Disposing a child scope prevents further resolution from that scope.
- Disposing a child scope clears instances tracked by that child.
- The parent container remains usable after the child scope is disposed.

## Notes

Container disposal is local to the container being disposed. Child scopes should
be disposed by the lifecycle owner that created them.
