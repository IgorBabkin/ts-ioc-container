# @ts-ioc-container/entity-framework — guide for AI coding agents

A unit of work over plain DTOs for [`ts-ioc-container`](https://www.npmjs.com/package/ts-ioc-container):
an identity map per repository, change tracking by snapshot, and one commit for
a scope's changes, written in foreign-key order. No query language and no ORM —
reads and writes go through your own repositories. This file ships inside the
npm package, so it matches the installed version. For the container itself,
read `node_modules/ts-ioc-container/AGENTS.md` first. Design: ADR 0024 in the repository.

## Setup

```bash
npm install @ts-ioc-container/entity-framework ts-ioc-container reflect-metadata
```

`tsconfig.json` needs `"experimentalDecorators": true` and `"emitDecoratorMetadata": true`,
and the entrypoint must `import 'reflect-metadata'` first.

## API

| Export                                                  | What it does                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UnitOfWork`, `IUnitOfWorkToken`                        | The unit of work: register it per request. `of(repositoryToken)` answers that repository's `EntityManager`; `commit()` writes every change in foreign-key order and answers them; `getChanges()` / `hasChanges()` say what it would write; `committed` emits what was written     |
| `managerOf(repositoryToken)`                            | `@inject(managerOf(IOrderRepositoryToken))` — injects the manager from the scope's unit of work                                                                                                                                                                                   |
| `EntityManager<TRepository>`                            | One repository's identity map: `findById` / `findByIdOrFail` / `findByIds` (map first, repository once, concurrent reads shared), `track` / `trackMany`, `create` (caller's id), `add` (reserved id), `remove`, `detach` / `clear`, `reload`, `getTracked`, `getChanges`, `flush` |
| `Entity<State>`                                         | One tracked record. `state` is the DTO — change it in place, nested values too. `getDiff()`, `patch(changes)`, `revert()`, `getStored()`, `isNew`, `isRemoved`, `hasChanges()`. Extend it for domain behaviour                                                                    |
| `IRepository<State, E, Key>`                            | What a repository implements: `entityName`, `findById(key)`, `create(record)`, `update(stored, diff)`, `delete(stored)`; optional `entityClass`, `references`, `findByIds(keys)`, `prepare(value)`; `keyOf(record)` — required when `Key` is more than the id                     |
| `Change`                                                | One write: `{ type: 'create', record }`, `{ type: 'update', stored, diff }` or `{ type: 'delete', stored }`, each with its `entity` and `repository`                                                                                                                              |
| `IIdGenerator<Id>`, `uuidV7Ids()`, `pooled(size)`       | The id strategy: `next()` reserves an id before the insert. `uuidV7Ids()` makes time-ordered UUIDs; `pooled(size)` decorates a sequence generator for hi/lo blocks                                                                                                                |
| `preparing(...advices)`, `withId(idsToken)`, `Advice`   | AOP for new records: `decorate(preparing(withId(IOrderIdsToken)))` where the repository is registered gives it the `prepare` that `add` calls                                                                                                                                     |
| `StateOf`, `EntityOf`, `KeyOf`, `NewOf`, `RequireKeyOf` | What a repository stores, answers, is read by, and `add` takes; `RequireKeyOf` is the compile-time check that a repository keyed by more than its id has `keyOf`                                                                                                                  |

## Recipes

### Repository, entity, and one unit of work per request

```ts
import 'reflect-metadata';
import { Container, register, Registration as R, scope, singleton, SingleToken } from 'ts-ioc-container';
import { Entity, type IRepository, IUnitOfWorkToken, UnitOfWork } from '@ts-ioc-container/entity-framework';

type OrderDto = { id: string; status: 'open' | 'cancelled'; lines: { sku: string; quantity: number }[] };

class Order extends Entity<OrderDto> {
  cancel(): void {
    this.state.status = 'cancelled';
  }
}

const IOrderRepositoryToken = new SingleToken<OrderRepository>('IOrderRepository');

@register(IOrderRepositoryToken, scope((s) => s.hasTag('application')), singleton())
class OrderRepository implements IRepository<OrderDto, Order> {
  readonly entityName = 'Order';
  readonly entityClass = Order;
  async findById(id: string): Promise<OrderDto | undefined> {
    /* SELECT */
  }
  async create(order: OrderDto): Promise<OrderDto> {
    /* INSERT, answer the row */
  }
  async update(stored: OrderDto, diff: Partial<OrderDto>): Promise<OrderDto> {
    /* UPDATE only diff */
  }
  async delete(stored: OrderDto): Promise<void> {
    /* DELETE */
  }
}

const app = new Container({ tags: ['application'] })
  .addRegistration(R.fromClass(OrderRepository))
  .addRegistration(R.fromClass(UnitOfWork).when((s) => s.hasTag('request'))); // one unit of work per request

const request = app.createScope({ tags: ['request'] });
const uow = IUnitOfWorkToken.resolve(request);
const orders = uow.of(IOrderRepositoryToken);

const order = await orders.findByIdOrFail('o-1'); // an Order
order.cancel();
order.state.lines.push({ sku: 'idle', quantity: 3 }); // nested changes are tracked too

await db.transaction(() => uow.commit()); // update(stored, { status, lines })
request.dispose();
```

### Inject an entity manager

```ts
@register(IOrderServiceToken, scope((s) => s.hasTag('request')), singleton())
class OrderService {
  constructor(@inject(managerOf(IOrderRepositoryToken)) private readonly orders: EntityManager<OrderRepository>) {}

  async cancel(id: string): Promise<OrderDto> {
    const order = await this.orders.findByIdOrFail(id);
    order.cancel();
    return order.state; // written when the request commits
  }
}
```

### Create, track a list, remove

```ts
orders.create({ id: 'o-2', status: 'open', lines: [] }); // INSERT at commit
for (const order of orders.trackMany(await orders.repository.findByCustomer('Ada'))) order.cancel();
orders.remove(await orders.findByIdOrFail('o-3')); // DELETE at commit
```

### Foreign keys: declare references, the commit orders the writes

```ts
class PostRepository implements IRepository<PostDto> {
  readonly entityName = 'Post';
  readonly references = { authorId: IAuthorRepositoryToken, tagIds: ITagRepositoryToken }; // one id, or an array
  /* findById, create, update, delete */
}

const author = await authors.add({ name: 'Grace' }); // id reserved now
posts.create({ id: 'p-1', authorId: author.id, tagIds: [] }); // a plain assignment
await db.transaction(() => uow.commit()); // INSERT author, then INSERT post
```

Creates and updates go first, each after the new records it references —
across repositories and within one (a reply after its parent). Deletes go
last, each before the deleted records it references. Otherwise records keep the
order they were first tracked in.

### Add a record whose id is reserved before it is written

Reserve the id **before** the insert (a sequence, or a client-side UUID), so a
new record has its id the moment it is added. The id strategy is a class, the
container gives it its lifetime, and the advice that sets the id is woven into
the repository where it is registered.

```ts
import { decorate, register, scope, singleton, SingleToken } from 'ts-ioc-container';
import { type IIdGenerator, pooled, preparing, uuidV7Ids, withId } from '@ts-ioc-container/entity-framework';

const IOrderIdsToken = new SingleToken<IIdGenerator<string>>('IOrderIds');

@register(IOrderIdsToken, scope((s) => s.hasTag('application')), singleton())
class OrderIds implements IIdGenerator<string> {
  private readonly uuids = uuidV7Ids();
  next() {
    return this.uuids.next();
  }
}
// or a database sequence, one round trip per 50 ids:
// @register(IOrderIdsToken, scope(...), decorate(pooled(50)), singleton())
// class OrderIds implements IIdGenerator<number> { next() { return db.one(`SELECT nextval('order_blocks')`); } }

@register(
  IOrderRepositoryToken,
  scope((s) => s.hasTag('application')),
  decorate(preparing(withId(IOrderIdsToken))),
  singleton(),
)
class OrderRepository implements IRepository<OrderDto, Order> {
  /* findById / create / update / delete — no id logic */
}

const order = await orders.add({ status: 'open', lines: [] }); // order.id is set, nothing written yet
```

More advice composes in the same `preparing(...)`, in order — a tenant, an
audit stamp: `const withCreatedAt: Advice = (scope) => (value) => ({ ...value, createdAt: IClockToken.resolve(scope).now() })`.
`add` takes the record without its id; when other advice fills more fields,
declare what `prepare` takes: `declare readonly prepare: (order: NewOrder) => Promise<OrderDto>;`.

### A record keyed by more than its id

```ts
type TariffKey = { id: string; tenant: string };

class TariffRepository implements IRepository<TariffDto, Entity<TariffDto>, TariffKey> {
  readonly entityName = 'Tariff';
  keyOf({ id, tenant }: TariffDto): TariffKey {
    return { id, tenant }; // required: the key is more than the id
  }
  async findById({ id, tenant }: TariffKey): Promise<TariffDto | undefined> {
    /* SELECT ... WHERE id = $1 AND tenant = $2 */
  }
  // create, update, delete as usual: the key is on the record
}

const acme = await tariffs.findByIdOrFail({ id: 't-1', tenant: 'acme' });
const globex = await tariffs.findByIdOrFail({ id: 't-1', tenant: 'globex' }); // another entity
```

### Read many records at once

```ts
// The repository can read many keys in one query; optional.
async findByIds(ids: string[]): Promise<OrderDto[]> { /* SELECT ... WHERE id = ANY($1) */ }

const found = await orders.findByIds(['o-1', 'o-2', 'o-3']); // tracked ones from the map, the rest in one read
```

Answers in the order asked, each key once, leaving out missing and removed
ones. Concurrent reads of one key share one call.

### What will be written, and what was

```ts
for (const change of uow.getChanges()) audit.log(change.type, change.repository.entityName, change.entity.id);

uow.committed.subscribe((changes) => {
  for (const change of changes)
    if (change.type === 'update' && 'status' in change.diff) events.emit('OrderStatusChanged', change.entity);
});
```

`getChanges()` writes nothing and is in commit order; `committed` fires only
after a commit that succeeded.

### Discard, detach, reload

```ts
order.revert(); // state back to what is stored (same object), removal undone
orders.detach(order); // stop tracking it; the next read of its key reaches the repository
orders.clear(); // stop tracking everything: keep a long batch's identity map small
await orders.reload(order); // re-read after a concurrency conflict; undefined when the row is gone
```

## Pitfalls

| Symptom                                                     | Cause                                                                     | Fix                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A repository singleton differs per request                  | A registration without `scope(...)` is copied into every child scope      | `@register(token, scope((s) => s.hasTag('application')), singleton())`                |
| The app scope has a unit of work of its own                 | `UnitOfWork` registered without a scope rule                              | `R.fromClass(UnitOfWork).when((s) => s.hasTag('request'))`                            |
| Nothing is written                                          | `commit()` never ran, or ran on another scope's unit of work              | `await db.transaction(() => uow.commit())` after the use case                         |
| A change made right after reading is not written            | The record was read from the repository directly, so it is untracked      | Read through the manager: `findByIdOrFail`, or `trackMany(repository.list())`         |
| A change inside a class instance in the DTO is not written  | Only plain data is copied and compared; other objects compare by identity | Keep state plain (objects, arrays, dates), or assign a new instance                   |
| Foreign-key violation on commit                             | The repository does not declare that field in `references`                | `readonly references = { authorId: IAuthorRepositoryToken }`                          |
| `EntityReferenceError: ... reference each other in a cycle` | New (or deleted) records reference each other                             | Make one foreign key deferrable, or set one side after the commit                     |
| Unique-key violation replacing a row in one commit          | Deletes go after creates                                                  | Defer the unique constraint, or update the row instead of delete + create             |
| `EntityIdentityError`: records cannot be added              | `add` on a repository with no `prepare`                                   | Register it with `decorate(preparing(withId(IMyIdsToken)))`, or `create({ id, ... })` |
| Ids from `pooled` collide with other rows                   | The sequence behind `pooled(size)` also serves plain ids                  | Give the pool a sequence of its own: its numbers are blocks, not ids                  |
| One query per id when loading a list                        | `findById` in a loop                                                      | `findByIds(keys)`, and give the repository `findByIds` for one `IN (...)` query       |
| A long batch keeps growing in memory                        | Every record read stays tracked until the unit of work ends               | `flush()` (or `commit()`) then `clear()` per chunk                                    |
| `EntityIdentityError` on `create`                           | The key is tracked already, or was removed in this unit of work           | Change the tracked entity instead of creating it again                                |

## Errors

Every error has a stable `code` and a message that says how to fix it.

| Class                  | `code`                 | When                                                                                                                                                      |
| ---------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EntityNotFoundError`  | `IOC_ENTITY_NOT_FOUND` | `findByIdOrFail` / `remove` / `detach` / `reload` for a record that is missing, removed, not tracked, or (`reload`) new. Has `entityName`, `key` and `id` |
| `EntityIdentityError`  | `IOC_ENTITY_IDENTITY`  | `create` (or `add`) for a tracked or removed key; `add` without `prepare`; `patch` to another id; a commit of an entity whose id or key was reassigned    |
| `EntityReferenceError` | `IOC_ENTITY_REFERENCE` | New records, or deleted ones, that reference each other in a cycle — before anything is written                                                           |

## Removed APIs

| Removed by ADR 0024                                                                 | Use instead                                                                               |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `repositoryToken(key)`, `isRepositoryToken`                                         | Any token: `new SingleToken<OrderRepository>('IOrderRepository')`                         |
| `entityManagerToken(token)`, `IEntityManagerToken`                                  | `IUnitOfWorkToken.resolve(scope).of(token)`, or `@inject(managerOf(token))`               |
| `R.fromClass(EntityManager)` registration                                           | `R.fromClass(UnitOfWork).when((s) => s.hasTag('request'))`                                |
| `flushEntityManagers(scope)`, `isEntityManager`, `IEntityManager`                   | `uow.commit()`                                                                            |
| `EntityManagerArgumentError`                                                        | — (nothing resolves managers by argument any more)                                        |
| `manager.lazy(value)`, `entity.link(field, ref)`, `LazyRef`, `ILazyRef`, `Linkable` | `await manager.add(value)`, then assign `entity.id`; declare `references` for write order |
| `IRepository`'s `Value` parameter, `ValueOf`                                        | `create(record)` takes the whole record                                                   |
| `findById(id, ...rest)`, `RecordKey`, `RestOfKey`                                   | `IRepository<State, E, Key>` with `findById(key)` and `keyOf(record): Key`                |

## Rules

- State is plain data: primitives, arrays, plain objects, `Date`. Those are
  copied; any other object is kept as the same object and compared by identity.
- `update` receives the record as the unit of work read it, so a repository can
  refuse a write when the stored row no longer matches it (optimistic concurrency).
- The key — the id, or what `keyOf` answers — is the identity-map key and cannot change.
- A commit is all or nothing in memory: what the repositories answered becomes
  what is stored only once every write succeeded. When one throws, every entity
  and removal is still pending, so after the transaction rolls back the same
  commit can be run again.
