import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Container, inject, register, Registration as R, scope, singleton, SingleToken } from 'ts-ioc-container';

import {
  Entity,
  EntityIdentityError,
  EntityManager,
  EntityReferenceError,
  type IRepository,
  IUnitOfWorkToken,
  managerOf,
  UnitOfWork,
} from '../../lib';

/**
 * The recipes and pitfalls documented in the package's AGENTS.md, kept
 * executable so the guide an AI agent reads cannot drift from the API.
 */
describe('AGENTS.md recipes', () => {
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

    async findByCustomer(): Promise<OrderDto[]> {
      return [...this.rows.values()].map((row) => structuredClone(row));
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

  const IOrderServiceToken = new SingleToken<OrderService>('IOrderService');

  @register(IOrderServiceToken, scope((s) => s.hasTag('request')), singleton())
  class OrderService {
    constructor(@inject(managerOf(IOrderRepositoryToken)) private readonly orders: EntityManager<OrderRepository>) {}

    async cancel(id: string): Promise<OrderDto> {
      const order = await this.orders.findByIdOrFail(id);
      order.cancel();
      return order.state;
    }
  }

  const createApp = () =>
    new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(OrderRepository))
      .addRegistration(R.fromClass(OrderService))
      .addRegistration(R.fromClass(UnitOfWork).when((s) => s.hasTag('request')));

  const unitOfWork = (app = createApp()) => IUnitOfWorkToken.resolve(app.createScope({ tags: ['request'] }));

  it('Repository, entity, and one unit of work per request', async () => {
    const app = createApp();
    const request = app.createScope({ tags: ['request'] });
    const uow = IUnitOfWorkToken.resolve(request);
    const orders = uow.of(IOrderRepositoryToken);

    const order = await orders.findByIdOrFail('o-1');
    order.cancel();
    order.state.lines.push({ sku: 'idle', quantity: 3 });
    await uow.commit();
    request.dispose();

    expect(order).toBeInstanceOf(Order);
    expect(IOrderRepositoryToken.resolve(app).writes).toEqual(['update o-1 status,lines']);
  });

  it('Inject an entity manager', async () => {
    const app = createApp();
    const request = app.createScope({ tags: ['request'] });

    const cancelled = await IOrderServiceToken.resolve(request).cancel('o-1');
    await IUnitOfWorkToken.resolve(request).commit();

    expect(cancelled.status).toBe('cancelled');
    expect(IOrderRepositoryToken.resolve(app).rows.get('o-1')?.status).toBe('cancelled');
  });

  it('Create, track a list, remove', async () => {
    const app = createApp();
    const uow = unitOfWork(app);
    const orders = uow.of(IOrderRepositoryToken);

    orders.create({ id: 'o-2', status: 'open', lines: [] });
    for (const order of orders.trackMany(await orders.repository.findByCustomer())) order.cancel();
    orders.remove(await orders.findByIdOrFail('o-1'));
    await uow.commit();

    expect(IOrderRepositoryToken.resolve(app).writes).toEqual(['create o-2', 'delete o-1']);
  });

  type AuthorDto = { id: string; name: string; pinnedPostId: string | null };
  type PostDto = { id: string; authorId: string; tagIds: string[] };

  const IAuthorRepositoryToken = new SingleToken<IRepository<AuthorDto>>('IAuthorRepository');
  const ITagRepositoryToken = new SingleToken<IRepository<{ id: string }>>('ITagRepository');
  const IPostRepositoryToken = new SingleToken<IRepository<PostDto>>('IPostRepository');

  const blog = () => {
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
    const uow = IUnitOfWorkToken.resolve(
      new Container()
        .addRegistration(
          R.fromValue(store<AuthorDto>('author', { pinnedPostId: IPostRepositoryToken })).bindTo(
            IAuthorRepositoryToken,
          ),
        )
        .addRegistration(R.fromValue(store<{ id: string }>('tag')).bindTo(ITagRepositoryToken))
        .addRegistration(
          R.fromValue(store<PostDto>('post', { authorId: IAuthorRepositoryToken, tagIds: ITagRepositoryToken })).bindTo(
            IPostRepositoryToken,
          ),
        )
        .addRegistration(R.fromClass(UnitOfWork)),
    );
    return { log, uow, authors: uow.of(IAuthorRepositoryToken), posts: uow.of(IPostRepositoryToken) };
  };

  it('Foreign keys: declare references, the commit orders the writes', async () => {
    const { log, uow, authors, posts } = blog();

    posts.create({ id: 'p-1', authorId: 'a-1', tagIds: [] });
    authors.create({ id: 'a-1', name: 'Grace', pinnedPostId: null });
    await uow.commit();

    expect(log).toEqual(['INSERT author a-1', 'INSERT post p-1']);
  });

  type TariffDto = { id: string; tenant: string; price: number };
  type TariffKey = { id: string; tenant: string };

  class TariffRepository implements IRepository<TariffDto, Entity<TariffDto>, TariffKey> {
    readonly entityName = 'Tariff';
    readonly rows = [
      { id: 't-1', tenant: 'acme', price: 10 },
      { id: 't-1', tenant: 'globex', price: 20 },
    ];

    keyOf({ id, tenant }: TariffDto): TariffKey {
      return { id, tenant };
    }

    async findById({ id, tenant }: TariffKey): Promise<TariffDto | undefined> {
      const row = this.rows.find((r) => r.id === id && r.tenant === tenant);
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

  it('A record keyed by more than its id', async () => {
    const tariffs = new EntityManager(new TariffRepository());

    const acme = await tariffs.findByIdOrFail({ id: 't-1', tenant: 'acme' });
    const globex = await tariffs.findByIdOrFail({ id: 't-1', tenant: 'globex' });

    expect(globex).not.toBe(acme);
    expect([acme.state.price, globex.state.price]).toEqual([10, 20]);
  });

  it('Read many records at once', async () => {
    const repository = IOrderRepositoryToken.resolve(createApp());
    repository.rows.set('o-2', { id: 'o-2', status: 'open', lines: [] });
    const orders = new EntityManager(repository);

    const found = await orders.findByIds(['o-2', 'o-9', 'o-1', 'o-2']);

    expect(found.map((o) => o.id)).toEqual(['o-2', 'o-1']);
  });

  it('What will be written, and what was', async () => {
    const uow = unitOfWork();
    const orders = uow.of(IOrderRepositoryToken);
    const events: string[] = [];
    uow.committed.subscribe((changes) => {
      for (const change of changes) {
        if (change.type === 'update' && 'status' in change.diff) events.push(`OrderStatusChanged ${change.entity.id}`);
      }
    });
    (await orders.findByIdOrFail('o-1')).cancel();

    expect(uow.getChanges().map((c) => `${c.type} ${c.repository.entityName} ${c.entity.id}`)).toEqual([
      'update Order o-1',
    ]);
    await uow.commit();

    expect(events).toEqual(['OrderStatusChanged o-1']);
  });

  it('Discard, detach, reload', async () => {
    const app = createApp();
    const repository = IOrderRepositoryToken.resolve(app);
    const orders = unitOfWork(app).of(IOrderRepositoryToken);
    const order = await orders.findByIdOrFail('o-1');

    order.cancel();
    order.revert();
    expect(order.state.status).toBe('open');

    repository.rows.set('o-1', { id: 'o-1', status: 'cancelled', lines: [] });
    expect(await orders.reload(order)).toBe(order);
    expect(order.state.status).toBe('cancelled');

    orders.detach(order);
    expect(await orders.findByIdOrFail('o-1')).not.toBe(order);
    orders.clear();
    expect(orders.hasChanges()).toBe(false);
  });

  it('lists a replacement for every removed export', () => {
    const guide = readFileSync(join(__dirname, '../../AGENTS.md'), 'utf8');
    const removed = guide.slice(guide.indexOf('## Removed APIs'), guide.indexOf('## Rules'));

    for (const name of ['repositoryToken', 'entityManagerToken', 'flushEntityManagers', 'lazy', 'link', 'RecordKey']) {
      expect(removed).toContain(name);
    }
  });

  describe('Pitfalls', () => {
    it('an UnitOfWork without a scope rule gives the app scope one of its own', () => {
      const app = new Container({ tags: ['application'] })
        .addRegistration(R.fromClass(OrderRepository))
        .addRegistration(R.fromClass(UnitOfWork));

      expect(IUnitOfWorkToken.resolve(app)).not.toBe(IUnitOfWorkToken.resolve(app.createScope({ tags: ['request'] })));
    });

    it('a record read from the repository directly is untracked, so a change to it is not written', async () => {
      const app = createApp();
      const uow = unitOfWork(app);
      const orders = uow.of(IOrderRepositoryToken);

      const untracked = await orders.repository.findById('o-1');
      untracked!.status = 'cancelled';
      await uow.commit();

      expect(IOrderRepositoryToken.resolve(app).writes).toEqual([]);
    });

    it('a change inside a class instance in the DTO is not seen; assigning a new one is', () => {
      class Money {
        constructor(public amount: number) {}
      }
      const entity = new Entity({ id: 'm-1', price: new Money(1) });

      entity.state.price.amount = 2;
      expect(entity.getDiff()).toEqual({});

      entity.state.price = new Money(2);
      expect(Object.keys(entity.getDiff())).toEqual(['price']);
    });

    it('EntityReferenceError: new records that reference each other', async () => {
      const { log, uow, authors, posts } = blog();
      authors.create({ id: 'a-1', name: 'Grace', pinnedPostId: 'p-1' });
      posts.create({ id: 'p-1', authorId: 'a-1', tagIds: [] });

      await expect(uow.commit()).rejects.toThrow(EntityReferenceError);
      expect(log).toEqual([]);
    });

    it('EntityIdentityError: records cannot be added to a repository without prepare', async () => {
      const orders = unitOfWork().of(IOrderRepositoryToken);

      await expect(orders.add({ status: 'open', lines: [] })).rejects.toThrow(/decorate\(preparing\(withId/);
    });

    it('EntityIdentityError on create: change the tracked entity instead', async () => {
      const orders = unitOfWork().of(IOrderRepositoryToken);
      await orders.findByIdOrFail('o-1');

      expect(() => orders.create({ id: 'o-1', status: 'open', lines: [] })).toThrow(EntityIdentityError);
    });
  });
});
