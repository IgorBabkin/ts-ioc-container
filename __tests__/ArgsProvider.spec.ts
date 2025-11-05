import {
  args,
  argsFn,
  bindTo,
  Container,
  inject,
  MultiCache,
  register,
  Registration as R,
  resolveByArgs,
  singleton,
  StringToken,
} from '../lib';

@register(bindTo('logger'))
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

    const logger = root.createScope().resolve<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('can assign argument to provider', function () {
    const root = createContainer().addRegistration(R.fromClass(Logger).pipe(args('name')));

    const logger = root.resolve<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('should set provider arguments with highest priority in compare to resolve arguments', function () {
    const root = createContainer().addRegistration(R.fromClass(Logger).pipe(args('name')));

    const logger = root.resolve<Logger>('logger', { args: ['file'] });

    expect(logger.name).toBe('name');
    expect(logger.type).toBe('file');
  });

  it('should resolve dependency by passing arguments resolve from container by another argument', function () {
    interface IRepository {
      name: string;
    }

    const IUserRepositoryKey = new StringToken<IRepository>('IUserRepository');
    const ITodoRepositoryKey = new StringToken<IRepository>('ITodoRepository');

    @register(bindTo(IUserRepositoryKey))
    class UserRepository implements IRepository {
      name = 'UserRepository';
    }

    @register(bindTo(ITodoRepositoryKey))
    class TodoRepository implements IRepository {
      name = 'TodoRepository';
    }

    interface IEntityManager {
      repository: IRepository;
    }

    const IEntityManagerKey = new StringToken<IEntityManager>('IEntityManager');

    @register(bindTo(IEntityManagerKey), argsFn(resolveByArgs))
    class EntityManager {
      constructor(public repository: IRepository) {}
    }

    class Main {
      constructor(
        @inject(IEntityManagerKey.args(IUserRepositoryKey)) public userEntities: EntityManager,
        @inject(IEntityManagerKey.args(ITodoRepositoryKey)) public todoEntities: EntityManager,
      ) {}
    }

    const root = createContainer()
      .addRegistration(R.fromClass(EntityManager))
      .addRegistration(R.fromClass(UserRepository))
      .addRegistration(R.fromClass(TodoRepository));
    const main = root.resolve(Main);

    expect(main.userEntities.repository).toBeInstanceOf(UserRepository);
    expect(main.todoEntities.repository).toBeInstanceOf(TodoRepository);
  });

  it('should resolve memoized dependency by passing arguments resolve from container by another argument', function () {
    interface IRepository {
      name: string;
    }

    const IUserRepositoryKey = new StringToken<IRepository>('IUserRepository');
    const ITodoRepositoryKey = new StringToken<IRepository>('ITodoRepository');

    @register(bindTo(IUserRepositoryKey))
    class UserRepository implements IRepository {
      name = 'UserRepository';
    }

    @register(bindTo(ITodoRepositoryKey))
    class TodoRepository implements IRepository {
      name = 'TodoRepository';
    }

    interface IEntityManager {
      repository: IRepository;
    }

    const IEntityManagerKey = new StringToken<IEntityManager>('IEntityManager');

    @register(bindTo(IEntityManagerKey), argsFn(resolveByArgs), singleton(MultiCache.fromFirstArg))
    class EntityManager {
      constructor(public repository: IRepository) {}
    }

    class Main {
      constructor(
        @inject(IEntityManagerKey.args(IUserRepositoryKey)) public userEntities: EntityManager,
        @inject(IEntityManagerKey.args(ITodoRepositoryKey)) public todoEntities: EntityManager,
      ) {}
    }

    const root = createContainer()
      .addRegistration(R.fromClass(EntityManager))
      .addRegistration(R.fromClass(UserRepository))
      .addRegistration(R.fromClass(TodoRepository));
    const main = root.resolve(Main);

    const userRepository = IEntityManagerKey.args(IUserRepositoryKey).resolve(root).repository;
    expect(userRepository).toBeInstanceOf(UserRepository);
    expect(main.userEntities.repository).toBe(userRepository);

    const todoRepository = IEntityManagerKey.args(IUserRepositoryKey).resolve(root).repository;
    expect(todoRepository).toBeInstanceOf(TodoRepository);
    expect(main.todoEntities.repository).toBe(todoRepository);
  });
});
