# Epic: Metadata utilities

- **Status:** Proposed
- **ADR:** [ADR 0008 - Zero runtime dependencies](../../docs/adr/0008-zero-runtime-dependencies.md)
- **Public API:** `classMeta`, `getClassMeta`, `classLabel`, `getClassLabels`, `classTag`, `getClassTags`, `paramMeta`, `getParamMeta`, `paramLabel`, `getParamLabels`, `paramTag`, `getParamTags`, `methodMeta`, `getMethodMeta`, `methodLabel`, `getMethodLabels`, `methodTag`, `getMethodTags`, `once`, `debounce`, `throttle`, `shallowCache`, `handleError`, `handleAsyncError`
- **Executable spec:** `__tests__/specs/metadata-utilities.spec.ts`

## Intent

As a library or framework author, I want reusable metadata helpers and method
decorators so that application code can carry labels, tags, validation hints,
and small behavioral policies without custom metadata plumbing.

## Stories

### Story: Attach class metadata

As a framework author, I can attach metadata to classes so that later
registration, validation, or documentation code can inspect class-level
annotations.

Acceptance criteria:

- Class metadata can be written and read from a constructor.
- Class metadata can be read from an instance.
- Class labels accumulate by key.
- Class tags accumulate without duplicates.
- Missing class labels or tags return empty collections.

### Story: Attach parameter metadata

As a framework author, I can attach metadata to constructor parameters so that
parameter-level annotations can drive dependency or validation behavior.

Acceptance criteria:

- Parameter metadata can be written and read by index.
- Sparse parameter metadata preserves the annotated index.
- Labels and tags on one parameter do not bleed into another parameter.
- Missing parameter labels or tags return empty collections.

### Story: Attach method metadata

As a framework author, I can attach metadata to methods so that method-level
annotations can drive hooks, validation, or documentation.

Acceptance criteria:

- Method metadata can be written and read by method name.
- Method labels accumulate by key.
- Method tags accumulate without duplicates.
- Metadata on one method does not bleed into another method.

### Story: Add small method behaviors

As an application developer, I can apply reusable method decorators so that
common behaviors do not need to be reimplemented inside each class.

Acceptance criteria:

- `once` calls the method once per instance and returns the cached result.
- `shallowCache` caches results per instance and computed argument key.
- `throttle` blocks calls inside the configured time window per instance.
- `debounce` delays execution and keeps the latest call in the debounce window.

### Story: Handle method errors

As an application developer, I can attach error handlers to methods so that
expected failures can be captured consistently.

Acceptance criteria:

- `handleError` catches synchronous method errors and passes method context to
  the handler.
- `handleAsyncError` catches asynchronous method errors and passes method
  context to the handler.
- Successful method calls return their original result.

## Notes

Some metadata utilities are general-purpose and not container-specific. Because
they are exported from the public package, they still need product-level
behavior specs while they remain part of the public API.
