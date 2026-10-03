# Epic: Entity framework

- **Status:** Proposed
- **Public API:** `Entity`, `EntityManager`, `IRepository`, `LazyRef`, `Linkable`, `repositoryToken`, `entityManagerToken`, `flushEntityManagers`, `EntityNotFoundError`, `EntityIdentityError`, `EntityReferenceError`
- **Package:** `@ts-ioc-container/entity-framework`
- **Executable spec:** `packages/entity-framework/__tests__/specs/entity-framework.spec.ts`

## Intent

As an application developer, I want to read records, change them as plain
DTOs, and have every change of a unit of work written once at its end, so that
use cases do not deal with persistence and a unit of work maps onto a scope.

## Stories

### Story: Track a change by changing the DTO

Acceptance criteria:

- `getDiff` answers nothing until the state changes, then only the fields that
  differ from what is stored — a nested change marks its top-level field.
- Dates compare by time, not identity.
- A field the state no longer has is in the diff as `undefined`.
- A new entity's diff is its whole state.
- `patch(changes)` sets the fields it names and leaves the rest; it keeps its
  own copy of what it sets, and refuses to change the `id`.
- An entity keeps its own copy of the DTO it is given.

### Story: Extend an entity with behaviour

Acceptance criteria:

- A repository's `entityClass` is what its entity manager builds entities with,
  so a subclass's methods are on everything the manager answers.

### Story: Read each record once per unit of work

Acceptance criteria:

- Every read of an id answers the same entity; only the first reaches the repository.
- `trackMany` tracks records read some other way; one tracked already keeps its
  entity and the changes made to it.
- `findByIdOrFail` fails with `EntityNotFoundError` for an id the repository
  does not have; `findById` answers `undefined`.

### Story: Records keyed by more than their id

As an application developer whose records are keyed by more than their id — a
tenant's record, say — I want the identity map to tell two records with the same
id apart, so that one tenant never reads or writes another tenant's record.

Acceptance criteria:

- A repository whose `findById` takes more than the id names the whole key of a
  record with `keyOf(record)`; the identity map keys entities by it.
- Reading the same id under two keys answers two entities and reaches the
  repository twice; reading it again under either key answers that entity.
- `track`, `create` and `remove` use the same key, so the same id under another
  key is another record.
- `findById` with more than the id, on a repository without `keyOf`, fails with
  `EntityIdentityError` instead of answering whichever record was read first.
- `flush` refuses an entity whose key was changed, with `EntityIdentityError`.

### Story: Write a unit of work with one flush

Acceptance criteria:

- `flush` updates only changed fields, handing the repository the record as it
  was read, and writes nothing for unchanged entities.
- After a flush, what the repository answered is what is stored — and the
  entity's `state`, the same object — so a second flush writes nothing.
- `create` tracks a new record at once (reads of its id answer it); `flush`
  creates it, and later changes update it.
- `remove` makes the id read as missing at once; `flush` deletes it. A record
  created and removed in one unit of work writes nothing.
- `create` refuses an id the manager tracks, or one it removed, with `EntityIdentityError`.
- `flush` refuses an entity whose `id` was changed, with `EntityIdentityError`.

### Story: Add a record whose id is reserved before it is written

As an application developer whose ids come from a database sequence or a
client-side UUID, I want to add a record without choosing its id, so that it has
its id from the moment it is added and is written at the commit like any other.

The id is reserved before the insert, never read back from it: the identity map
needs the key at once, and the record can be referenced by its id before the
commit. How an id is made is a strategy (`IIdGenerator`), how it is attached to a
repository is advice woven in by the container (`decorate(preparing(...))`), and
the entity manager only calls the repository's `prepare`.

Acceptance criteria:

- `add(value)` turns the value into a new record with the repository's
  `prepare`, then tracks it as `create` does: it writes nothing, answers a new
  entity with its id, and reads of that id answer it.
- `add` on a repository without `prepare` fails with `EntityIdentityError`,
  saying how to give it one.
- `preparing(...advices)`, applied with the container's `decorate`, gives a
  repository a `prepare` that runs the advices in order, each resolving what it
  needs from the scope the repository is resolved in. The repository is still
  itself: its methods, fields and class are unchanged.
- `withId(idsToken)` is the advice that sets `id` from the generator registered
  under `idsToken`.
- `pooled(size)` decorates a generator of numeric ids so it reaches the inner one
  once per `size` ids (hi/lo), sharing one refill between concurrent calls.
- `uuidV7Ids()` makes time-ordered RFC 9562 version 7 UUIDs with no round trip.

### Story: Discard, detach and reload

As an application developer, I want to undo what a unit of work changed, stop
tracking records, and re-read a record, so that a failed validation, a long
batch, or an optimistic-concurrency conflict does not leave me stuck with the
tracked state.

Acceptance criteria:

- `entity.revert()` puts `state` back to what is stored — the same object —
  drops its links and undoes `remove`, so a flush writes nothing for it. A new
  entity has nothing stored: `revert` drops its links and removal, and keeps `state`.
- `manager.detach(entity)` stops tracking it: a flush ignores it, and the next
  read of its key reaches the repository and answers a new entity. Detaching an
  entity the manager does not track fails with `EntityNotFoundError`.
- `manager.clear()` detaches every entity.
- `manager.reload(entity)` re-reads it by its whole key: what the repository
  answers becomes what is stored and `state`, and local changes, links and
  removal are dropped; it answers the same entity. When the record is gone, it
  answers `undefined` and stops tracking it. A new entity, or one the manager does
  not track, fails with `EntityNotFoundError`.

### Story: Retry a commit that failed

As an application developer who commits inside a database transaction, I want a
flush that throws to leave the unit of work as it was before it, so that when the
transaction rolls back I can retry the commit and every write is sent again.

Acceptance criteria:

- When a write fails, every entity keeps its pending changes — those written
  before the failure included — and a retried flush sends the same writes.
- A removed entity stays pending removal, and is deleted by the retry.
- A lazy record created before the failure is not tracked and its link stays
  pending: the retry creates it again and the field gets the id it answers then.
- `flushEntityManagers` is all or nothing in memory: when one manager's flush
  fails, the managers flushed before it keep their pending changes too.
- After a flush that succeeds, nothing is pending.

### Story: Link a record that does not exist yet

As an application developer, I can link a record that does not exist yet into a
foreign-key field, so that the record is created — and its id set on the field —
only when the entity linking it is written. DTO types stay plain.

Acceptance criteria:

- `lazy(value)` writes nothing and copies `value`. `entity.link(field, ref)`
  leaves `state` as it is until the flush, and makes the entity have changes.
- When the linking entity is flushed, the record is created first and the field
  holds its id; the created record is tracked by its manager as stored.
- A record no flushed entity links is never created.
- A record linked into several entities is created once; each gets the same id.
- Records linked into a linked record (`ref.link`) are created first; an array
  field takes ids and references mixed.
- A new entity linking a record is created with that record's id.
- A removed entity's links are not created.
- Links that form a cycle fail with `EntityReferenceError`.

### Story: One unit of work per scope

Acceptance criteria:

- `entityManagerToken(repositoryToken)` resolves one manager per repository
  token per scope, over that repository, and another in another scope.
- `flushEntityManagers(scope)` flushes every manager the scope built.

## Notes

- Non-goals: queries, relations, lazy loading, migrations, and transactions.
  Repositories do the reading and writing; the caller wraps
  `flushEntityManagers` in whatever transaction it uses.
