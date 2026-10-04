# @ts-ioc-container/entity-framework

**A unit of work over plain DTOs** for
[`ts-ioc-container`](https://www.npmjs.com/package/ts-ioc-container). Read a
record, change it as a plain object, and every change made during a request is
written once, at its end:

```ts
const order = await uow.of(IOrderRepositoryToken).findByIdOrFail('o-1');
order.state.status = 'cancelled'; // plain DTO, changed in place
await db.transaction(() => uow.commit()); // UPDATE orders SET status = ... WHERE id = 'o-1'
```

- **Identity map** — each record is read once per unit of work, and every read
  of its key answers the same entity.
- **Snapshot change tracking** — there is nothing to call when a field is set;
  a commit sends your repository only the fields that differ from what was read,
  nested values included.
- **Foreign-key order** — declare which fields reference which repository, and
  a commit inserts parents before children and deletes children before parents.
- **One unit of work per scope** — register a `UnitOfWork` per request, and the
  request scope is the unit of work: what it reads through, what it commits, and
  what tells you what was written.

It is **not an ORM**: there is no query language, no relation mapping, no
migrations and no transactions. Reads and writes go through repositories you
write against your own database client, and you wrap the commit in whatever
transaction that client uses.

## Install

```bash
npm install @ts-ioc-container/entity-framework ts-ioc-container reflect-metadata
```

`tsconfig.json` needs `"experimentalDecorators": true` and
`"emitDecoratorMetadata": true`, and your entrypoint must
`import 'reflect-metadata'` first. `ts-ioc-container` is a peer dependency.

## Quick start

### 1. A DTO, an entity, and a repository

```ts
import { Entity, type IRepository } from '@ts-ioc-container/entity-framework';
import { register, scope, singleton, SingleToken } from 'ts-ioc-container';

type OrderDto = { id: string; status: 'open' | 'cancelled'; lines: { sku: string; quantity: number }[] };

// Optional: extend Entity to give a record behaviour.
class Order extends Entity<OrderDto> {
  cancel(): void {
    this.state.status = 'cancelled';
  }
}

const IOrderRepositoryToken = new SingleToken<OrderRepository>('IOrderRepository');

@register(IOrderRepositoryToken, scope((s) => s.hasTag('application')), singleton())
class OrderRepository implements IRepository<OrderDto, Order> {
  readonly entityName = 'Order'; // used in error messages
  readonly entityClass = Order; // what the entity manager builds; Entity when left out

  async findById(id: string): Promise<OrderDto | undefined> {
    /* SELECT ... WHERE id = $1 */
  }
  async create(order: OrderDto): Promise<OrderDto> {
    /* INSERT ... RETURNING * */
  }
  async update(stored: OrderDto, diff: Partial<OrderDto>): Promise<OrderDto> {
    /* UPDATE only the columns in diff ... RETURNING * */
  }
  async delete(stored: OrderDto): Promise<void> {
    /* DELETE ... WHERE id = $1 */
  }
}
```

### 2. Register a unit of work per request

```ts
import { Container, Registration as R } from 'ts-ioc-container';
import { UnitOfWork } from '@ts-ioc-container/entity-framework';

const app = new Container({ tags: ['application'] })
  .addRegistration(R.fromClass(OrderRepository))
  .addRegistration(R.fromClass(UnitOfWork).when((s) => s.hasTag('request')));
```

### 3. Use it, then commit

```ts
import { IUnitOfWorkToken } from '@ts-ioc-container/entity-framework';

const request = app.createScope({ tags: ['request'] });
try {
  const uow = IUnitOfWorkToken.resolve(request);
  const orders = uow.of(IOrderRepositoryToken);

  const order = await orders.findByIdOrFail('o-1'); // an Order
  order.cancel();
  order.state.lines.push({ sku: 'idle', quantity: 3 }); // nested changes are tracked too

  await db.transaction(() => uow.commit()); // update(stored, { status, lines })
} finally {
  request.dispose();
}
```

A commit is all or nothing in memory: what the repository answered becomes
what is stored only once every write succeeded. When one throws, every change
and removal is still pending, so after the transaction rolls back you can run
the same commit again:

```ts
await retry(() => db.transaction(() => uow.commit()));
```

In a service, inject the manager instead of resolving it:

```ts
import { inject } from 'ts-ioc-container';
import { type EntityManager, managerOf } from '@ts-ioc-container/entity-framework';

class OrderService {
  constructor(@inject(managerOf(IOrderRepositoryToken)) private readonly orders: EntityManager<OrderRepository>) {}
}
```

## Working with entities

| You want to                       | Call                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| Read one record                   | `manager.findById(key)` (`undefined` when missing) / `findByIdOrFail(key)`             |
| Read many records                 | `manager.findByIds(keys)` — one `findByIds` call for the untracked ones                |
| Track records read some other way | `manager.trackMany(await manager.repository.findByCustomer('Ada'))`                    |
| Change a record                   | `entity.state.field = value`, or `entity.patch({ ... })` for several fields            |
| Create a record                   | `manager.create({ id, ... })`, or `await manager.add({ ... })` to have its id reserved |
| Delete a record                   | `manager.remove(entity)` — its key reads as missing from now on                        |
| Discard changes                   | `entity.revert()` — `state` goes back to what is stored                                |
| Stop tracking                     | `manager.detach(entity)`, or `manager.clear()` for all                                 |
| Re-read a record                  | `await manager.reload(entity)` — after a concurrency conflict, say                     |
| See what will be written          | `uow.getChanges()` — creates, updates with their diffs, deletes, in commit order       |
| React to what was written         | `uow.committed.subscribe((changes) => ...)` — domain events, audit logs                |
| Write everything                  | `await uow.commit()`, or `manager.flush()` for one repository on its own               |

State is plain data: primitives, arrays, plain objects and `Date`s are copied
and compared by value; any other object is kept as it is and compared by
identity, so assign a new instance to change one.

## Foreign keys

Declare which fields hold ids of which repository's records — one id, or an
array of ids — and a commit writes in an order your foreign keys accept:
creates and updates first, each after the new records it references; then
deletes, each before the deleted records it references.

```ts
class PostRepository implements IRepository<PostDto> {
  readonly entityName = 'Post';
  readonly references = { authorId: IAuthorRepositoryToken, tagIds: ITagRepositoryToken };
  /* findById, create, update, delete */
}

posts.create({ id: 'p-1', authorId: 'a-1', tagIds: [] });
authors.create({ id: 'a-1', name: 'Grace' });
await uow.commit(); // INSERT author a-1, then INSERT post p-1
```

## Ids from a sequence or a UUID

To let the database side choose ids, reserve them **before** the insert — a
sequence, or a time-ordered UUID made in the process — so a new record has its
id the moment it is added and can be referenced before the commit. How ids are
made is a strategy you register; it is woven into the repository where the
repository is registered, so neither the repository class nor the entity
manager has id logic:

```ts
import { decorate, register, scope, singleton, SingleToken } from 'ts-ioc-container';
import { type IIdGenerator, preparing, uuidV7Ids, withId } from '@ts-ioc-container/entity-framework';

const IOrderIdsToken = new SingleToken<IIdGenerator<string>>('IOrderIds');

@register(IOrderIdsToken, scope((s) => s.hasTag('application')), singleton())
class OrderIds implements IIdGenerator<string> {
  private readonly uuids = uuidV7Ids();
  next() {
    return this.uuids.next();
  }
}

@register(
  IOrderRepositoryToken,
  scope((s) => s.hasTag('application')),
  decorate(preparing(withId(IOrderIdsToken))),
  singleton(),
)
class OrderRepository implements IRepository<OrderDto, Order> {
  /* findById, create, update, delete */
}

const order = await orders.add({ status: 'open', lines: [] }); // order.id is already set
```

For a database sequence, decorate the generator with `pooled(size)` to fetch a
block of ids per round trip (hi/lo). Further advice — a tenant, a `createdAt`
— composes in the same `preparing(...)`, in order.

## Records keyed by more than their id

When a record is keyed by more than its id — a tenant's record, say — make the
key a type parameter and say how to key a record. The compiler then checks the
key at every read, and the identity map tells the same id under two tenants apart:

```ts
type TariffKey = { id: string; tenant: string };

class TariffRepository implements IRepository<TariffDto, Entity<TariffDto>, TariffKey> {
  readonly entityName = 'Tariff';
  keyOf({ id, tenant }: TariffDto): TariffKey {
    return { id, tenant };
  }
  async findById({ id, tenant }: TariffKey): Promise<TariffDto | undefined> {
    /* SELECT ... WHERE id = $1 AND tenant = $2 */
  }
  // create, update and delete as usual
}

const tariff = await tariffs.findByIdOrFail({ id: 't-1', tenant: 'acme' });
```

## Errors

Every error has a stable `code` and a message that says how to fix it.

| Class                  | `code`                 | When                                                                   |
| ---------------------- | ---------------------- | ---------------------------------------------------------------------- |
| `EntityNotFoundError`  | `IOC_ENTITY_NOT_FOUND` | `findByIdOrFail` / `remove` / `reload` for a record that is missing    |
| `EntityIdentityError`  | `IOC_ENTITY_IDENTITY`  | `create` for a key already tracked; a key changed; `add` without an id |
| `EntityReferenceError` | `IOC_ENTITY_REFERENCE` | New or deleted records that reference each other in a cycle            |

## More

- [`AGENTS.md`](./AGENTS.md) — the full API table, recipes, a pitfalls table
  and the removed APIs, written for AI coding agents and shipped in the package.
- [ADR 0024](../../adr/0024-entity-framework-unit-of-work.md) — why the unit of
  work, reference-ordered writes and typed keys look the way they do.
- [`specs/epics/entity-framework.md`](./specs/epics/entity-framework.md) — the
  behaviour, story by story, with its executable spec in `__tests__/specs/`.
