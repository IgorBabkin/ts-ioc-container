# ADR 0022 — Registration discovery happens at build time, outside the container

- **Status:** Proposed
- **Date:** 2026-09-27
- **Deciders:** core maintainers
- **Tags:** tooling, registration, packaging

## Context

Applications register classes one call at a time:
`container.addRegistration(R.fromClass(UserService))`. Every new service means
editing a central list, and forgetting to is a runtime `DependencyNotFoundError`.
Other ecosystems solve this with namespace scanning (Spring component scan,
.NET assembly scanning). In TypeScript the equivalent of a namespace is an import
path — a folder, often reached through a `tsconfig.json` `paths` alias.

Scanning could happen at runtime, in the container. That would need file-system
access (no browsers, no bundlers), dynamic `import()` or `require` of unknown
files (invisible to type-checking and tree-shaking), and would put more
responsibility on `Container`, which is already the largest class in the library.

## Decision

Discover registrations **at build time**, in a separate package,
`@ts-ioc-container/compiler`, that ships the `tic` CLI.

- `tic build` reads a JSON config (`tic.config.json`) listing modules; each
  module names folders (relative paths or tsconfig aliases) and an output file.
- The compiler parses sources with the TypeScript compiler API (syntax only, no
  type checker) and emits an ordinary TypeScript module: static imports,
  `Registration.fromClass(...)` per class, and an `IContainerModule` applying
  them.
- The generated code uses only the public `ts-ioc-container` API. The core
  package gains no code, no dependency and no new concept; `Container` is
  untouched.
- `typescript` is a peer dependency of the compiler — every consumer already has
  it, and its `tsconfig` parsing (including `extends`) is the reference
  implementation.

## Consequences

**Positive**

- Generated modules are type-checked, bundled and tree-shaken like hand-written
  code, and work wherever the container works.
- The core package stays dependency-free (ADR 0008) and its surface unchanged.
- The output is reviewable in diffs; `tic build --check` keeps it honest in CI.

**Negative / trade-offs**

- A build step: the generated file must be regenerated when a namespace gains or
  loses a class (`--check` detects forgetting it).
- Discovery is syntactic: which classes a file contributes is a declarative
  rule in the config (export kind, decorator names, name glob), not a type
  query, so a composed decorator is matched by its own name and has to be
  listed there.
- The compiler is a new published package; its first npm publish has to be done
  by hand, since trusted publishing (OIDC) cannot create a package.

## References

- `packages/compiler/specs/epics/folder-registration.md`
- `packages/compiler/lib/`
