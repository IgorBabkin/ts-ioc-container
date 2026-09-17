# SPEC-001 · Controller naming from OpenAPI tags

Status: **active** · Requirement prefix: `CN` · Implements [#11](https://github.com/IgorBabkin/openapi-to-server/issues/11)

## Context

An operation is assigned to a controller by its tags. A tag is free text in the OpenAPI
specification — `Network Health`, `station-groups` and `v1/admin` are all legal — but the name
derived from it is used in three places that must agree:

| Consumer | Produced by | Used as |
| --- | --- | --- |
| Controller interface name | `controller_name` helper, `Controllers.ts.hbs` | `export interface INetworkController` |
| `IServer` property key | `IServer.ts.hbs` | `Network: constructor<INetworkController>` |
| DI lookup key | `extractRoutes` → `RouteMetadata.controllerName` | `container.resolve('Network')` |

Before this spec each was computed independently: the interface name capitalised the tag, the
`IServer` key used it verbatim, and the DI key capitalised it again. A tag containing a space
produced a file that did not parse, and a lower-case tag produced an `IServer` key that did not
match the key the runtime resolved.

## Requirements

**CN-1** — An operation is assigned to the controller derived from its **first** tag. Remaining
tags do not affect naming or grouping; they are carried through unchanged on
`RouteMetadata.tags`.

**CN-2** — An operation with no tags is assigned to the tag `Default` by the generators, and is
skipped with a warning by `extractRoutes`.

**CN-3** — A tag is normalised into a TypeScript identifier by `toIdentifier` before it is used as
a name or a key. Normalisation splits the tag on every run of characters that are illegal in an
identifier (outside `[A-Za-z0-9_$]`) and keeps **only the first segment**, upper-casing its first
character. `Network Health` names the `Network` controller; `Health` is dropped.

**CN-4** — When the normalised result would begin with a digit it is prefixed with `_`. When
nothing usable remains, the result is `_`.

**CN-5** — `toIdentifier` is idempotent: `toIdentifier(toIdentifier(t)) === toIdentifier(t)`.

**CN-6** — The controller interface name is `I<identifier>Controller`, and the `IServer` property
key is `<identifier>`. Both are valid TypeScript, so generated output parses for any spec-valid
tag.

**CN-7** — `RouteMetadata.controllerName` is the same `<identifier>` the `IServer` key uses, so a
controller registered under the generated key resolves at runtime. All three consumers share one
implementation of `toIdentifier`, exported from `@ibabkin/openapi-to-server/identifier`.

**CN-8** — Two tags that normalise to the same identifier describe the same controller: their
operations are merged into a single interface and a single `IServer` key, rather than emitting a
duplicate declaration. CN-3 is lossy, so this is reachable from distinct tags — `Network Health`
and `network-status` both name the `Network` controller. Tags whose first word is shared but whose
controllers should differ must be renamed on the contract side.

## Normalisation table

| Tag | Identifier | Controller interface | `IServer` key / DI key |
| --- | --- | --- | --- |
| `items` | `Items` | `IItemsController` | `Items` |
| `Network Health` | `Network` | `INetworkController` | `Network` |
| `station-groups` | `Station` | `IStationController` | `Station` |
| `v1/admin` | `V1` | `IV1Controller` | `V1` |
| `user_profile` | `User_profile` | `IUser_profileController` | `User_profile` |
| `2fa` | `_2fa` | `I_2faController` | `_2fa` |
| `///` | `_` | `I_Controller` | `_` |

`_` and `$` are legal in a TypeScript identifier, so they do not end a segment: `user_profile`
survives whole.

## Deviation from issue #11

The issue proposed PascalCase-joining every segment (`Network Health` → `NetworkHealth`). CN-3
keeps only the first segment instead, on the maintainer's instruction: the first word names the
controller. The trade-off is CN-8 — truncation makes collisions between distinct tags reachable,
where joining made them nearly impossible.

## Out of scope

`operationId` is used verbatim for method names and for the `…Payload` / `…Response` / `…Route`
type names. It is subject to the same class of problem and is **not** covered here: the method
name is part of the controller's call contract, so normalising it is a separate, larger change.

## Tests

| Requirement | Test |
| --- | --- |
| CN-1, CN-2, CN-7 | `packages/openapi-express-server/__tests__/routeExtractor.spec.ts` |
| CN-3, CN-4, CN-5 | `packages/openapi-to-server-interface/__tests__/tags.spec.ts` |
| CN-6, CN-8 | `packages/openapi-to-server-interface/__tests__/tags.spec.ts` |
