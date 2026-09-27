# ADR 0020 — Agent-readable package and deprecate-before-remove

- **Status:** Proposed
- **Date:** 2026-09-26
- **Deciders:** core maintainers
- **Tags:** api-design, release, documentation

## Context

A growing share of consumer code is written by AI coding agents. An agent
knows the API from training data, which is several majors behind (the core
package went from 56 to 72 in September 2026 alone), reads what is in
`node_modules`, and repairs its code from compiler and runtime errors.

Until now the package helped with none of the three. The types build inherited
`removeComments`, so no JSDoc reached `typings/`; the tarball carried no guide
beyond the README; error messages rarely said what to do; and a breaking change
removed the old API in the same release, so code written from memory failed
with "X is not exported" and nothing pointing at the replacement.

## Decision

1. **The tarball is the documentation an agent reads.** Each package ships an
   `AGENTS.md` (setup, recipes, pitfalls, removed APIs, error codes), its
   `lib/` source, JSDoc in `typings/` and declaration maps. The recipes in the
   core guide are executed by `__tests__/readme/agentRecipes.spec.ts`.
2. **Docs changes release.** A `docs(<package>)` commit publishes a patch
   (`report.bumps` in `.release.json`), so the shipped guide never lags the code.
3. **Errors carry a stable `code`** (`ContainerError.code`) and a message that
   names the fix. Codes are part of the public API; messages are not.
4. **Deprecate before removing.** A renamed or removed export stays for at
   least one major, marked `@deprecated Use X — see ADR NNNN`, and is removed
   in a later major. The `AGENTS.md` "Removed APIs" table gains a row when it goes.
5. **Batch breaking changes** into planned majors rather than one per change.

## Consequences

- Agents see `@deprecated` hints and JSDoc examples in their editor tooling
  and get actionable errors, instead of guessing from stale memory.
- The tarball is larger (source and declaration maps); runtime bundles are
  unaffected.
- Deprecated exports linger for a major, which costs some maintenance.
- `CannonSingletonApplyTwiceError` → `CannotApplySingletonTwiceError` is the
  first rename done this way.
