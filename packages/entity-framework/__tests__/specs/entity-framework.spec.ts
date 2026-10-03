import 'reflect-metadata';
import { Container, decorate, register, Registration as R, scope, singleton, SingleToken } from 'ts-ioc-container';

import {
  Entity,
  EntityIdentityError,
  EntityManager,
  entityManagerToken,
  EntityNotFoundError,
  EntityReferenceError,
  flushEntityManagers,
  type IEntity,
  type IIdGenerator,
  type IRepository,
  preparing,
  repositoryToken,
  withId,
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

  describe('Story: read many records at once', () => {
    // A store that also reads many ids in one call, the way `WHERE id IN (...)` does.
    class BatchOrderRepository extends OrderRepository {
      async findByIds(ids: string[]): Promise<OrderDto[]> {
        this.calls.push(`findByIds:${ids.join(',')}`);
        return ids.flatMap((id) => {
          const row = this.rows.get(id);
          return row ? [structuredClone(row)] : [];
        });
      }
    }

    it('reads only the ids it does not track, in one call, answering in the order asked', async () => {
      const repository = new BatchOrderRepository(order('o-1'), order('o-2'), order('o-3'));
      const manager = new EntityManager(repository);
      const tracked = await manager.findByIdOrFail('o-2');

      const found = await manager.findByIds(['o-3', 'o-2', 'o-9', 'o-1', 'o-3']);

      expect(found.map((o) => o.id)).toEqual(['o-3', 'o-2', 'o-1']);
      expect(found[1]).toBe(tracked);
      expect(found[0]).toBeInstanceOf(Order);
      expect(repository.calls).toEqual(['findById:o-2', 'findByIds:o-3,o-9,o-1']);
      expect(await manager.findById('o-3')).toBe(found[0]);
    });

    it('reads one id at a time when the repository cannot read many', async () => {
      const { manager, repository } = managerOver(order('o-1'), order('o-2'));

      const found = await manager.findByIds(['o-1', 'o-2']);

      expect(found.map((o) => o.id)).toEqual(['o-1', 'o-2']);
      expect(repository.calls).toEqual(['findById:o-1', 'findById:o-2']);
    });

    it('leaves out the ids removed in this unit of work', async () => {
      const repository = new BatchOrderRepository(order('o-1'), order('o-2'));
      const manager = new EntityManager(repository);
      manager.remove(await manager.findByIdOrFail('o-1'));

      expect((await manager.findByIds(['o-1', 'o-2'])).map((o) => o.id)).toEqual(['o-2']);
    });

    it('shares one repository call between concurrent reads of an id', async () => {
      const { manager, repository } = managerOver(order('o-1'));

      const [first, second] = await Promise.all([manager.findById('o-1'), manager.findById('o-1')]);

      expect(first).toBe(second);
      expect(repository.calls).toEqual(['findById:o-1']);
    });

    it('shares a batch read with a concurrent read of one of its ids', async () => {
      const repository = new BatchOrderRepository(order('o-1'), order('o-2'));
      const manager = new EntityManager(repository);

      const [many, one] = await Promise.all([manager.findByIds(['o-1', 'o-2']), manager.findById('o-2')]);

      expect(one).toBe(many[1]);
      expect(repository.calls).toEqual(['findByIds:o-1,o-2']);
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

  describe('Story: records keyed by more than their id', () => {
    type TariffDto = { id: string; tenant: string; price: number };

    // A store keyed by (id, tenant), as a multi-tenant table is.
    class TariffRepository implements IRepository<TariffDto> {
      readonly entityName = 'Tariff';
      readonly calls: string[] = [];
      readonly rows = new Map<string, TariffDto>([
        ['t-1@acme', { id: 't-1', tenant: 'acme', price: 10 }],
        ['t-1@globex', { id: 't-1', tenant: 'globex', price: 20 }],
      ]);

      keyOf(tariff: TariffDto): [string, string] {
        return [tariff.id, tariff.tenant];
      }

      async findById(id: string, tenant: string): Promise<TariffDto | undefined> {
        this.calls.push(`findById:${id}@${tenant}`);
        const row = this.rows.get(`${id}@${tenant}`);
        return row && { ...row };
      }

      async create(tariff: TariffDto): Promise<TariffDto> {
        this.calls.push(`create:${tariff.id}@${tariff.tenant}`);
        return { ...tariff };
      }

      async update(stored: TariffDto, diff: Partial<TariffDto>): Promise<TariffDto> {
        this.calls.push(`update:${stored.id}@${stored.tenant}`);
        return { ...stored, ...diff };
      }

      async delete(stored: TariffDto): Promise<void> {
        this.calls.push(`delete:${stored.id}@${stored.tenant}`);
      }
    }

    const tariffsOver = () => {
      const repository = new TariffRepository();
      return { manager: new EntityManager(repository), repository };
    };

    it('answers one entity per key, reaching the repository once for each', async () => {
      const { manager, repository } = tariffsOver();

      const acme = await manager.findByIdOrFail('t-1', 'acme');
      const globex = await manager.findByIdOrFail('t-1', 'globex');

      expect([acme.state.tenant, globex.state.tenant]).toEqual(['acme', 'globex']);
      expect(await manager.findById('t-1', 'acme')).toBe(acme);
      expect(await manager.findById('t-1', 'globex')).toBe(globex);
      expect(repository.calls).toEqual(['findById:t-1@acme', 'findById:t-1@globex']);
    });

    it('writes each record under its own key', async () => {
      const { manager, repository } = tariffsOver();
      (await manager.findByIdOrFail('t-1', 'acme')).state.price = 11;
      await manager.findByIdOrFail('t-1', 'globex');

      await manager.flush();

      expect(repository.calls.filter((c) => !c.startsWith('findById'))).toEqual(['update:t-1@acme']);
    });

    it('tracks, creates and removes by the whole key', async () => {
      const { manager } = tariffsOver();
      const acme = manager.track({ id: 't-1', tenant: 'acme', price: 10 });

      const [globex] = manager.trackMany([{ id: 't-1', tenant: 'globex', price: 20 }]);
      const initech = manager.create({ id: 't-1', tenant: 'initech', price: 30 });
      manager.remove(acme);

      expect(globex).not.toBe(acme);
      expect(await manager.findById('t-1', 'acme')).toBeUndefined();
      expect(await manager.findById('t-1', 'globex')).toBe(globex);
      expect(await manager.findById('t-1', 'initech')).toBe(initech);
      expect(() => manager.create({ id: 't-1', tenant: 'globex', price: 1 })).toThrow(EntityIdentityError);
    });

    it('refuses a read by more than the id when the repository does not say what its key is', async () => {
      const repository = new TariffRepository();
      const manager = new EntityManager<IRepository<TariffDto>>({
        entityName: 'Tariff',
        findById: repository.findById.bind(repository),
        create: repository.create.bind(repository),
        update: repository.update.bind(repository),
        delete: repository.delete.bind(repository),
      });

      await expect(manager.findById('t-1', ...(['acme'] as never[]))).rejects.toThrow(/keyOf/);
      expect(repository.calls).toEqual([]);
    });

    it('refuses to flush an entity whose key was changed', async () => {
      const { manager } = tariffsOver();
      (await manager.findByIdOrFail('t-1', 'acme')).state.tenant = 'globex';

      await expect(manager.flush()).rejects.toThrow(/key of Tariff t-1 was changed/);
    });

    it('reloads a record by its whole key', async () => {
      const { manager, repository } = tariffsOver();
      const globex = await manager.findByIdOrFail('t-1', 'globex');

      await manager.reload(globex);

      expect(repository.calls).toEqual(['findById:t-1@globex', 'findById:t-1@globex']);
    });

    it('reads many ids under the same rest of the key', async () => {
      const { manager, repository } = tariffsOver();

      const found = await manager.findByIds(['t-1', 't-2'], 'globex');

      expect(found.map((t) => t.state.price)).toEqual([20]);
      expect(repository.calls).toEqual(['findById:t-1@globex', 'findById:t-2@globex']);
    });

    it('names the whole key of a record that was not found', async () => {
      const { manager } = tariffsOver();

      await expect(manager.findByIdOrFail('t-9', 'acme')).rejects.toMatchObject({
        id: 't-9',
        key: ['t-9', 'acme'],
        message: expect.stringMatching(/^Tariff t-9 \(acme\) was not found/),
      });
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

  describe('Story: add a record whose id is reserved before it is written', () => {
    type NoteDto = { id: string; text: string; author?: string };

    const INoteIdsToken = new SingleToken<IIdGenerator<string>>('INoteIds');
    const IAuthorToken = new SingleToken<string>('IAuthor');
    const INoteRepositoryToken = repositoryToken<NoteRepository>('INoteRepository');

    // An id generator the way a sequence is one: each call reserves the next id.
    class NoteIds implements IIdGenerator<string> {
      private last = 0;

      async next(): Promise<string> {
        return `n-${++this.last}`;
      }
    }

    // A store that writes down every call; how its new records get ids is woven in, not written here.
    @register(
      INoteRepositoryToken,
      scope((s) => s.hasTag('application')),
      decorate(
        preparing(withId(INoteIdsToken), (scope) => (note: object) => ({
          ...note,
          author: IAuthorToken.resolve(scope),
        })),
      ),
      singleton(),
    )
    class NoteRepository implements IRepository<NoteDto> {
      readonly entityName = 'Note';
      readonly calls: string[] = [];

      async findById(id: string): Promise<NoteDto | undefined> {
        this.calls.push(`findById:${id}`);
        return undefined;
      }

      async create(note: NoteDto): Promise<NoteDto> {
        this.calls.push(`create:${note.id}:${note.author}`);
        return note;
      }

      async update(stored: NoteDto, diff: Partial<NoteDto>): Promise<NoteDto> {
        return { ...stored, ...diff };
      }

      async delete(): Promise<void> {}
    }

    const app = () =>
      new Container({ tags: ['application'] })
        .addRegistration(R.fromClass(NoteIds).bindTo(INoteIdsToken).pipe(singleton()))
        .addRegistration(R.fromValue('ada').bindTo(IAuthorToken))
        .addRegistration(R.fromClass(NoteRepository))
        .addRegistration(R.fromClass(EntityManager).when((s) => s.hasTag('request')));

    it('adds a new record with the id its repository reserved, tracked at once and written at the flush', async () => {
      const request = app().createScope({ tags: ['request'] });
      const notes = entityManagerToken(INoteRepositoryToken).resolve(request);

      const note = await notes.add({ text: 'Hi' });

      expect([note.id, note.state, note.isNew]).toEqual(['n-1', { id: 'n-1', text: 'Hi', author: 'ada' }, true]);
      expect(await notes.findById('n-1')).toBe(note);
      expect(notes.repository.calls).toEqual([]);

      await flushEntityManagers(request);

      expect(notes.repository.calls).toEqual(['create:n-1:ada']);
    });

    it('lets a record added this way be referenced by its id before the commit', async () => {
      const request = app().createScope({ tags: ['request'] });
      const notes = entityManagerToken(INoteRepositoryToken).resolve(request);

      const first = await notes.add({ text: 'First' });
      const reply = await notes.add({ text: `Re: ${first.id}` });

      expect(reply.state.text).toBe('Re: n-1');
      expect(reply.id).toBe('n-2');
    });

    it('leaves the repository itself: its class, methods and fields', () => {
      const container = app();
      const request = container.createScope({ tags: ['request'] });

      const repository = INoteRepositoryToken.resolve(request);

      expect(repository).toBeInstanceOf(NoteRepository);
      expect(repository).toBe(INoteRepositoryToken.resolve(container));
      expect(entityManagerToken(INoteRepositoryToken).resolve(request).repository).toBe(repository);
      expect(repository.calls).toEqual([]);
    });

    it('refuses to add to a repository that cannot prepare a new record', async () => {
      const { manager } = managerOver();

      await expect(manager.add(order('o-9'))).rejects.toThrow(EntityIdentityError);
      await expect(manager.add(order('o-9'))).rejects.toThrow(/preparing\(withId/);
    });
  });

  describe('Story: discard, detach and reload', () => {
    it('reverts a change: state goes back to what is stored, in place, and nothing is written', async () => {
      const { manager, repository } = managerOver(order('o-1'));
      const found = await manager.findByIdOrFail('o-1');
      const { state } = found;
      found.cancel();
      found.addLine('idle', 1);

      expect(found.revert()).toBe(found);

      expect(found.state).toBe(state);
      expect(found.state).toEqual(order('o-1'));
      expect(manager.hasChanges()).toBe(false);
      await manager.flush();
      expect(repository.calls).toEqual(['findById:o-1']);
    });

    it('reverts a removal: the id reads again, and nothing is deleted', async () => {
      const { manager, repository } = managerOver(order('o-1'));
      const found = await manager.findByIdOrFail('o-1');
      manager.remove(found);

      found.revert();

      expect(await manager.findById('o-1')).toBe(found);
      await manager.flush();
      expect(repository.calls).toEqual(['findById:o-1']);
    });

    it('reverts the links of a new entity and keeps its state', async () => {
      const { manager, repository } = managerOver();
      const created = manager.create(order('o-3'));
      const lazyLog: string[] = [];
      const lazy = new EntityManager<IRepository<OrderDto>>({
        entityName: 'Order',
        findById: async () => undefined,
        create: async (value) => {
          lazyLog.push(value.id);
          return value;
        },
        update: async (stored) => stored,
        delete: async () => undefined,
      }).lazy(order('o-4'));
      created.link('customer', lazy);

      created.revert();
      await manager.flush();

      expect(created.state).toEqual(order('o-3'));
      expect(lazyLog).toEqual([]);
      expect(repository.calls).toEqual(['create:o-3']);
    });

    it('detaches an entity: the flush ignores it, and the next read answers a new one', async () => {
      const { manager, repository } = managerOver(order('o-1'));
      const found = await manager.findByIdOrFail('o-1');
      found.cancel();

      manager.detach(found);
      await manager.flush();
      const again = await manager.findByIdOrFail('o-1');

      expect(again).not.toBe(found);
      expect(again.state.status).toBe('open');
      expect(repository.calls).toEqual(['findById:o-1', 'findById:o-1']);
      expect(() => manager.detach(found)).toThrow(EntityNotFoundError);
    });

    it('clears the whole identity map', async () => {
      const { manager, repository } = managerOver(order('o-1'), order('o-2'));
      const found = await manager.findByIdOrFail('o-1');
      found.cancel();
      manager.create(order('o-3'));

      manager.clear();

      expect(manager.hasChanges()).toBe(false);
      expect(() => manager.remove(found)).toThrow(EntityNotFoundError);
      await manager.flush();
      expect(repository.calls).toEqual(['findById:o-1']);
    });

    it('reloads an entity from the repository, dropping what this unit of work changed', async () => {
      const { manager, repository } = managerOver(order('o-1'));
      const found = await manager.findByIdOrFail('o-1');
      const { state } = found;
      found.addLine('idle', 1);
      repository.rows.set('o-1', order('o-1', { status: 'cancelled' }));

      expect(await manager.reload(found)).toBe(found);

      expect(found.state).toBe(state);
      expect(found.state.status).toBe('cancelled');
      expect(found.getStored()?.status).toBe('cancelled');
      expect(found.hasChanges()).toBe(false);
    });

    it('stops tracking an entity whose record is gone when reloaded', async () => {
      const { manager, repository } = managerOver(order('o-1'));
      const found = await manager.findByIdOrFail('o-1');
      repository.rows.delete('o-1');

      expect(await manager.reload(found)).toBeUndefined();

      expect(() => manager.detach(found)).toThrow(EntityNotFoundError);
    });

    it('refuses to reload a new entity, or one it does not track', async () => {
      const { manager } = managerOver();

      await expect(manager.reload(manager.create(order('o-3')))).rejects.toBeInstanceOf(EntityNotFoundError);
      await expect(manager.reload(new Order(order('o-9')))).rejects.toBeInstanceOf(EntityNotFoundError);
    });
  });

  describe('Story: retry a commit that failed', () => {
    // A store whose writes to the ids in `failing` throw, as a database does when the transaction aborts.
    class FlakyOrderRepository extends OrderRepository {
      readonly failing = new Set<string>();

      override async update(stored: OrderDto, diff: Partial<OrderDto>): Promise<OrderDto> {
        if (this.failing.has(stored.id)) throw new Error(`cannot update ${stored.id}`);
        return super.update(stored, diff);
      }
    }

    const flakyOver = (...orders: OrderDto[]) => {
      const repository = new FlakyOrderRepository(...orders);
      return { manager: new EntityManager(repository), repository };
    };

    it('keeps every pending change when a write fails, so a retry sends the same writes', async () => {
      const { manager, repository } = flakyOver(order('o-1'), order('o-2'));
      const first = await manager.findByIdOrFail('o-1');
      const second = await manager.findByIdOrFail('o-2');
      first.cancel();
      second.cancel();
      repository.failing.add('o-2');

      await expect(manager.flush()).rejects.toThrow('cannot update o-2');
      expect([first.hasChanges(), second.hasChanges()]).toEqual([true, true]);
      expect(first.getStored()?.status).toBe('open');

      repository.failing.clear();
      repository.calls.length = 0;
      await manager.flush();

      expect(repository.calls).toEqual(['update:o-1:status', 'update:o-2:status']);
      expect(manager.hasChanges()).toBe(false);
    });

    it('keeps a removed entity pending removal, and deletes it on the retry', async () => {
      const { manager, repository } = flakyOver(order('o-1'), order('o-2'));
      manager.remove(await manager.findByIdOrFail('o-1'));
      (await manager.findByIdOrFail('o-2')).cancel();
      repository.failing.add('o-2');

      await expect(manager.flush()).rejects.toThrow();
      expect(await manager.findById('o-1')).toBeUndefined();

      repository.failing.clear();
      repository.calls.length = 0;
      await manager.flush();

      expect(repository.calls).toEqual(['delete:o-1', 'update:o-2:status']);
    });

    it('is all or nothing across the managers flushEntityManagers flushes', async () => {
      const IOtherRepositoryToken = repositoryToken<FlakyOrderRepository>('IOtherRepository');
      const repository = new FlakyOrderRepository(order('o-1'));
      const other = new FlakyOrderRepository(order('x-1'));
      const container = new Container({ tags: ['application'] })
        .addRegistration(R.fromValue(repository).bindTo(IOrderRepositoryToken))
        .addRegistration(R.fromValue(other).bindTo(IOtherRepositoryToken))
        .addRegistration(R.fromClass(EntityManager).when((s) => s.hasTag('request')));
      const request = container.createScope({ tags: ['request'] });
      const orders = entityManagerToken(IOrderRepositoryToken).resolve(request);
      const others = entityManagerToken(IOtherRepositoryToken).resolve(request);
      (await orders.findByIdOrFail('o-1')).cancel();
      (await others.findByIdOrFail('x-1')).cancel();
      other.failing.add('x-1');

      await expect(flushEntityManagers(request)).rejects.toThrow('cannot update x-1');
      expect(orders.hasChanges()).toBe(true);

      other.failing.clear();
      await flushEntityManagers(request);

      expect(repository.calls.filter((c) => c.startsWith('update'))).toEqual([
        'update:o-1:status',
        'update:o-1:status',
      ]);
      expect([orders.hasChanges(), others.hasChanges()]).toEqual([false, false]);
    });
  });

  describe('Story: link a record that does not exist yet, created when its holder is flushed', () => {
    type AuthorDto = { id: string; name: string; pinnedCommentId: string | null };
    type CommentDto = { id: string; text: string; authorId: string | null };
    type TagDto = { id: string; label: string };
    type PostDto = { id: string; title: string; commentId: string | null; tagIds: string[] };

    // A store that mints ids the way a serial column does, writing every write into one log shared by all stores.
    class SerialRepository<S extends IEntity & { id: string }> implements IRepository<S, Entity<S>, Omit<S, 'id'>> {
      readonly rows = new Map<string, S>();
      private next = 0;

      constructor(
        readonly entityName: string,
        private readonly prefix: string,
        private readonly log: string[],
        ...rows: S[]
      ) {
        for (const row of rows) this.rows.set(row.id, row);
      }

      async findById(id: string): Promise<S | undefined> {
        return this.rows.get(id);
      }

      async create(value: Omit<S, 'id'>): Promise<S> {
        const row = { ...value, id: `${this.prefix}-${++this.next}` } as S;
        this.log.push(`create ${row.id} ${JSON.stringify(value)}`);
        this.rows.set(row.id, row);
        return row;
      }

      async update(stored: S, diff: Partial<S>): Promise<S> {
        this.log.push(`update ${stored.id} ${JSON.stringify(diff)}`);
        const row = { ...stored, ...diff };
        this.rows.set(stored.id, row);
        return row;
      }

      async delete(stored: S): Promise<void> {
        this.log.push(`delete ${stored.id}`);
        this.rows.delete(stored.id);
      }
    }

    const blog = () => {
      const log: string[] = [];
      return {
        log,
        authors: new EntityManager(new SerialRepository<AuthorDto>('Author', 'a', log)),
        comments: new EntityManager(new SerialRepository<CommentDto>('Comment', 'c', log)),
        tags: new EntityManager(new SerialRepository<TagDto>('Tag', 't', log)),
        posts: new EntityManager(
          new SerialRepository<PostDto>('Post', 'p', log, { id: 'p-0', title: 'Hello', commentId: null, tagIds: [] }),
        ),
      };
    };

    it("creates the linked record when its holder is flushed, and sets its id on the holder's field", async () => {
      const { log, comments, posts } = blog();
      const comment = comments.lazy({ text: 'First!', authorId: null });
      const post = await posts.findByIdOrFail('p-0');

      post.link('commentId', comment);
      expect(log).toEqual([]);
      expect(post.state.commentId).toBeNull();
      expect(posts.hasChanges()).toBe(true);
      await posts.flush();

      expect(log).toEqual(['create c-1 {"text":"First!","authorId":null}', 'update p-0 {"commentId":"c-1"}']);
      expect(post.state.commentId).toBe('c-1');
      expect(await comments.findByIdOrFail('c-1')).toBe(await comment.resolve());
    });

    it('never creates a record nothing flushed links', async () => {
      const { log, comments, posts } = blog();
      comments.lazy({ text: 'Draft', authorId: null });
      await posts.findByIdOrFail('p-0');

      await posts.flush();
      await comments.flush();

      expect(log).toEqual([]);
    });

    it('creates a record linked into several holders once, giving each the same id', async () => {
      const { log, comments, posts } = blog();
      const comment = comments.lazy({ text: 'Shared', authorId: null });
      const first = (await posts.findByIdOrFail('p-0')).link('commentId', comment);
      const second = posts
        .create({ id: 'p-9', title: 'Again', commentId: null, tagIds: [] })
        .link('commentId', comment);

      await posts.flush();

      expect(log.filter((line) => line.startsWith('create c'))).toHaveLength(1);
      expect([first.state.commentId, second.state.commentId]).toEqual(['c-1', 'c-1']);
    });

    it('creates the records linked into a linked record first, and links ids and records mixed in an array field', async () => {
      const { log, authors, comments, tags, posts } = blog();
      const author = authors.lazy({ name: 'Ada', pinnedCommentId: null });
      const post = await posts.findByIdOrFail('p-0');

      post
        .link('commentId', comments.lazy({ text: 'Nested', authorId: null }).link('authorId', author))
        .link('tagIds', ['t-0', tags.lazy({ label: 'news' })]);
      await posts.flush();

      expect(log).toEqual([
        'create a-1 {"name":"Ada","pinnedCommentId":null}',
        'create c-1 {"text":"Nested","authorId":"a-1"}',
        'create t-1 {"label":"news"}',
        'update p-0 {"commentId":"c-1","tagIds":["t-0","t-1"]}',
      ]);
    });

    it('creates a new holder with the id of the record linked into it', async () => {
      const { log, comments, posts } = blog();

      posts
        .create({ id: 'p-9', title: 'New', commentId: null, tagIds: [] })
        .link('commentId', comments.lazy({ text: 'Hi', authorId: null }));
      await posts.flush();

      expect(log).toEqual([
        'create c-1 {"text":"Hi","authorId":null}',
        'create p-1 {"id":"p-9","title":"New","commentId":"c-1","tagIds":[]}',
      ]);
    });

    it('does not create what a removed holder linked', async () => {
      const { log, comments, posts } = blog();
      const post = (await posts.findByIdOrFail('p-0')).link(
        'commentId',
        comments.lazy({ text: 'Gone', authorId: null }),
      );

      posts.remove(post);
      await posts.flush();

      expect(log).toEqual(['delete p-0']);
    });

    it('keeps its own copy of the value it will create', async () => {
      const { log, comments, posts } = blog();
      const value = { text: 'Original', authorId: null };
      const comment = comments.lazy(value);
      value.text = 'Changed';

      (await posts.findByIdOrFail('p-0')).link('commentId', comment);
      await posts.flush();

      expect(log[0]).toBe('create c-1 {"text":"Original","authorId":null}');
    });

    it('creates a linked record again when the flush that created it failed', async () => {
      const { log, comments, posts } = blog();
      const comment = comments.lazy({ text: 'Retried', authorId: null });
      const post = (await posts.findByIdOrFail('p-0')).link('commentId', comment);
      const update = posts.repository.update.bind(posts.repository);
      posts.repository.update = async () => {
        throw new Error('transaction aborted');
      };

      await expect(posts.flush()).rejects.toThrow('transaction aborted');
      expect(post.state.commentId).toBeNull();
      expect(post.hasChanges()).toBe(true);

      posts.repository.update = update;
      await posts.flush();

      expect(log).toEqual([
        'create c-1 {"text":"Retried","authorId":null}',
        'create c-2 {"text":"Retried","authorId":null}',
        'update p-0 {"commentId":"c-2"}',
      ]);
      expect(post.state.commentId).toBe('c-2');
      expect((await comment.resolve()).id).toBe('c-2');
    });

    it('fails with EntityReferenceError when links form a cycle', async () => {
      const { authors, comments, posts } = blog();
      const comment = comments.lazy({ text: 'Loop', authorId: null });
      const author = authors.lazy({ name: 'Ada', pinnedCommentId: null }).link('pinnedCommentId', comment);
      comment.link('authorId', author);
      (await posts.findByIdOrFail('p-0')).link('commentId', comment);

      await expect(posts.flush()).rejects.toBeInstanceOf(EntityReferenceError);
    });
  });
});
