# Epic: Errors and boundaries

- **Status:** Proposed
- **ADR:** [ADR 0001 - Container as a linked list of scopes](../../docs/adr/0001-container-as-linked-list.md)
- **Public API:** `DependencyNotFoundError`, `DependencyMissingKeyError`, `ContainerDisposedError`, `MethodNotImplementedError`, `UnexpectedHookResultError`, `UnsupportedTokenTypeError`, `EmptyContainer`
- **Executable spec:** `__tests__/specs/errors-and-boundaries.spec.ts`

## Intent

As an application developer or maintainer, I want clear errors and boundary
behavior so that dependency misconfiguration, unsupported usage, and lifecycle
mistakes are easy to diagnose.

## Stories

### Story: Fail clearly for missing dependencies

As a library user, I can distinguish an unregistered dependency from other
runtime failures so that configuration problems are easy to fix.

Acceptance criteria:

- Resolving an unknown dependency key fails with `DependencyNotFoundError`.
- Alias resolution with no visible provider fails through the same missing
  dependency boundary.
- The failure message identifies the missing dependency when available.

### Story: Fail clearly for invalid registrations

As a maintainer, I can detect registrations that cannot be applied so that
configuration errors are caught during container setup.

Acceptance criteria:

- Applying a registration without a key fails with
  `DependencyMissingKeyError`.
- Reading a missing registration key through `getKeyOrFail` fails with
  `DependencyMissingKeyError`.

### Story: Reject disposed container usage

As an application developer, I can rely on disposed scopes being closed so that
dependencies are not resolved or registered after their lifecycle ends.

Acceptance criteria:

- Resolving from a disposed container fails with `ContainerDisposedError`.
- Registering in a disposed container fails with `ContainerDisposedError`.
- Creating a scope from a disposed container fails with
  `ContainerDisposedError`.

### Story: Reject unsupported token and hook operations

As a library user, I get specific failures when I ask for behavior that a token
or hook execution path does not support.

Acceptance criteria:

- `toToken` fails with `UnsupportedTokenTypeError` for unsupported token input.
- Constant and instance-list tokens reject unsupported modifiers with
  `MethodNotImplementedError`.
- Synchronous hook execution fails with `UnexpectedHookResultError` when a hook
  returns a promise.

### Story: Terminate parent lookup at the empty container

As a maintainer, I can rely on the empty container boundary so that root
container resolution has a predictable terminator.

Acceptance criteria:

- `EmptyContainer` reports no parent scopes, registrations, or instances.
- `EmptyContainer` throws `DependencyNotFoundError` when asked to resolve.
- Unsupported mutations on `EmptyContainer` fail with
  `MethodNotImplementedError`.

## Notes

Error specs should prefer user-diagnosable behavior over implementation detail.
The exact internal path to an error is less important than the observable
failure type and boundary condition.
