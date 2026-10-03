# @ts-ioc-container/entity-framework — guide for AI coding agents

A unit of work over plain DTOs for [`ts-ioc-container`](https://www.npmjs.com/package/ts-ioc-container):
an identity map per repository, change tracking by snapshot, and one flush for a
scope's changes. No query language and no ORM — reads and writes go through your
own repositories. This file ships inside the npm package, so it matches the
installed version. For the container itself, read `node_modules/ts-ioc-container/AGENTS.md` first.

## API

| Export                                | What it does                                                                                                                                                                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Entity<State>`                       | One tracked record. `state` is the DTO, changed in place (nested values too). `getDiff()` answers the fields that differ from what is stored; `patch(changes)` sets several fields at once; `getStored()`, `isNew`, `isRemoved`, `remove()`, `hasChanges()`. Extend it for domain behaviour |
| `EntityManager<TRepository>`          | The unit of work over one repository: `findById` / `findByIdOrFail` (identity map first, the repository once), `trackMany` / `track` (records read some other way), `create`, `remove`, `hasChanges`, `flush`                                                                               |
| `IRepository<State, E>`               | What a repository implements: `entityName`, optional `entityClass`, `findById(id, ...key)`, `create(state)`, `update(stored, diff)`, `delete(stored)`                                                                                                                                       |
| `repositoryToken(key)`                | A `SingleToken` for a repository, tagged so an `EntityManager` resolved with it finds it                                                                                                                                                                                                    |
| `entityManagerToken(repositoryToken)` | The token the `EntityManager` over that repository resolves by — one per repository token per scope                                                                                                                                                                                         |
| `flushEntityManagers(scope)`          | Flushes every `EntityManager` the scope built, in the order they were built — the commit. Opens no transaction                                                                                                                                                                              |
| `EntityNotFoundError`                 | `code: 'IOC_ENTITY_NOT_FOUND'`; missing record, or one removed in this unit of work                                                                                                                                                                                                         |
| `EntityIdentityError`                 | `code: 'IOC_ENTITY_IDENTITY'`; `create` for a tracked id, or a flushed entity whose `id` changed                                                                                                                                                                                            |

## Recipe

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
  async findById(id: string) {
    /* SELECT */ return undefined as OrderDto | undefined;
  }
  async create(order: OrderDto) {
    /* INSERT */ return order;
  }
  async update(stored: OrderDto, diff: Partial<OrderDto>) {
    /* UPDATE only diff */ return { ...stored, ...diff };
  }
  async delete(stored: OrderDto) {
    /* DELETE */
  }
}

const app = new Container({ tags: ['application'] })
  .addRegistration(R.fromClass(OrderRepository))
  // one unit of work per request scope
  .addRegistration(R.fromClass(EntityManager).when((s) => s.hasTag('request')));

const request = app.createScope({ tags: ['request'] });
const orders = entityManagerToken(IOrderRepositoryToken).resolve(request);

const order = await orders.findByIdOrFail('o-1'); // an Order
order.cancel();
order.state.lines.push({ sku: 'idle', quantity: 3 }); // nested changes are tracked too

await db.transaction(() => flushEntityManagers(request)); // update(stored, { status, lines })
request.dispose();
```

## Rules

- State is plain data: primitives, arrays, plain objects, `Date`. It is copied
  with `structuredClone`, so class instances inside a DTO come back as plain objects.
- Register `EntityManager` with a scope rule (`.when(...)`): without one it is
  shared by every scope that resolves it, and the identity map outlives the unit of work.
- `flush` writes in the order entities were first tracked, and
  `flushEntityManagers` flushes managers in the order the scope built them.
  When rows reference each other across repositories, let the database check
  foreign keys at commit (Postgres: `DEFERRABLE INITIALLY DEFERRED`).
- `update` receives the record as the unit of work read it, so a repository can
  refuse a write when the stored row no longer matches it (optimistic concurrency).
- The id is the identity-map key and cannot change; a removed id cannot be
  created again in the same unit of work.
