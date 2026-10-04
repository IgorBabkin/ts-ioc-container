import 'reflect-metadata';
import { Container, Registration as R, SingleToken } from 'ts-ioc-container';

import {
  EntityIdentityError,
  EntityManager,
  EntityNotFoundError,
  EntityReferenceError,
  type IRepository,
  IUnitOfWorkToken,
  UnitOfWork,
} from '../lib';

type Dto = { id: string; name: string; otherId: string | null };

const repository = (references: IRepository<Dto>['references'] = {}): IRepository<Dto> => ({
  entityName: 'Thing',
  references,
  findById: async () => undefined,
  create: async (record) => record,
  update: async (stored, diff) => ({ ...stored, ...diff }),
  delete: async () => undefined,
});

describe('errors', () => {
  it.each([
    [new EntityNotFoundError('Order', 'o-1'), EntityNotFoundError, 'EntityNotFoundError', 'IOC_ENTITY_NOT_FOUND'],
    [new EntityIdentityError('x'), EntityIdentityError, 'EntityIdentityError', 'IOC_ENTITY_IDENTITY'],
    [new EntityReferenceError('x'), EntityReferenceError, 'EntityReferenceError', 'IOC_ENTITY_REFERENCE'],
  ])('%s has a stable name and code, and survives instanceof', (error, Type, name, code) => {
    expect(error).toBeInstanceOf(Type);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(name);
    expect(error.code).toBe(code);
  });

  it('EntityNotFoundError names the record and points at findById', async () => {
    const error = await new EntityManager(repository()).findByIdOrFail('t-9').catch((e: unknown) => e);

    expect(error).toMatchObject({ entityName: 'Thing', id: 't-9', key: 't-9' });
    expect((error as Error).message).toMatch(/Thing t-9 was not found.*findById/);
  });

  it('EntityIdentityError says what to do instead', async () => {
    const manager = new EntityManager(repository());
    const entity = manager.create({ id: 't-1', name: 'a', otherId: null });

    expect(() => manager.create({ id: 't-1', name: 'b', otherId: null })).toThrow(/change the tracked entity/);
    expect(() => entity.patch({ id: 't-2' })).toThrow(/leave id out of the patch/);
    await expect(manager.add({ name: 'c', otherId: null })).rejects.toThrow(/decorate\(preparing\(withId/);
    entity.state.id = 't-2';
    await expect(manager.flush()).rejects.toThrow(/create a new entity and remove this one/);
  });

  it('EntityReferenceError names the records and says how to break the cycle', async () => {
    const IThingsToken = new SingleToken<IRepository<Dto>>('IThings');
    const scope = new Container()
      .addRegistration(R.fromValue(repository({ otherId: IThingsToken })).bindTo(IThingsToken))
      .addRegistration(R.fromClass(UnitOfWork));
    const uow = IUnitOfWorkToken.resolve(scope);
    uow.of(IThingsToken).create({ id: 't-1', name: 'a', otherId: 't-2' });
    uow.of(IThingsToken).create({ id: 't-2', name: 'b', otherId: 't-1' });

    await expect(uow.commit()).rejects.toThrow(/Thing t-1, Thing t-2 reference each other.*deferrable/);
  });
});
