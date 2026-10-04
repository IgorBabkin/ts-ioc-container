import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Container,
  decorate,
  inject,
  register,
  Registration as R,
  scope,
  singleton,
  SingleToken,
} from 'ts-ioc-container';

import {
  Entity,
  type EntityManager,
  type IIdGenerator,
  type IRepository,
  IUnitOfWorkToken,
  managerOf,
  preparing,
  UnitOfWork,
  uuidV7Ids,
  withId,
} from '../../lib';

/**
 * The README's quick start and examples, kept executable so the page people
 * read on npm cannot drift from the API.
 */
describe('README', () => {
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
    readonly rows = new Map<string, OrderDto>([['o-1', { id: 'o-1', status: 'open', lines: [] }]]);
    readonly writes: string[] = [];

    async findById(id: string): Promise<OrderDto | undefined> {
      return structuredClone(this.rows.get(id));
    }

    async create(order: OrderDto): Promise<OrderDto> {
      this.writes.push(`create ${order.id}`);
      this.rows.set(order.id, structuredClone(order));
      return order;
    }

    async update(stored: OrderDto, diff: Partial<OrderDto>): Promise<OrderDto> {
      this.writes.push(`update ${stored.id} ${Object.keys(diff).join(',')}`);
      const row = { ...stored, ...diff };
      this.rows.set(stored.id, structuredClone(row));
      return row;
    }

    async delete(stored: OrderDto): Promise<void> {
      this.writes.push(`delete ${stored.id}`);
      this.rows.delete(stored.id);
    }
  }

  const db = { transaction: async <T>(fn: () => Promise<T>): Promise<T> => fn() };

  const createApp = () =>
    new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(OrderRepository))
      .addRegistration(R.fromClass(UnitOfWork).when((s) => s.hasTag('request')));

  it('Quick start: read, change in place, commit', async () => {
    const app = createApp();
    const request = app.createScope({ tags: ['request'] });
    let order: Order;
    try {
      const uow = IUnitOfWorkToken.resolve(request);
      const orders = uow.of(IOrderRepositoryToken);

      order = await orders.findByIdOrFail('o-1');
      order.cancel();
      order.state.lines.push({ sku: 'idle', quantity: 3 });

      await db.transaction(() => uow.commit());
    } finally {
      request.dispose();
    }

    expect(order).toBeInstanceOf(Order);
    expect(IOrderRepositoryToken.resolve(app).writes).toEqual(['update o-1 status,lines']);
  });

  it('Quick start: a commit that failed can be run again', async () => {
    const app = createApp();
    const repository = IOrderRepositoryToken.resolve(app);
    const uow = IUnitOfWorkToken.resolve(app.createScope({ tags: ['request'] }));
    (await uow.of(IOrderRepositoryToken).findByIdOrFail('o-1')).cancel();
    let attempts = 0;
    const update = repository.update.bind(repository);
    repository.update = async (stored, diff) => {
      if (++attempts === 1) throw new Error('serialization failure');
      return update(stored, diff);
    };
    const retry = async <T>(fn: () => Promise<T>): Promise<T> => fn().catch(() => fn());

    await retry(() => db.transaction(() => uow.commit()));

    expect(attempts).toBe(2);
    expect(repository.rows.get('o-1')?.status).toBe('cancelled');
  });

  it('Quick start: inject the entity manager into a service', () => {
    class OrderService {
      constructor(@inject(managerOf(IOrderRepositoryToken)) readonly orders: EntityManager<OrderRepository>) {}
    }
    const request = createApp().createScope({ tags: ['request'] });

    const service = request.resolve(OrderService);

    expect(service.orders).toBe(IUnitOfWorkToken.resolve(request).of(IOrderRepositoryToken));
  });

  it('Working with entities: create, track a list, patch, remove, see what will be written', async () => {
    const app = createApp();
    const uow = IUnitOfWorkToken.resolve(app.createScope({ tags: ['request'] }));
    const orders = uow.of(IOrderRepositoryToken);
    const written: string[] = [];
    uow.committed.subscribe((changes) => written.push(...changes.map((c) => `${c.type} ${String(c.entity.id)}`)));

    orders.create({ id: 'o-2', status: 'open', lines: [] });
    const [listed] = orders.trackMany([{ id: 'o-3', status: 'open', lines: [] }]);
    listed.patch({ status: 'cancelled' });
    orders.remove(await orders.findByIdOrFail('o-1'));
    expect(uow.getChanges().map((c) => c.type)).toEqual(['create', 'update', 'delete']);
    await uow.commit();

    expect(IOrderRepositoryToken.resolve(app).writes).toEqual(['create o-2', 'update o-3 status', 'delete o-1']);
    expect(written).toEqual(['create o-2', 'update o-3', 'delete o-1']);
  });

  it('Foreign keys', async () => {
    type AuthorDto = { id: string; name: string };
    type PostDto = { id: string; authorId: string; tagIds: string[] };
    const log: string[] = [];
    const store = <S extends { id: string }>(entityName: string, references: IRepository<S>['references'] = {}) =>
      ({
        entityName,
        references,
        findById: async () => undefined,
        create: async (record: S) => {
          log.push(`INSERT ${entityName} ${record.id}`);
          return record;
        },
        update: async (stored: S) => stored,
        delete: async () => undefined,
      }) satisfies IRepository<S>;
    const IAuthorRepositoryToken = new SingleToken<IRepository<AuthorDto>>('IAuthorRepository');
    const ITagRepositoryToken = new SingleToken<IRepository<{ id: string }>>('ITagRepository');
    const IPostRepositoryToken = new SingleToken<IRepository<PostDto>>('IPostRepository');
    const request = new Container()
      .addRegistration(R.fromValue(store<AuthorDto>('author')).bindTo(IAuthorRepositoryToken))
      .addRegistration(R.fromValue(store<{ id: string }>('tag')).bindTo(ITagRepositoryToken))
      .addRegistration(
        R.fromValue(store<PostDto>('post', { authorId: IAuthorRepositoryToken, tagIds: ITagRepositoryToken })).bindTo(
          IPostRepositoryToken,
        ),
      )
      .addRegistration(R.fromClass(UnitOfWork));
    const uow = IUnitOfWorkToken.resolve(request);

    uow.of(IPostRepositoryToken).create({ id: 'p-1', authorId: 'a-1', tagIds: [] });
    uow.of(IAuthorRepositoryToken).create({ id: 'a-1', name: 'Grace' });
    await uow.commit();

    expect(log).toEqual(['INSERT author a-1', 'INSERT post p-1']);
  });

  it('Ids from a sequence or a UUID', async () => {
    const IOrderIdsToken = new SingleToken<IIdGenerator<string>>('IOrderIds');
    const IUuidOrderRepositoryToken = new SingleToken<UuidOrderRepository>('IUuidOrderRepository');

    @register(IOrderIdsToken, scope((s) => s.hasTag('application')), singleton())
    class OrderIds implements IIdGenerator<string> {
      private readonly uuids = uuidV7Ids();
      next() {
        return this.uuids.next();
      }
    }

    @register(
      IUuidOrderRepositoryToken,
      scope((s) => s.hasTag('application')),
      decorate(preparing(withId(IOrderIdsToken))),
      singleton(),
    )
    class UuidOrderRepository extends OrderRepository {}

    const app = new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(OrderIds))
      .addRegistration(R.fromClass(UuidOrderRepository))
      .addRegistration(R.fromClass(UnitOfWork).when((s) => s.hasTag('request')));
    const uow = IUnitOfWorkToken.resolve(app.createScope({ tags: ['request'] }));
    const orders = uow.of(IUuidOrderRepositoryToken);

    const order = await orders.add({ status: 'open', lines: [] });
    expect(order.id).toMatch(/^[0-9a-f-]{36}$/);
    await uow.commit();

    expect(orders.repository.writes).toEqual([`create ${order.id}`]);
  });

  it('Records keyed by more than their id', async () => {
    type TariffDto = { id: string; tenant: string; price: number };
    type TariffKey = { id: string; tenant: string };
    const rows: TariffDto[] = [
      { id: 't-1', tenant: 'acme', price: 10 },
      { id: 't-1', tenant: 'globex', price: 20 },
    ];

    class TariffRepository implements IRepository<TariffDto, Entity<TariffDto>, TariffKey> {
      readonly entityName = 'Tariff';
      keyOf({ id, tenant }: TariffDto): TariffKey {
        return { id, tenant };
      }
      async findById({ id, tenant }: TariffKey): Promise<TariffDto | undefined> {
        const row = rows.find((r) => r.id === id && r.tenant === tenant);
        return row && { ...row };
      }
      async create(tariff: TariffDto): Promise<TariffDto> {
        return tariff;
      }
      async update(stored: TariffDto, diff: Partial<TariffDto>): Promise<TariffDto> {
        return { ...stored, ...diff };
      }
      async delete(): Promise<void> {}
    }
    const ITariffRepositoryToken = new SingleToken<TariffRepository>('ITariffRepository');
    const uow = IUnitOfWorkToken.resolve(
      new Container()
        .addRegistration(R.fromClass(TariffRepository).bindTo(ITariffRepositoryToken))
        .addRegistration(R.fromClass(UnitOfWork)),
    );
    const tariffs = uow.of(ITariffRepositoryToken);

    const tariff = await tariffs.findByIdOrFail({ id: 't-1', tenant: 'acme' });

    expect(tariff.state.price).toBe(10);
    expect(await tariffs.findById({ id: 't-1', tenant: 'globex' })).not.toBe(tariff);
  });

  it('lists every error class the package exports, with its code', async () => {
    const readme = readFileSync(join(__dirname, '../../README.md'), 'utf8');
    const errors = Object.entries(await import('../../lib')).filter(([name]) => name.endsWith('Error'));

    for (const [name, ErrorClass] of errors) {
      const { code } = new (ErrorClass as new (...args: unknown[]) => { code: string })('Thing', 'x');
      expect(readme).toContain(`| \`${name}\``);
      expect(readme).toContain(`\`${code}\``);
    }
  });
});
