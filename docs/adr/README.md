# Architecture Decision Records

This directory captures the major architectural decisions behind `ts-ioc-container`.
ADRs are written in [MADR](https://adr.github.io/madr/) flavor: each record describes
the **context**, the **decision**, and its **consequences** at the time it was made.

ADRs are append-only. Superseded decisions are marked as such; the original record
is left intact so the historical reasoning remains discoverable.

## Index

| #    | Title                                                                                           | Status   |
| ---- | ----------------------------------------------------------------------------------------------- | -------- |
| 0001 | [Container as a linked list of scopes](0001-container-as-linked-list.md)                        | Accepted |
| 0002 | [Pluggable injector strategies (Metadata / Simple / Proxy)](0002-pluggable-injectors.md)        | Accepted |
| 0003 | [Separate Provider and Registration abstractions](0003-provider-vs-registration.md)             | Accepted |
| 0004 | [Pipe-based composition via ProviderPipe](0004-provider-pipe-composition.md)                    | Accepted |
| 0005 | [Token immutability — chained tokens are new instances](0005-token-immutability.md)             | Accepted |
| 0006 | [Tag-based scoping with separate match and access rules](0006-tag-scoping-and-access.md)        | Accepted |
| 0007 | [Lifecycle hooks via reflect-metadata and opt-in modules](0007-lifecycle-hooks.md)              | Accepted |
| 0008 | [Zero runtime dependencies](0008-zero-runtime-dependencies.md)                                  | Accepted |
| 0009 | [Token taxonomy — Single / Group / Alias / Class / Function / Constant](0009-token-taxonomy.md) | Accepted |
| 0010 | [Generated README from Handlebars source](0010-generated-readme.md)                             | Accepted |
| 0011 | [Spec-driven development workflow](0011-spec-driven-development.md)                             | Accepted |

## Adding a new ADR

1. Copy the most recent file as a template.
2. Use the next sequential number (e.g. `0011-...`).
3. Set status to `Proposed` while under review; flip to `Accepted` once merged.
4. Add a row to the index above.
