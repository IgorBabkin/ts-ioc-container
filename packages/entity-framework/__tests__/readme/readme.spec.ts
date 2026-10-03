import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { by, Container, inject, register, Registration as R, scope, singleton } from 'ts-ioc-container';

import {
  Entity,
  EntityManager,
  entityManagerToken,
  flushEntityManagers,
  type IRepository,
  repositoryToken,
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
      .addRegistration(R.fromClass(EntityManager).when((s) => s.hasTag('request')));

  it('Quick start: read, change in place, commit', async () => {
    const app = createApp();
    const request = app.createScope({ tags: ['request'] });
    let order: Order;
    try {
      const orders = entityManagerToken(IOrderRepositoryToken).resolve(request);

      order = await orders.findByIdOrFail('o-1');
      order.cancel();
      order.state.lines.push({ sku: 'idle', quantity: 3 });

      await db.transaction(() => flushEntityManagers(request));
    } finally {
      request.dispose();
    }

    expect(order).toBeInstanceOf(Order);
    expect(IOrderRepositoryToken.resolve(app).writes).toEqual(['update o-1 status,lines']);
  });

  it('Quick start: a commit that failed can be run again', async () => {
    const app = createApp();
    const repository = IOrderRepositoryToken.resolve(app);
    const request = app.createScope({ tags: ['request'] });
    (await entityManagerToken(IOrderRepositoryToken).resolve(request).findByIdOrFail('o-1')).cancel();
    let attempts = 0;
    const update = repository.update.bind(repository);
    repository.update = async (stored, diff) => {
      if (++attempts === 1) throw new Error('serialization failure');
      return update(stored, diff);
    };
    const retry = async <T>(fn: () => Promise<T>): Promise<T> => fn().catch(() => fn());

    await retry(() => db.transaction(() => flushEntityManagers(request)));

    expect(attempts).toBe(2);
    expect(repository.rows.get('o-1')?.status).toBe('cancelled');
  });

  it('Quick start: inject the entity manager into a service', () => {
    class OrderService {
      constructor(
        @inject(by(entityManagerToken(IOrderRepositoryToken))) readonly orders: EntityManager<OrderRepository>,
      ) {}
    }
    const request = createApp().createScope({ tags: ['request'] });

    const service = request.resolve(OrderService);

    expect(service.orders).toBe(entityManagerToken(IOrderRepositoryToken).resolve(request));
  });

  it('Working with entities: create, track a list, patch, remove', async () => {
    const app = createApp();
    const request = app.createScope({ tags: ['request'] });
    const orders = entityManagerToken(IOrderRepositoryToken).resolve(request);

    orders.create({ id: 'o-2', status: 'open', lines: [] });
    const [listed] = orders.trackMany([{ id: 'o-3', status: 'open', lines: [] }]);
    listed.patch({ status: 'cancelled' });
    orders.remove(await orders.findByIdOrFail('o-1'));
    await flushEntityManagers(request);

    expect(IOrderRepositoryToken.resolve(app).writes).toEqual(['create o-2', 'update o-3 status', 'delete o-1']);
  });

  it('Linking a record that does not exist yet', async () => {
    type PostDto = { id: string; title: string; commentId: string | null };
    type CommentDto = { id: string; text: string };
    const log: string[] = [];
    const comments = new EntityManager<IRepository<CommentDto, Entity<CommentDto>, Omit<CommentDto, 'id'>>>({
      entityName: 'Comment',
      findById: async () => undefined,
      create: async (value) => {
        log.push(`create comment ${JSON.stringify(value)}`);
        return { ...value, id: 'c-1' };
      },
      update: async (stored, diff) => ({ ...stored, ...diff }),
      delete: async () => undefined,
    });
    const posts = new EntityManager<IRepository<PostDto>>({
      entityName: 'Post',
      findById: async (id) => ({ id, title: 'Hello', commentId: null }),
      create: async (value) => value,
      update: async (stored, diff) => {
        log.push(`update post ${JSON.stringify(diff)}`);
        return { ...stored, ...diff };
      },
      delete: async () => undefined,
    });
    const post = await posts.findByIdOrFail('p-1');

    post.link('commentId', comments.lazy({ text: 'First!' }));
    expect(log).toEqual([]);
    await posts.flush();

    expect(log).toEqual(['create comment {"text":"First!"}', 'update post {"commentId":"c-1"}']);
    expect(post.state.commentId).toBe('c-1');
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
