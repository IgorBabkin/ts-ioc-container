import 'reflect-metadata';

import {
  Entity,
  EntityIdentityError,
  EntityManager,
  EntityManagerArgumentError,
  EntityNotFoundError,
  EntityReferenceError,
  type IRepository,
} from '../lib';

type Dto = { id: string; name: string; otherId: string | null };

const repository: IRepository<Dto, Entity<Dto>, Omit<Dto, 'id'>> = {
  entityName: 'Thing',
  findById: async () => undefined,
  create: async (value) => ({ ...value, id: 'new' }),
  update: async (stored, diff) => ({ ...stored, ...diff }),
  delete: async () => undefined,
};

describe('errors', () => {
  it.each([
    [new EntityNotFoundError('Order', 'o-1'), EntityNotFoundError, 'EntityNotFoundError', 'IOC_ENTITY_NOT_FOUND'],
    [new EntityIdentityError('x'), EntityIdentityError, 'EntityIdentityError', 'IOC_ENTITY_IDENTITY'],
    [new EntityReferenceError('x'), EntityReferenceError, 'EntityReferenceError', 'IOC_ENTITY_REFERENCE'],
    [
      new EntityManagerArgumentError(),
      EntityManagerArgumentError,
      'EntityManagerArgumentError',
      'IOC_ENTITY_MANAGER_ARGUMENT',
    ],
  ])('%s has a stable name and code, and survives instanceof', (error, Type, name, code) => {
    expect(error).toBeInstanceOf(Type);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(name);
    expect(error.code).toBe(code);
  });

  it('EntityNotFoundError names the record and points at findById', async () => {
    const error = await new EntityManager(repository).findByIdOrFail('t-9').catch((e: unknown) => e);

    expect(error).toMatchObject({ entityName: 'Thing', id: 't-9' });
    expect((error as Error).message).toMatch(/Thing t-9 was not found.*findById/);
  });

  it('EntityIdentityError says what to do instead', async () => {
    const manager = new EntityManager(repository);
    const entity = manager.create({ id: 't-1', name: 'a', otherId: null });

    expect(() => manager.create({ id: 't-1', name: 'b', otherId: null })).toThrow(/change the tracked entity/);
    expect(() => entity.patch({ id: 't-2' })).toThrow(/leave id out of the patch/);
    entity.state.id = 't-2';
    await expect(manager.flush()).rejects.toThrow(/create a new entity and remove this one/);
  });

  it('EntityReferenceError says how to break the cycle', async () => {
    const manager = new EntityManager(repository);
    const a = manager.lazy({ name: 'a', otherId: null });
    const b = manager.lazy({ name: 'b', otherId: null }).link('otherId', a);
    a.link('otherId', b);
    manager.create({ id: 't-1', name: 'holder', otherId: null }).link('otherId', a);

    await expect(manager.flush()).rejects.toThrow(/Break the cycle/);
  });

  it('EntityManagerArgumentError says how to resolve an entity manager', () => {
    expect(new EntityManagerArgumentError().message).toMatch(/entityManagerToken\(IMyRepositoryToken\)/);
  });
});
