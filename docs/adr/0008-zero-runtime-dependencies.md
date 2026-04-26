# ADR 0008 — Zero runtime dependencies

- **Status:** Accepted
- **Date:** 2026-04-26
- **Deciders:** core maintainers
- **Tags:** packaging, dependencies, runtime

## Context

`ts-ioc-container` is a small library that is installed into application
runtime paths. Runtime dependencies would increase install size, widen the
transitive dependency surface, and make compatibility harder for server,
browser, and library consumers.

The project still needs development tooling for TypeScript, testing,
formatting, documentation, release automation, and optional metadata-based
features.

## Decision

Keep the published package free of runtime dependencies. Tooling and optional
integration dependencies live in `devDependencies`, and the published package
contains only generated CommonJS, ESM, and declaration outputs.

`reflect-metadata` is kept as a development dependency because the project
tests and documents metadata features, but consumers remain responsible for
loading it when they use decorator metadata at runtime.

> [!IMPORTANT]
> The runtime package remains dependency-free by design. Optional capabilities
> are enabled by the consuming application, not bundled into the library.

> [!WARNING]
> Decorator/metadata-based injection requires consumers to install and
> initialize `reflect-metadata` themselves.

## Consequences

**Positive**

- The package has a small runtime footprint and no transitive runtime supply
  chain.
- Consumers have fewer version conflicts.
- The library remains easier to use in constrained environments.

**Negative / trade-offs**

- Optional runtime capabilities must be documented because consumers may need
  to install or load supporting packages themselves.
- Utility code that could come from small packages is maintained locally.
- Development dependencies still require regular maintenance even though they
  are not published as runtime dependencies.

## References

- `package.json`
- `lib/index.ts`
- `README.md`
