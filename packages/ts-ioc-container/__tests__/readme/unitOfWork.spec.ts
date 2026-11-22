import 'reflect-metadata';
import {
  by,
  byArgs,
  Container,
  findArgOrFail,
  hook,
  HookCollector,
  type HookFn,
  type IContainer,
  inject,
  type InjectionToken,
  isInjectionToken,
  register,
  Registration as R,
  runInOrder,
  scope,
  singleton,
  SingleToken,
  toTask,
} from '../../lib';

/**
 * Unit of work per request: identity map + commit on success
 *
 * A request reads records, several services change them, and the changes are
 * written together - in one transaction, only if the request succeeded. Within
 * the request every read of one id returns the same object, so changes made in
 * different services land on it and are written once.
 *
 * - `EntityManager` is request-scoped and resolved with a repository token as a
 *   runtime arg: `IEntityManagerToken.args(IUserRepositoryToken)`. That token is
 *   both what it works over (`byArgs(...)`) and its `singleton(...)` cache key,
 *   so every service asking for the users' manager in one request meets on the
 *   same identity map.
 * - Repository tokens carry a `repository` tag, which is how the manager picks
 *   its token out of the args.
 * - `flush()` is an `@onCommit` hook - an application-defined key. The request
 *   pipeline runs every `@onCommit` hook of the request scope inside one
 *   transaction once the handler has answered; a handler that throws commits
 *   nothing. `dispose()` then drops the scope and its identity maps.
 */

// --- Persistence -----------------------------------------------------------

interface IEntity {
  id: string;
}

/** An in-memory database whose transaction rolls back on a throw. */
class Database {
  readonly tables = new Map<string, Map<string, IEntity>>();
  transactions = 0;

  table(name: string): Map<string, IEntity> {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name)!;
  }

  async transaction(work: () => Promise<void>): Promise<void> {
    const snapshot = new Map([...this.tables].map(([name, rows]) => [name, new Map(rows)]));
    try {
      await work();
      this.transactions++;
    } catch (e) {
      this.tables.clear();
      for (const [name, rows] of snapshot) this.tables.set(name, rows);
      throw e;
    }
  }
}
const IDatabaseToken = new SingleToken<Database>('IDatabase');

interface IRepository<E extends IEntity = IEntity> {
  readonly saved: string[];
  findById(id: string): Promise<E | undefined>;
  save(entity: E): Promise<void>;
}

const repositoryToken = <E extends IEntity>(key: string) =>
  new SingleToken<IRepository<E>>(key, { tags: ['repository'] });
const isRepositoryToken = (value: unknown): value is InjectionToken<IRepository> =>
  isInjectionToken(value) && value.hasTag('repository');

interface User extends IEntity {
  name: string;
  orders: number;
}

const IUserRepositoryToken = repositoryToken<User>('IUserRepository');

// Returns copies, so only `save` changes the table.
@register(IUserRepositoryToken, scope((s) => s.hasTag('application')), singleton())
class UserRepository implements IRepository<User> {
  readonly saved: string[] = [];

  constructor(@inject(by(IDatabaseToken)) private readonly db: Database) {}

  async findById(id: string): Promise<User | undefined> {
    const row = this.db.table('users').get(id);
    return row && ({ ...row } as User);
  }

  async save(user: User): Promise<void> {
    this.saved.push(user.id);
    this.db.table('users').set(user.id, { ...user });
  }
}

// --- The unit of work ------------------------------------------------------

const onCommit = (fn: HookFn) => hook('onCommit', fn);
const onCommitHooks = new HookCollector({ key: 'onCommit' });
const invoke: HookFn = (ctx) => ctx.invokeMethod() as Promise<void>;

const repositoryTokenOf = findArgOrFail<InjectionToken<IRepository>>(isRepositoryToken);

class EntityNotFoundError extends Error {}

const IEntityManagerToken = new SingleToken<EntityManager>('IEntityManager');

@register(IEntityManagerToken, scope((s) => s.hasTag('request')), singleton(repositoryTokenOf))
class EntityManager<E extends IEntity = IEntity> {
  private readonly tracked = new Map<string, E>();

  constructor(@inject(byArgs(repositoryTokenOf)) private readonly repository: IRepository<E>) {}

  async findByIdOrFail(id: string): Promise<E> {
    const known = this.tracked.get(id);
    if (known) return known;
    const entity = await this.repository.findById(id);
    if (!entity) throw new EntityNotFoundError(id);
    this.tracked.set(id, entity);
    return entity;
  }

  @onCommit(invoke)
  async flush(): Promise<void> {
    for (const entity of this.tracked.values()) await this.repository.save(entity);
  }
}

/** The manager of one repository, typed by it. */
const entityManagerOf = <E extends IEntity>(token: SingleToken<IRepository<E>>) =>
  IEntityManagerToken.args(token) as unknown as SingleToken<EntityManager<E>>;

// --- The request pipeline --------------------------------------------------

const handleRequest = async <T>(app: IContainer, handler: (request: IContainer) => Promise<T>): Promise<T> => {
  const request = app.createScope({ tags: ['request'] });
  try {
    const result = await handler(request);
    await IDatabaseToken.resolve(request).transaction(async () => {
      const commits = request.getInstances().flatMap((i) => onCommitHooks.getActions(i, { scope: request }));
      await runInOrder(commits.map(toTask));
    });
    return result;
  } finally {
    request.dispose();
  }
};

// --- Services that only change objects -------------------------------------

class RenameUser {
  constructor(@inject(by(entityManagerOf(IUserRepositoryToken))) private readonly users: EntityManager<User>) {}

  async run(id: string, name: string): Promise<void> {
    (await this.users.findByIdOrFail(id)).name = name;
  }
}

class CountOrder {
  constructor(@inject(by(entityManagerOf(IUserRepositoryToken))) private readonly users: EntityManager<User>) {}

  async run(id: string): Promise<void> {
    (await this.users.findByIdOrFail(id)).orders++;
  }
}

describe('Unit of work per request', () => {
  const createApp = () => {
    const db = new Database();
    db.table('users').set('u-1', { id: 'u-1', name: 'alice', orders: 0 } as User);
    const app = new Container({ tags: ['application'] })
      .addRegistration(R.fromValue(db).bindTo(IDatabaseToken))
      .addRegistration(R.fromClass(UserRepository))
      .addRegistration(R.fromClass(EntityManager));
    return { app, db, users: IUserRepositoryToken.resolve(app) };
  };

  it('shares one identity map per repository per request and writes each entity once', async () => {
    const { app, db, users } = createApp();

    await handleRequest(app, async (request) => {
      await request.resolve(RenameUser).run('u-1', 'Alice');
      await request.resolve(CountOrder).run('u-1');
      expect(entityManagerOf(IUserRepositoryToken).resolve(request)).toBe(
        entityManagerOf(IUserRepositoryToken).resolve(request),
      );
    });

    expect(db.table('users').get('u-1')).toEqual({ id: 'u-1', name: 'Alice', orders: 1 });
    expect(users.saved).toEqual(['u-1']); // two changes, one write
    expect(db.transactions).toBe(1);
  });

  it('commits nothing when the handler fails', async () => {
    const { app, db, users } = createApp();

    await expect(
      handleRequest(app, async (request) => {
        await request.resolve(RenameUser).run('u-1', 'Mallory');
        throw new Error('payment declined');
      }),
    ).rejects.toThrow('payment declined');

    expect(db.table('users').get('u-1')).toMatchObject({ name: 'alice' });
    expect(users.saved).toEqual([]);
  });

  it('gives every request its own identity map', async () => {
    const { app } = createApp();
    const seen: EntityManager<User>[] = [];

    await handleRequest(app, async (r) => void seen.push(entityManagerOf(IUserRepositoryToken).resolve(r)));
    await handleRequest(app, async (r) => void seen.push(entityManagerOf(IUserRepositoryToken).resolve(r)));

    expect(seen[0]).not.toBe(seen[1]);
  });
});
