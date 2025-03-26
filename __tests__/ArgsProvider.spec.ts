import 'reflect-metadata';
import {
  args,
  argsFn,
  Container,
  type DependencyKey,
  inject,
  MultiCache,
  register,
  Registration as R,
  singleton,
} from '../lib';

@register('logger')
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
    const root = createContainer().addRegistration(R.fromClass(Logger).pipe(argsFn((container, ...args) => ['name'])));

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

    @register('UserRepository')
    class UserRepository implements IRepository {
      name = 'UserRepository';
    }

    @register('TodoRepository')
    class TodoRepository implements IRepository {
      name = 'TodoRepository';
    }

    @register('EntityManager', argsFn((container, token) => [container.resolve(token as DependencyKey)]))
    class EntityManager {
      constructor(public repository: IRepository) {}
    }

    class Main {
      constructor(
        @inject((s) => s.resolve('EntityManager', { args: ['UserRepository'] })) public userEntities: EntityManager,
        @inject((s) => s.resolve('EntityManager', { args: ['TodoRepository'] })) public todoEntities: EntityManager,
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

    @register('UserRepository')
    class UserRepository implements IRepository {
      name = 'UserRepository';
    }

    @register('TodoRepository')
    class TodoRepository implements IRepository {
      name = 'TodoRepository';
    }

    @register(
      'EntityManager',
      argsFn((container, token) => [container.resolve(token as DependencyKey)]),
      singleton(() => new MultiCache((...args: unknown[]) => args[0] as DependencyKey)),
    )
    class EntityManager {
      constructor(public repository: IRepository) {}
    }

    class Main {
      constructor(
        @inject((s) => s.resolve('EntityManager', { args: ['UserRepository'] })) public userEntities: EntityManager,
        @inject((s) => s.resolve('EntityManager', { args: ['TodoRepository'] })) public todoEntities: EntityManager,
      ) {}
    }

    const root = createContainer()
      .addRegistration(R.fromClass(EntityManager))
      .addRegistration(R.fromClass(UserRepository))
      .addRegistration(R.fromClass(TodoRepository));
    const main = root.resolve(Main);

    const userRepository = root.resolve<EntityManager>('EntityManager', { args: ['UserRepository'] }).repository;
    expect(userRepository).toBeInstanceOf(UserRepository);
    expect(main.userEntities.repository).toBe(userRepository);

    const todoRepository = root.resolve<EntityManager>('EntityManager', { args: ['TodoRepository'] }).repository;
    expect(todoRepository).toBeInstanceOf(TodoRepository);
    expect(main.todoEntities.repository).toBe(todoRepository);
  });
});
