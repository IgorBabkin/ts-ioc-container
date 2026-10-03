# @ts-ioc-container/entity-framework

**A unit of work over plain DTOs** for
[`ts-ioc-container`](https://www.npmjs.com/package/ts-ioc-container). Read a
record, change it as a plain object, and every change made during a request is
written once, at its end:

```ts
const order = await orders.findByIdOrFail('o-1');
order.state.status = 'cancelled'; // plain DTO, changed in place
await db.transaction(() => flushEntityManagers(request)); // UPDATE orders SET status = ... WHERE id = 'o-1'
```

- **Identity map** — each record is read once per unit of work, and every read
  of its id answers the same entity.
- **Snapshot change tracking** — there is nothing to call when a field is set;
  a flush sends your repository only the fields that differ from what was read,
  nested values included.
- **Lazy records** — link a record that does not exist yet into a foreign-key
  field; it is created, and the field gets its id, only if the record holding
  it is written.
- **One unit of work per scope** — an entity manager is resolved per
  repository per container scope, so a request scope is a unit of work.

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
import { Entity, type IRepository, repositoryToken } from '@ts-ioc-container/entity-framework';
import { register, scope, singleton } from 'ts-ioc-container';

type OrderDto = { id: string; status: 'open' | 'cancelled'; lines: { sku: string; quantity: number }[] };

// Optional: extend Entity to give a record behaviour.
class Order extends Entity<OrderDto> {
  cancel(): void {
    this.state.status = 'cancelled';
  }
}

const IOrderRepositoryToken = repositoryToken<OrderRepository>('IOrderRepository');

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

### 2. Register an entity manager per request

```ts
import { Container, Registration as R } from 'ts-ioc-container';
import { EntityManager } from '@ts-ioc-container/entity-framework';

const app = new Container({ tags: ['application'] })
  .addRegistration(R.fromClass(OrderRepository))
  .addRegistration(R.fromClass(EntityManager).when((s) => s.hasTag('request')));
```

The scope rule matters: without it one entity manager — and so one identity
map — would be shared by every request.

### 3. Use it, then commit

```ts
import { entityManagerToken, flushEntityManagers } from '@ts-ioc-container/entity-framework';

const request = app.createScope({ tags: ['request'] });
try {
  const orders = entityManagerToken(IOrderRepositoryToken).resolve(request);

  const order = await orders.findByIdOrFail('o-1'); // an Order
  order.cancel();
  order.state.lines.push({ sku: 'idle', quantity: 3 }); // nested changes are tracked too

  await db.transaction(() => flushEntityManagers(request)); // update(stored, { status, lines })
} finally {
  request.dispose();
}
```

A commit is all or nothing in memory: what the repository answered becomes
what is stored only once every write succeeded. When one throws, every change,
removal and link is still pending, so after the transaction rolls back you can
run the same commit again:

```ts
await retry(() => db.transaction(() => flushEntityManagers(request)));
```

In a service, inject the manager instead of resolving it:

```ts
import { by, inject } from 'ts-ioc-container';

class OrderService {
  constructor(
    @inject(by(entityManagerToken(IOrderRepositoryToken))) private readonly orders: EntityManager<OrderRepository>,
  ) {}
}
```

## Working with entities

| You want to                       | Call                                                                        |
| --------------------------------- | --------------------------------------------------------------------------- |
| Read one record                   | `manager.findById(id)` (`undefined` when missing) / `findByIdOrFail(id)`    |
| Track records read some other way | `manager.trackMany(await manager.repository.findByCustomer('Ada'))`         |
| Change a record                   | `entity.state.field = value`, or `entity.patch({ ... })` for several fields |
| Create a record                   | `manager.create({ id, ... })` — written by the next flush                   |
| Delete a record                   | `manager.remove(entity)` — its id reads as missing from now on              |
| See what changed                  | `entity.getDiff()`, `entity.hasChanges()`, `manager.hasChanges()`           |
| Write everything                  | `flushEntityManagers(scope)`, or `manager.flush()` for one repository       |

State is plain data: primitives, arrays, plain objects and `Date`s are copied
and compared by value; any other object is kept as it is and compared by
identity, so assign a new instance to change one.

## Records keyed by more than their id

When a record is keyed by more than its id — a tenant's record, say — let
`findById` take the rest of the key and name a record's whole key with
`keyOf`, so the identity map tells the same id under two tenants apart:

```ts
class TariffRepository implements IRepository<TariffDto> {
  readonly entityName = 'Tariff';
  keyOf(tariff: TariffDto) {
    return [tariff.id, tariff.tenant] as const;
  }
  async findById(id: string, tenant: string): Promise<TariffDto | undefined> {
    /* SELECT ... WHERE id = $1 AND tenant = $2 */
  }
  // create, update and delete as usual
}

const tariff = await tariffs.findByIdOrFail('t-1', 'acme');
```

## Linking a record that does not exist yet

A foreign key can point at a record that is only created if, and when, the
entity holding it is written — inside the same commit. DTO types stay plain:
the field is typed for the id it will hold.

```ts
type PostDto = { id: string; title: string; commentId: string | null };

post.link('commentId', comments.lazy({ text: 'First!' })); // nothing written yet

await db.transaction(() => flushEntityManagers(request));
// comments.create({ text: 'First!' }) -> { id: 'c-1', ... }
// posts.update(stored, { commentId: 'c-1' })
post.state.commentId; // 'c-1'
```

A lazy record nothing written links is never created, and one linked several
times is created once. Lazy records can link each other
(`comments.lazy(value).link('authorId', authors.lazy(...))`), and an array field
takes ids and lazy records mixed (`post.link('tagIds', ['t-0', tags.lazy(...)])`).

## Errors

Every error has a stable `code` and a message that says how to fix it.

| Class                        | `code`                        | When                                                               |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `EntityNotFoundError`        | `IOC_ENTITY_NOT_FOUND`        | `findByIdOrFail` / `remove` for a record that is missing           |
| `EntityIdentityError`        | `IOC_ENTITY_IDENTITY`         | `create` for an id already tracked; an id changed                  |
| `EntityReferenceError`       | `IOC_ENTITY_REFERENCE`        | Lazy records linked into each other in a cycle                     |
| `EntityManagerArgumentError` | `IOC_ENTITY_MANAGER_ARGUMENT` | An `EntityManager` resolved without a token from `repositoryToken` |

## More

- [`AGENTS.md`](./AGENTS.md) — the full API table, recipes and a pitfalls table,
  written for AI coding agents and shipped in the package.
- [`specs/epics/entity-framework.md`](./specs/epics/entity-framework.md) — the
  behaviour, story by story, with its executable spec in `__tests__/specs/`.
