# ADR 0024 — Entity framework: an explicit unit of work, writes ordered by references, typed keys

- **Status:** Proposed
- **Date:** 2026-10-03
- **Deciders:** core maintainers
- **Tags:** entity-framework, api, breaking

## Context

`@ts-ioc-container/entity-framework` 0.2.0 (#232) is a unit of work over plain
DTOs: an `EntityManager` per repository holds an identity map and snapshots, and
a flush writes each entity's diff through the application's own repository. A
consumer audit (#233–#239) found bugs and gaps; fixing them showed three places
where the design itself, not its implementation, makes the package harder to
use than it needs to be.

1. **There is no unit-of-work object.** One `EntityManager` per repository token
   is resolved from the container by its arguments: the repository token must be
   made by `repositoryToken` (a tagged `SingleToken`), the manager by
   `entityManagerToken(token)`, and resolving it any other way throws
   `EntityManagerArgumentError`. The commit, `flushEntityManagers(scope)`, finds
   the managers by scanning `scope.getInstances()`, so it writes them in the
   order they happened to be resolved, and never sees one resolved in a child
   scope. Nothing can answer "what will this request write?" across repositories.

2. **`lazy` / `link` solve a problem reserved ids removed.** Linking a record
   that does not exist yet into a foreign-key field exists because a new
   record's id used to come back from its insert. Since records can be added with
   an id reserved before the insert (`add`, `preparing`, `withId`), a reference
   is a plain assignment — `post.state.commentId = comment.id`. What is left
   unsolved is **write order**: writes go out in the order entities were first
   tracked, and foreign keys must be made deferrable. Meanwhile links are the most
   intricate part of the package (`Links`, `LazyRef`, `Linkable`, cycle detection
   in the flush, a spec story of its own).

3. **The key is not typed.** A record keyed by more than its id is read with
   `findById(id, ...key: never[])`; the rest of the key cannot be typed, callers
   cast (`...(['acme'] as never[])`), and a repository without `keyOf` read by
   more than the id is caught only at runtime (`EntityIdentityError`).

## Decision

### 0. The entity framework works in the context of `ts-ioc-container`

The package is part of the container's ecosystem, not a standalone data layer
that happens to be injectable. It is designed around the container and builds
on its concepts rather than repeating them:

- **A unit of work is a container scope.** `UnitOfWork` is a registration with
  a scope rule (`.when((s) => s.hasTag('request'))`), built with the scope it is
  resolved in. Its lifetime is that scope's, so the application never creates,
  passes or disposes a unit of work itself.
- **Repositories are registrations, addressed by token.** `uow.of(token)` and
  `references` resolve repositories from the unit of work's scope by any
  `InjectionToken`. Their lifetimes and visibility (an application-scoped
  singleton, say) are the container's `scope(...)` / `singleton()`, not the
  package's.
- **Injection goes through the container.** `managerOf(token)` is an `InjectFn`
  for `@inject`, in the same style as `by(...)` (ADR 0019).
- **Cross-cutting behaviour attaches through container mechanisms.** Id
  generators are registrations, and `preparing(...)` / `withId(...)` are woven
  into a repository with the provider pipe `decorate(...)` (ADR 0004). The
  package has no plugin or interceptor system of its own.
- **Events and errors follow the core's conventions.** `committed` is the core's
  `ITypedEvent`: the package emits it, and the application decides what runs.
  This matches ADR 0016, where the library collects and the caller runs. Errors
  carry a stable `code`, as ADR 0020 requires.
- **Only the public API, as a peer.** `ts-ioc-container` is a peer dependency;
  the package uses its public exports only, and the core gains nothing for it.

The one container-free path is `new EntityManager(repository)`, a unit of work
over a single repository, for tests and scripts. Everything that spans
repositories, such as `UnitOfWork`, `references` and `managerOf`, needs a
container scope. A change that would give the package its own registry,
scoping, lifecycle or hook mechanism belongs in the core, or is out of scope.

### 1. `UnitOfWork` owns the managers and the commit

```ts
const app = new Container({ tags: ['application'] })
  .addRegistration(R.fromClass(OrderRepository))
  .addRegistration(R.fromClass(UnitOfWork).when((s) => s.hasTag('request')));

const uow = IUnitOfWorkToken.resolve(request);
const orders = uow.of(IOrderRepositoryToken); // EntityManager<OrderRepository>, one per repository
await db.transaction(() => uow.commit());

// injected
constructor(@inject(managerOf(IOrderRepositoryToken)) private readonly orders: EntityManager<OrderRepository>) {}
```

- `UnitOfWork` is registered once per scope a unit of work lives in, and is
  constructed with that scope. `of(repositoryToken)` resolves the repository from
  it and answers its `EntityManager`, created on first use and cached per
  repository instance. Any token works: there is no tagged repository token.
- `commit()` writes every manager's changes in one flush (all or nothing in
  memory, as before), in reference order (decision 2), and answers the changes it
  wrote. `committed` is a `TypedEvent` (the core's) emitted after a commit — the
  hook for domain events and audit logs; the library runs nothing on it.
- `getChanges()` answers what `commit()` would write, in the order it would write
  it, without writing (#237). `hasChanges()` stays. `EntityManager` gains
  `getChanges()` and `getTracked()` for one repository.
- `managerOf(token)` is the `InjectFn` for injecting a manager.
- `EntityManager` is no longer registered: it is built by `UnitOfWork`, or with
  `new EntityManager(repository)` on its own, whose `flush()` writes that one
  repository's changes.
- **Removed:** `repositoryToken`, `isRepositoryToken`, `entityManagerToken`,
  `IEntityManagerToken`, `IEntityManager`, `isEntityManager`,
  `flushEntityManagers`, `EntityManagerArgumentError`.

### 2. Writes are ordered by declared references; `lazy` / `link` are removed

```ts
class PostRepository implements IRepository<PostDto> {
  readonly references = { commentId: ICommentRepositoryToken };
}
```

- A repository may declare `references`: which fields hold ids of which
  repository's records (a field may hold one id or an array of ids).
- A commit writes creates and updates first, then deletes. A create or update
  goes after the creates of the records it references; a delete goes before the
  deletes of the records it references. Otherwise records keep the order they
  were first tracked in. A cycle among new records — or among deleted ones —
  fails with `EntityReferenceError` before anything is written: make one foreign
  key deferrable, or set one side after the commit.
- References are tokens, resolved by the unit of work from its scope, so they
  order writes across repositories. `EntityManager.flush()` on its own has no
  scope to resolve them with: it writes creates and updates, then deletes, in
  tracking order.
- **Removed:** `EntityManager.lazy`, `Entity.link`, `LazyRef`, `ILazyRef`,
  `Linkable`, and `IRepository`'s `Value` type parameter (`ValueOf`): `create`
  always takes the whole record.

### 3. The key is a type parameter

```ts
type TariffKey = { id: string; tenant: string };

class TariffRepository implements IRepository<TariffDto, Entity<TariffDto>, TariffKey> {
  keyOf(tariff: TariffDto): TariffKey { ... }      // required when the key is not the id
  findById(key: TariffKey) { ... }
  findByIds(keys: TariffKey[]) { ... }             // optional
}

tariffs.findById({ id: 't-1', tenant: 'acme' });
```

- `IRepository<State, E = Entity<State>, Key = State['id']>`: `findById(key: Key)`,
  `findByIds?(keys: Key[])` and `keyOf?(record): Key`. `IRepository` stays an
  interface, so a generic repository class can implement it; `keyOf` is required
  where a repository is used — `new EntityManager(repository)`, `uow.of(token)`,
  `managerOf(token)` — when `Key` is not `State['id']` (`RequireKeyOf`), and the
  compile error names it. Object keys are compared by value, whatever the order
  of their fields.
- `EntityNotFoundError` carries the `key`; `EntityManager.findById(key)`,
  `findByIdOrFail(key)` and `findByIds(keys)` take keys.
- **Removed:** `RecordKey`, `RestOfKey`, the variadic `findById(id, ...key)`, and
  the runtime check for a repository read by more than its id without `keyOf`.

### Kept

Plain DTOs with snapshot diffing, repositories written by the application, the
two-phase flush (#234), reserved ids woven in with `preparing` / `withId`
(#235), `revert` / `detach` / `clear` / `reload` (#236), `findByIds` and shared
in-flight reads (#238), errors with stable codes.

## Consequences

**Positive**

- One object is the unit of work: it is what a request commits, what is asked
  what will be written, and where commit events come from. The tagged token, the
  argument-resolved registration and their error are gone.
- Foreign keys no longer need to be deferrable for records written in one commit,
  and the most intricate part of the package is gone.
- A composite key is checked by the compiler, at every read.
- Lifetimes, injection and cross-cutting behaviour work the way they do
  everywhere else in a `ts-ioc-container` application, so there is nothing
  package-specific to learn for them, and nothing to keep in sync with the core.

**Negative / trade-offs**

- The package is not usable without `ts-ioc-container`, except for a single
  `EntityManager`. That is deliberate: the container is what makes a scope a
  unit of work.

- Breaking, while 0.2.0 is on npm. The package is pre-1.0, so this ships as a
  minor, without the deprecation window of ADR 0020: that policy applies to this
  package from 1.0. `AGENTS.md` lists every removed export with its replacement.
- "Create this record only if something links it" is no longer a feature; it
  takes an `if` around `add`.
- Writes before deletes means replacing a row under a unique constraint in one
  commit (delete the old, insert the new) needs the constraint deferred, as in
  other unit-of-work libraries.
- `EntityManager.flush()` on its own does not order writes across repositories;
  that is what `UnitOfWork.commit()` is for.
