import {
  args,
  argsFn,
  asKey,
  by,
  Container,
  depKey,
  inject,
  MultiCache,
  register,
  Registration as R,
  singleton,
} from '../lib';
import { resolveByArgs } from '../lib/provider/IProvider';

@register(asKey('logger'))
class Logger {
  constructor(
    public name: string,
    public type?: string,
  ) {}
}

describe('ArgsProvider', function () {
  function createContainer() {
    return new Container();
  }

  it('can assign argument function to provider', function () {
    const root = createContainer().addRegistration(R.fromClass(Logger).pipe(argsFn(() => ['name'])));

    const logger = root.createScope().resolveOne<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('can assign argument to provider', function () {
    const root = createContainer().addRegistration(R.fromClass(Logger).pipe(args('name')));

    const logger = root.resolveOne<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('should set provider arguments with highest priority in compare to resolve arguments', function () {
    const root = createContainer().addRegistration(R.fromClass(Logger).pipe(args('name')));

    const logger = root.resolveOne<Logger>('logger', { args: ['file'] });

    expect(logger.name).toBe('name');
    expect(logger.type).toBe('file');
  });

  it('should resolve dependency by passing arguments resolve from container by another argument', function () {
    interface IRepository {
      name: string;
    }

    const IUserRepositoryKey = depKey<IRepository>('IUserRepository');
    const ITodoRepositoryKey = depKey<IRepository>('ITodoRepository');

    @register(IUserRepositoryKey.asKey)
    class UserRepository implements IRepository {
      name = 'UserRepository';
    }

    @register(ITodoRepositoryKey.asKey)
    class TodoRepository implements IRepository {
      name = 'TodoRepository';
    }

    interface IEntityManager {
      repository: IRepository;
    }

    const IEntityManagerKey = depKey<IEntityManager>('IEntityManager');

    @register(IEntityManagerKey.asKey, argsFn(resolveByArgs))
    class EntityManager {
      constructor(public repository: IRepository) {}
    }

    class Main {
      constructor(
        @inject(by.one(IEntityManagerKey).args(IUserRepositoryKey)) public userEntities: EntityManager,
        @inject(by.one(IEntityManagerKey).args(ITodoRepositoryKey)) public todoEntities: EntityManager,
      ) {}
    }

    const root = createContainer()
      .addRegistration(R.fromClass(EntityManager))
      .addRegistration(R.fromClass(UserRepository))
      .addRegistration(R.fromClass(TodoRepository));
    const main = root.resolveOne(Main);

    expect(main.userEntities.repository).toBeInstanceOf(UserRepository);
    expect(main.todoEntities.repository).toBeInstanceOf(TodoRepository);
  });

  it('should resolve memoized dependency by passing arguments resolve from container by another argument', function () {
    interface IRepository {
      name: string;
    }

    const IUserRepositoryKey = depKey<IRepository>('IUserRepository');
    const ITodoRepositoryKey = depKey<IRepository>('ITodoRepository');

    @register(IUserRepositoryKey.asKey)
    class UserRepository implements IRepository {
      name = 'UserRepository';
    }

    @register(ITodoRepositoryKey.asKey)
    class TodoRepository implements IRepository {
      name = 'TodoRepository';
    }

    interface IEntityManager {
      repository: IRepository;
    }

    const IEntityManagerKey = depKey<IEntityManager>('IEntityManager');

    @register(IEntityManagerKey.asKey, argsFn(resolveByArgs), singleton(MultiCache.fromFirstArg))
    class EntityManager {
      constructor(public repository: IRepository) {}
    }

    class Main {
      constructor(
        @inject(by.one(IEntityManagerKey).args(IUserRepositoryKey)) public userEntities: EntityManager,
        @inject(by.one(IEntityManagerKey).args(ITodoRepositoryKey)) public todoEntities: EntityManager,
      ) {}
    }

    const root = createContainer()
      .addRegistration(R.fromClass(EntityManager))
      .addRegistration(R.fromClass(UserRepository))
      .addRegistration(R.fromClass(TodoRepository));
    const main = root.resolveOne(Main);

    const userRepository = IEntityManagerKey.resolve(root, { args: [IUserRepositoryKey] }).repository;
    expect(userRepository).toBeInstanceOf(UserRepository);
    expect(main.userEntities.repository).toBe(userRepository);

    const todoRepository = IEntityManagerKey.resolve(root, { args: [ITodoRepositoryKey] }).repository;
    expect(todoRepository).toBeInstanceOf(TodoRepository);
    expect(main.todoEntities.repository).toBe(todoRepository);
  });
});
