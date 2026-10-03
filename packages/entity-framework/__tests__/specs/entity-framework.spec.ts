import 'reflect-metadata';
import { Container, register, Registration as R, scope, singleton } from 'ts-ioc-container';

import {
  Entity,
  EntityIdentityError,
  EntityManager,
  entityManagerToken,
  EntityNotFoundError,
  EntityReferenceError,
  flushEntityManagers,
  type IEntity,
  type IRepository,
  type Ref,
  repositoryToken,
  type Resolved,
} from '../../lib';

type OrderDto = {
  id: string;
  customer: string;
  status: 'open' | 'cancelled';
  lines: { sku: string; quantity: number }[];
  placedAt: Date;
};

class Order extends Entity<OrderDto> {
  cancel(): void {
    this.state.status = 'cancelled';
  }

  addLine(sku: string, quantity: number): void {
    this.state.lines.push({ sku, quantity });
  }
}

const order = (id: string, overrides: Partial<OrderDto> = {}): OrderDto => ({
  id,
  customer: 'Ada',
  status: 'open',
  lines: [{ sku: 'kwh', quantity: 10 }],
  placedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const IOrderRepositoryToken = repositoryToken<OrderRepository>('IOrderRepository');

// An in-memory store that writes down every call it gets, so a spec reads what a flush sent.
@register(IOrderRepositoryToken, scope((s) => s.hasTag('application')), singleton())
class OrderRepository implements IRepository<OrderDto, Order> {
  readonly entityName = 'Order';
  readonly entityClass = Order;
  readonly calls: string[] = [];
  readonly rows = new Map<string, OrderDto>();

  constructor(...orders: OrderDto[]) {
    for (const o of orders) this.rows.set(o.id, structuredClone(o));
  }

  async findById(id: string): Promise<OrderDto | undefined> {
    this.calls.push(`findById:${id}`);
    const row = this.rows.get(id);
    return row && structuredClone(row);
  }

  async findByCustomer(customer: string): Promise<OrderDto[]> {
    return [...this.rows.values()].filter((o) => o.customer === customer).map((o) => structuredClone(o));
  }

  async create(state: OrderDto): Promise<OrderDto> {
    this.calls.push(`create:${state.id}`);
    this.rows.set(state.id, structuredClone(state));
    return structuredClone(state);
  }

  async update(stored: OrderDto, diff: Partial<OrderDto>): Promise<OrderDto> {
    this.calls.push(`update:${stored.id}:${Object.keys(diff).sort().join(',')}`);
    const row = { ...stored, ...structuredClone(diff) };
    this.rows.set(stored.id, row);
    return structuredClone(row);
  }

  async delete(stored: OrderDto): Promise<void> {
    this.calls.push(`delete:${stored.id}`);
    this.rows.delete(stored.id);
  }
}

const managerOver = (...orders: OrderDto[]) => {
  const repository = new OrderRepository(...orders);
  return { manager: new EntityManager(repository), repository };
};

describe('Spec: entity framework', () => {
  describe('Story: track a change by changing the DTO', () => {
    it('diffs nothing until the state changes, then only the fields that did — nested ones included', () => {
      const entity = new Entity(order('o-1'));
      expect(entity.getDiff()).toEqual({});

      entity.state.lines.push({ sku: 'idle', quantity: 3 });
      entity.state.customer = 'Grace';

      expect(entity.getDiff()).toEqual({
        customer: 'Grace',
        lines: [
          { sku: 'kwh', quantity: 10 },
          { sku: 'idle', quantity: 3 },
        ],
      });
    });

    it('compares dates by time, not by identity', () => {
      const entity = new Entity(order('o-1'));
      entity.state.placedAt = new Date('2026-01-01T00:00:00Z');

      expect(entity.getDiff()).toEqual({});
    });

    it('reports a field the state no longer has as undefined', () => {
      const entity = new Entity<{ id: string; note?: string }>({ id: 'n-1', note: 'x' });
      delete entity.state.note;

      expect(entity.getDiff()).toEqual({ note: undefined });
    });

    it('diffs every field of a new entity', () => {
      expect(new Entity(order('o-1'), { isNew: true }).getDiff()).toEqual(order('o-1'));
    });

    it('sets the fields a patch names, leaves the rest, and answers the entity', () => {
      const entity = new Entity(order('o-1'));

      expect(entity.patch({ customer: 'Grace', status: 'cancelled' })).toBe(entity);

      expect(entity.state).toEqual(order('o-1', { customer: 'Grace', status: 'cancelled' }));
      expect(entity.getDiff()).toEqual({ customer: 'Grace', status: 'cancelled' });
    });

    it('keeps its own copy of what a patch sets', () => {
      const entity = new Entity(order('o-1'));
      const lines = [{ sku: 'idle', quantity: 1 }];

      entity.patch({ lines });
      lines.push({ sku: 'kwh', quantity: 2 });

      expect(entity.state.lines).toEqual([{ sku: 'idle', quantity: 1 }]);
    });

    it('refuses a patch that changes the id', () => {
      const entity = new Entity(order('o-1'));

      expect(() => entity.patch({ id: 'o-2' })).toThrow(EntityIdentityError);
      expect(entity.patch({ id: 'o-1' }).state.id).toBe('o-1');
    });

    it('keeps its own copy of what it is given, so the caller cannot change it behind its back', () => {
      const dto = order('o-1');
      const entity = new Entity(dto);
      dto.customer = 'Mallory';

      expect(entity.state.customer).toBe('Ada');
    });
  });

  describe('Story: extend an entity with behaviour', () => {
    it("builds a repository's entities with its entityClass, so their own methods are there", async () => {
      const { manager } = managerOver(order('o-1'));

      const found = await manager.findByIdOrFail('o-1');
      found.cancel();
      found.addLine('idle', 3);

      expect(found).toBeInstanceOf(Order);
      expect(found.getDiff()).toEqual({
        status: 'cancelled',
        lines: [
          { sku: 'kwh', quantity: 10 },
          { sku: 'idle', quantity: 3 },
        ],
      });
    });
  });

  describe('Story: read each record once per unit of work', () => {
    it('answers every read of an id with the same entity, reaching the repository once', async () => {
      const { manager, repository } = managerOver(order('o-1'));

      const first = await manager.findByIdOrFail('o-1');
      first.cancel();
      const second = await manager.findById('o-1');

      expect(second).toBe(first);
      expect(repository.calls).toEqual(['findById:o-1']);
    });

    it('tracks records read as a list, keeping the changes of one tracked already', async () => {
      const { manager, repository } = managerOver(order('o-1'), order('o-2'));
      (await manager.findByIdOrFail('o-1')).cancel();

      const listed = manager.trackMany(await repository.findByCustomer('Ada'));

      expect(listed.map((o) => o.state.status)).toEqual(['cancelled', 'open']);
      expect(await manager.findByIdOrFail('o-2')).toBe(listed[1]);
    });

    it('fails with EntityNotFoundError for an id the repository does not have', async () => {
      const { manager } = managerOver();

      await expect(manager.findByIdOrFail('o-9')).rejects.toBeInstanceOf(EntityNotFoundError);
      await expect(manager.findById('o-9')).resolves.toBeUndefined();
    });
  });

  describe('Story: write a unit of work with one flush', () => {
    it('updates only the fields that changed, given the record as it was read, and writes nothing unchanged', async () => {
      const { manager, repository } = managerOver(order('o-1'), order('o-2'));
      (await manager.findByIdOrFail('o-1')).cancel();
      await manager.findByIdOrFail('o-2');

      await manager.flush();

      expect(repository.calls.filter((c) => !c.startsWith('findById'))).toEqual(['update:o-1:status']);
      expect(repository.rows.get('o-1')?.status).toBe('cancelled');
    });

    it('takes what the repository answered as stored, so a second flush writes nothing', async () => {
      const { manager, repository } = managerOver(order('o-1'));
      (await manager.findByIdOrFail('o-1')).cancel();

      await manager.flush();
      await manager.flush();

      expect(repository.calls.filter((c) => c.startsWith('update'))).toHaveLength(1);
      expect(manager.hasChanges()).toBe(false);
    });

    it('creates a new record on flush, answers reads of its id before then, and updates it after', async () => {
      const { manager, repository } = managerOver();
      const created = manager.create(order('o-3'));
      created.cancel();
      const { state } = created;

      expect(await manager.findByIdOrFail('o-3')).toBe(created);
      await manager.flush();
      created.addLine('idle', 1);
      await manager.flush();

      expect(repository.calls).toEqual(['create:o-3', 'update:o-3:lines']);
      expect(repository.rows.get('o-3')?.status).toBe('cancelled');
      expect(created.state).toBe(state);
    });

    it('deletes a removed record on flush; until then and after, its id reads as missing', async () => {
      const { manager, repository } = managerOver(order('o-1'), order('o-2'));
      manager.remove(await manager.findByIdOrFail('o-1'));

      expect(await manager.findById('o-1')).toBeUndefined();
      expect(manager.trackMany(await repository.findByCustomer('Ada')).map((o) => o.id)).toEqual(['o-2']);
      await manager.flush();

      expect(repository.rows.has('o-1')).toBe(false);
      expect(repository.calls).toContain('delete:o-1');
    });

    it('writes nothing for a record created and removed in the same unit of work', async () => {
      const { manager, repository } = managerOver();
      manager.remove(manager.create(order('o-3')));

      await manager.flush();

      expect(repository.calls).toEqual([]);
    });

    it('refuses to create an id it tracks, or one it removed in this unit of work', async () => {
      const { manager } = managerOver(order('o-1'), order('o-2'));
      await manager.findByIdOrFail('o-1');
      manager.remove(await manager.findByIdOrFail('o-2'));

      expect(() => manager.create(order('o-1'))).toThrow(EntityIdentityError);
      expect(() => manager.create(order('o-2'))).toThrow('was removed in this unit of work');
    });

    it('refuses to flush an entity whose id was changed', async () => {
      const { manager } = managerOver(order('o-1'));
      (await manager.findByIdOrFail('o-1')).state.id = 'o-2';

      await expect(manager.flush()).rejects.toBeInstanceOf(EntityIdentityError);
    });
  });

  describe('Story: one unit of work per scope', () => {
    const app = () =>
      new Container({ tags: ['application'] })
        .addRegistration(R.fromClass(OrderRepository))
        .addRegistration(R.fromClass(EntityManager).when((s) => s.hasTag('request')));

    it('resolves one entity manager per repository token in a scope, and a new one in another scope', () => {
      const container = app();
      const request = container.createScope({ tags: ['request'] });
      const other = container.createScope({ tags: ['request'] });

      const manager = entityManagerToken(IOrderRepositoryToken).resolve(request);

      expect(entityManagerToken(IOrderRepositoryToken).resolve(request)).toBe(manager);
      expect(entityManagerToken(IOrderRepositoryToken).resolve(other)).not.toBe(manager);
      expect(manager.repository).toBe(IOrderRepositoryToken.resolve(request));
    });

    it('flushes every entity manager the scope built with flushEntityManagers', async () => {
      const container = app();
      const repository = IOrderRepositoryToken.resolve(container);
      repository.rows.set('o-1', order('o-1'));
      const request = container.createScope({ tags: ['request'] });
      (await entityManagerToken(IOrderRepositoryToken).resolve(request).findByIdOrFail('o-1')).cancel();

      await flushEntityManagers(request);

      expect(repository.rows.get('o-1')?.status).toBe('cancelled');
    });
  });

  describe('Story: save a referenced record lazily, when the entity holding it is flushed', () => {
    type AuthorDto = { id: string; name: string };
    type CommentDto = { id: string; text: string; authorId: Ref<string> | null };
    type PostDto = { id: string; title: string; commentId: Ref<string> | null; tagIds: Ref<string>[] };

    // A store that mints ids the way a serial column does, writing every write into one log shared by all stores.
    class SerialRepository<S extends IEntity & { id: string }> implements IRepository<S, Entity<S>, Omit<S, 'id'>> {
      readonly rows = new Map<string, Resolved<S>>();
      private next = 0;

      constructor(
        readonly entityName: string,
        private readonly prefix: string,
        private readonly log: string[],
        ...rows: Resolved<S>[]
      ) {
        for (const row of rows) this.rows.set(row.id, row);
      }

      async findById(id: string): Promise<S | undefined> {
        return this.rows.get(id) as S | undefined;
      }

      async create(value: Resolved<Omit<S, 'id'>>): Promise<S> {
        const row = { ...value, id: `${this.prefix}-${++this.next}` } as unknown as Resolved<S>;
        this.log.push(`create ${row.id} ${JSON.stringify(value)}`);
        this.rows.set(row.id, row);
        return row as unknown as S;
      }

      async update(stored: Resolved<S>, diff: Partial<Resolved<S>>): Promise<S> {
        this.log.push(`update ${stored.id} ${JSON.stringify(diff)}`);
        const row = { ...stored, ...diff };
        this.rows.set(stored.id, row);
        return row as unknown as S;
      }

      async delete(stored: Resolved<S>): Promise<void> {
        this.log.push(`delete ${stored.id}`);
        this.rows.delete(stored.id);
      }
    }

    const blog = () => {
      const log: string[] = [];
      const authors = new EntityManager(new SerialRepository<AuthorDto>('Author', 'a', log));
      const comments = new EntityManager(new SerialRepository<CommentDto>('Comment', 'c', log));
      const posts = new EntityManager(
        new SerialRepository<PostDto>('Post', 'p', log, { id: 'p-0', title: 'Hello', commentId: null, tagIds: [] }),
      );
      return { log, authors, comments, posts };
    };

    it("creates the record when its holder is flushed, and writes its id into the holder's foreign key", async () => {
      const { log, comments, posts } = blog();
      const comment = comments.lazy({ text: 'First!', authorId: null });
      const post = await posts.findByIdOrFail('p-0');

      post.state.commentId = comment;
      expect(log).toEqual([]);
      await posts.flush();

      expect(log).toEqual(['create c-1 {"text":"First!","authorId":null}', 'update p-0 {"commentId":"c-1"}']);
      expect(post.state.commentId).toBe('c-1');
      expect(await comments.findByIdOrFail('c-1')).toBe(await comment.resolve());
    });

    it('never creates a reference no flushed entity holds', async () => {
      const { log, comments, posts } = blog();
      comments.lazy({ text: 'Draft', authorId: null });
      await posts.findByIdOrFail('p-0');

      await posts.flush();
      await comments.flush();

      expect(log).toEqual([]);
    });

    it('creates a reference held by several entities once, giving each the same id', async () => {
      const { log, comments, posts } = blog();
      const comment = comments.lazy({ text: 'Shared', authorId: null });
      const first = await posts.findByIdOrFail('p-0');
      const second = posts.create({ id: 'p-9', title: 'Again', commentId: comment, tagIds: [] });
      first.state.commentId = comment;

      await posts.flush();

      expect(log.filter((line) => line.startsWith('create c'))).toHaveLength(1);
      expect([first.state.commentId, second.state.commentId]).toEqual(['c-1', 'c-1']);
    });

    it('resolves references inside a referenced record first, and those in arrays', async () => {
      const { log, authors, comments, posts } = blog();
      const author = authors.lazy({ name: 'Ada' });
      const post = await posts.findByIdOrFail('p-0');

      post.patch({ commentId: comments.lazy({ text: 'Nested', authorId: author }), tagIds: ['t-0', author] });
      await posts.flush();

      expect(log).toEqual([
        'create a-1 {"name":"Ada"}',
        'create c-1 {"text":"Nested","authorId":"a-1"}',
        'update p-0 {"commentId":"c-1","tagIds":["t-0","a-1"]}',
      ]);
    });

    it('creates a new holder with the id of the record it references', async () => {
      const { log, comments, posts } = blog();

      posts.create({ id: 'p-9', title: 'New', commentId: comments.lazy({ text: 'Hi', authorId: null }), tagIds: [] });
      await posts.flush();

      expect(log).toEqual([
        'create c-1 {"text":"Hi","authorId":null}',
        'create p-1 {"id":"p-9","title":"New","commentId":"c-1","tagIds":[]}',
      ]);
    });

    it('does not create what a removed holder referenced', async () => {
      const { log, comments, posts } = blog();
      const post = await posts.findByIdOrFail('p-0');
      post.state.commentId = comments.lazy({ text: 'Gone', authorId: null });

      posts.remove(post);
      await posts.flush();

      expect(log).toEqual(['delete p-0']);
    });

    it('fails with EntityReferenceError when references form a cycle', async () => {
      const { comments, posts } = blog();
      const value: Omit<CommentDto, 'id'> = { text: 'Loop', authorId: null };
      const comment = comments.lazy(value);
      value.authorId = comment;
      (await posts.findByIdOrFail('p-0')).state.commentId = comment;

      await expect(posts.flush()).rejects.toBeInstanceOf(EntityReferenceError);
    });
  });
});
