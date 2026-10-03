# @ts-ioc-container/entity-framework — guide for AI coding agents

A unit of work over plain DTOs for [`ts-ioc-container`](https://www.npmjs.com/package/ts-ioc-container):
an identity map per repository, change tracking by snapshot, and one flush for a
scope's changes. No query language and no ORM — reads and writes go through your
own repositories. This file ships inside the npm package, so it matches the
installed version. For the container itself, read `node_modules/ts-ioc-container/AGENTS.md` first.

## Setup

```bash
npm install @ts-ioc-container/entity-framework ts-ioc-container reflect-metadata
```

`tsconfig.json` needs `"experimentalDecorators": true` and `"emitDecoratorMetadata": true`,
and the entrypoint must `import 'reflect-metadata'` first.

## API

| Export                                                        | What it does                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Entity<State>`                                               | One tracked record. `state` is the DTO — change it in place, nested values too. `getDiff()` answers the fields that differ from what is stored; `patch(changes)` sets several fields; `link(field, lazyRef)` sets a field to the id of a record created at flush; `getStored()`, `isNew`, `isRemoved`, `hasChanges()`. Extend it for domain behaviour |
| `EntityManager<TRepository>`                                  | The unit of work over one repository: `findById` / `findByIdOrFail` (identity map first, the repository once), `track` / `trackMany` (records read some other way), `create`, `lazy`, `remove`, `hasChanges`, `flush`                                                                                                                                 |
| `IRepository<State, E, Value>`                                | What a repository implements: `entityName`, optional `entityClass`, optional `keyOf(record)` (the whole key, when more than the id), `findById(id, ...key)`, `create(value)`, `update(stored, diff)`, `delete(stored)`. `Value` is what `create` takes (default `State`; the state without its id when the database mints ids)                        |
| `LazyRef<E, Value>`                                           | `manager.lazy(value)`: a record that does not exist yet. `entity.link(field, ref)` puts it where its id is wanted; `ref.link(field, other)` nests one inside another                                                                                                                                                                                  |
| `repositoryToken(key)`                                        | A `SingleToken` for a repository, tagged so an `EntityManager` resolved with it finds it                                                                                                                                                                                                                                                              |
| `entityManagerToken(repositoryToken)`                         | The token the `EntityManager` over that repository resolves by — one per repository token per scope                                                                                                                                                                                                                                                   |
| `flushEntityManagers(scope)`                                  | Flushes every `EntityManager` the scope built, in the order they were built — the commit. Opens no transaction; when it throws nothing changes in memory, so it can be retried                                                                                                                                                                        |
| `IEntityManagerToken`, `isEntityManager`, `isRepositoryToken` | Lower-level pieces of the above; rarely needed directly                                                                                                                                                                                                                                                                                               |

## Recipes

### Repository, entity, and one unit of work per request

```ts
import 'reflect-metadata';
import { Container, register, Registration as R, scope, singleton } from 'ts-ioc-container';
import {
  Entity,
  EntityManager,
  entityManagerToken,
  flushEntityManagers,
  type IRepository,
  repositoryToken,
} from '@ts-ioc-container/entity-framework';

type OrderDto = { id: string; status: 'open' | 'cancelled'; lines: { sku: string; quantity: number }[] };

class Order extends Entity<OrderDto> {
  cancel(): void {
    this.state.status = 'cancelled';
  }
}

const IOrderRepositoryToken = repositoryToken<OrderRepository>('IOrderRepository');

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
  .addRegistration(R.fromClass(EntityManager).when((s) => s.hasTag('request'))); // one unit of work per request

const request = app.createScope({ tags: ['request'] });
const orders = entityManagerToken(IOrderRepositoryToken).resolve(request);

const order = await orders.findByIdOrFail('o-1'); // an Order
order.cancel();
order.state.lines.push({ sku: 'idle', quantity: 3 }); // nested changes are tracked too

await db.transaction(() => flushEntityManagers(request)); // update(stored, { status, lines })
request.dispose();
```

### Inject an entity manager

```ts
@register(IOrderServiceToken, scope((s) => s.hasTag('request')), singleton())
class OrderService {
  constructor(
    @inject(by(entityManagerToken(IOrderRepositoryToken))) private readonly orders: EntityManager<OrderRepository>,
  ) {}

  async cancel(id: string): Promise<OrderDto> {
    const order = await this.orders.findByIdOrFail(id);
    order.cancel();
    return order.state; // written when the request commits
  }
}
```

### Create, track a list, remove

```ts
const created = orders.create({ id: 'o-2', status: 'open', lines: [] }); // INSERT at flush
for (const order of orders.trackMany(await orders.repository.findByCustomer('Ada'))) order.cancel();
orders.remove(await orders.findByIdOrFail('o-3')); // DELETE at flush
```

### A record keyed by more than its id

A tenant's record, say: `findById` takes the rest of the key after the id, and
`keyOf` names a record's whole key in the same order. The identity map keys
entities by it, so the same id under two tenants is two records.

```ts
class TariffRepository implements IRepository<TariffDto> {
  readonly entityName = 'Tariff';
  keyOf(tariff: TariffDto) {
    return [tariff.id, tariff.tenant] as const;
  }
  async findById(id: string, tenant: string): Promise<TariffDto | undefined> {
    /* SELECT ... WHERE id = $1 AND tenant = $2 */
  }
  // create, update, delete as usual: the key is on the record
}

const acme = await tariffs.findByIdOrFail('t-1', 'acme');
const globex = await tariffs.findByIdOrFail('t-1', 'globex'); // another entity
```

### Link a record that does not exist yet

A foreign key can point at a record that is only created if, and when, the
entity linking it is written — at the commit, inside the same transaction. DTO
types stay plain: the field is typed for the id it will hold.

```ts
type PostDto = { id: string; title: string; commentId: string | null };

post.link('commentId', comments.lazy({ text: 'First!' })); // nothing written yet

await db.transaction(() => flushEntityManagers(request));
// comments.create({ text: 'First!' }) -> { id: 'c-1', ... }
// posts.update(stored, { commentId: 'c-1' })
post.state.commentId; // 'c-1'
```

A record nothing flushed links is never created; one linked into several
entities is created once; records linked into a linked record are created
first (`comments.lazy(value).link('authorId', authors.lazy(...))`); an array
field takes ids and references mixed (`post.link('tagIds', ['t-0', tags.lazy(...)])`).
The created record is tracked by its own manager as stored. `lazy` copies its
value when called.

## Pitfalls

| Symptom                                                          | Cause                                                                     | Fix                                                                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `EntityManagerArgumentError`                                     | Resolved `IEntityManagerToken` on its own, or with a plain `SingleToken`  | `entityManagerToken(repositoryToken<R>('IR')).resolve(scope)`                                                             |
| Changes from one request show up in another                      | `EntityManager` registered without a scope rule is shared by every scope  | `R.fromClass(EntityManager).when((s) => s.hasTag('request'))`                                                             |
| A repository singleton differs per request                       | A registration without `scope(...)` is copied into every child scope      | `@register(token, scope((s) => s.hasTag('application')), singleton())`                                                    |
| Nothing is written                                               | `flush` / `flushEntityManagers` never ran, or ran on another scope        | Run `flushEntityManagers(requestScope)` after the use case, inside a transaction                                          |
| A change made right after reading is not written                 | The record was read from the repository directly, so it is untracked      | Read through the manager: `findByIdOrFail`, or `trackMany(repository.list())`                                             |
| A change inside a class instance in the DTO is not written       | Only plain data is copied and compared; other objects compare by identity | Keep state plain (objects, arrays, dates), or assign a new instance                                                       |
| Foreign-key violation when related rows are written in one flush | Managers flush in the order the scope built them                          | Let the database check foreign keys at commit (Postgres: `DEFERRABLE INITIALLY DEFERRED`), or `link` the dependent record |
| TS error on `link(field, ref)`                                   | The field cannot hold the referenced record's id type                     | Link a field typed for that id (`string`, `string \| null`, `string[]`)                                                   |
| `EntityIdentityError`: read by more than its id                  | `findById(id, tenant)` on a repository without `keyOf`                    | Add `keyOf(record)` answering `[record.id, record.tenant]` — the arguments `findById` takes                               |
| `EntityIdentityError` on `create`                                | The id is tracked already, or was removed in this unit of work            | Change the tracked entity instead of creating it again                                                                    |

## Errors

Every error has a stable `code` and a message that says how to fix it.

| Class                        | `code`                        | When                                                                                                                                                                |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EntityNotFoundError`        | `IOC_ENTITY_NOT_FOUND`        | `findByIdOrFail` / `remove` for a record the repository does not have, or one removed in this unit of work. Has `entityName`, `id` and `key` (the whole key)        |
| `EntityIdentityError`        | `IOC_ENTITY_IDENTITY`         | `create` for a tracked or removed id; `patch` to another id; flushing an entity whose `state.id` or key was reassigned; reading by more than the id without `keyOf` |
| `EntityReferenceError`       | `IOC_ENTITY_REFERENCE`        | Lazy records linked into each other in a cycle                                                                                                                      |
| `EntityManagerArgumentError` | `IOC_ENTITY_MANAGER_ARGUMENT` | An `EntityManager` resolved without a repository token                                                                                                              |

## Rules

- State is plain data: primitives, arrays, plain objects, `Date`. Those are
  copied; any other object is kept as the same object and compared by identity.
- `update` receives the record as the unit of work read it, so a repository can
  refuse a write when the stored row no longer matches it (optimistic concurrency).
- The key — the id, or what `keyOf` answers — is the identity-map key and cannot change.
- A flush is all or nothing in memory: what the repository answered becomes
  what is stored only once every write — across every manager
  `flushEntityManagers` flushes — succeeded. When one throws, every entity,
  removal and link is still pending, so after the transaction rolls back the
  same commit can be retried. Lazy records the failed flush created are created
  again by the retry.
