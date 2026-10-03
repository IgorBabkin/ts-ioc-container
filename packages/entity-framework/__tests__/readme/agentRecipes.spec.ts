import 'reflect-metadata';
import { by, Container, inject, register, Registration as R, scope, singleton, SingleToken } from 'ts-ioc-container';

import {
  Entity,
  EntityIdentityError,
  EntityManager,
  EntityManagerArgumentError,
  entityManagerToken,
  flushEntityManagers,
  IEntityManagerToken,
  type IRepository,
  repositoryToken,
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

  const IOrderRepositoryToken = repositoryToken<OrderRepository>('IOrderRepository');

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
    constructor(
      @inject(by(entityManagerToken(IOrderRepositoryToken))) private readonly orders: EntityManager<OrderRepository>,
    ) {}

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
      .addRegistration(R.fromClass(EntityManager).when((s) => s.hasTag('request')));

  it('Repository, entity, and one unit of work per request', async () => {
    const app = createApp();
    const request = app.createScope({ tags: ['request'] });
    const orders = entityManagerToken(IOrderRepositoryToken).resolve(request);

    const order = await orders.findByIdOrFail('o-1');
    order.cancel();
    order.state.lines.push({ sku: 'idle', quantity: 3 });
    await flushEntityManagers(request);
    request.dispose();

    expect(order).toBeInstanceOf(Order);
    expect(IOrderRepositoryToken.resolve(app).writes).toEqual(['update o-1 status,lines']);
  });

  it('Inject an entity manager', async () => {
    const app = createApp();
    const request = app.createScope({ tags: ['request'] });

    const cancelled = await IOrderServiceToken.resolve(request).cancel('o-1');
    await flushEntityManagers(request);

    expect(cancelled.status).toBe('cancelled');
    expect(IOrderRepositoryToken.resolve(app).rows.get('o-1')?.status).toBe('cancelled');
  });

  it('Create, track a list, remove', async () => {
    const app = createApp();
    const request = app.createScope({ tags: ['request'] });
    const orders = entityManagerToken(IOrderRepositoryToken).resolve(request);

    orders.create({ id: 'o-2', status: 'open', lines: [] });
    for (const order of orders.trackMany(await orders.repository.findByCustomer())) order.cancel();
    orders.remove(await orders.findByIdOrFail('o-1'));
    await flushEntityManagers(request);

    expect(IOrderRepositoryToken.resolve(app).writes).toEqual(['create o-2', 'delete o-1']);
  });

  describe('Pitfalls', () => {
    it('EntityManagerArgumentError: IEntityManagerToken resolved on its own, or with a plain SingleToken', () => {
      const request = createApp().createScope({ tags: ['request'] });

      expect(() => IEntityManagerToken.resolve(request)).toThrow(EntityManagerArgumentError);
      expect(() => IEntityManagerToken.args(new SingleToken('IOrderRepository')).resolve(request)).toThrow(
        EntityManagerArgumentError,
      );
    });

    it('an EntityManager registered without a scope rule is shared by every scope', () => {
      const app = new Container({ tags: ['application'] })
        .addRegistration(R.fromClass(OrderRepository))
        .addRegistration(R.fromClass(EntityManager));
      const shared = entityManagerToken(IOrderRepositoryToken);

      expect(shared.resolve(app.createScope({ tags: ['request'] }))).not.toBe(
        shared.resolve(app.createScope({ tags: ['request'] })),
      );
      // ...but a scope without the request tag, and the app itself, still resolve one: scope it.
      expect(
        entityManagerToken(IOrderRepositoryToken).resolve(createApp().createScope({ tags: ['request'] })),
      ).toBeInstanceOf(EntityManager);
    });

    it('a record read from the repository directly is untracked, so a change to it is not written', async () => {
      const app = createApp();
      const request = app.createScope({ tags: ['request'] });
      const orders = entityManagerToken(IOrderRepositoryToken).resolve(request);

      const untracked = await orders.repository.findById('o-1');
      untracked!.status = 'cancelled';
      await flushEntityManagers(request);

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

    it('EntityIdentityError on create: change the tracked entity instead', async () => {
      const orders = entityManagerToken(IOrderRepositoryToken).resolve(createApp().createScope({ tags: ['request'] }));
      await orders.findByIdOrFail('o-1');

      expect(() => orders.create({ id: 'o-1', status: 'open', lines: [] })).toThrow(EntityIdentityError);
    });
  });
});
