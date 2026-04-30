import {
  args,
  bindTo,
  Container,
  inject,
  register,
  Registration as R,
  setArgs,
  setArgsFn,
  SingleToken,
  singleton,
} from '../../lib';

/**
 * Advanced - Arguments Provider
 *
 * You can inject arguments into providers at registration time or resolution time.
 * This is powerful for:
 * - Configuration injection
 * - Factory patterns
 * - Generic classes (like Repositories) that need to know what they are managing
 */

describe('IProvider', function () {
  function createContainer() {
    return new Container();
  }

  describe('Static Arguments', () => {
    it('can pass static arguments to constructor', function () {
      // Pre-configure the logger with a filename
      @register(setArgs('/var/log/app.log'))
      class FileLogger {
        constructor(@inject(args(0)) public filename: string) {}
      }

      const root = createContainer().addRegistration(R.fromClass(FileLogger));

      // Resolve by class name (default key) to use the registered provider
      const logger = root.resolve<FileLogger>('FileLogger');
      expect(logger.filename).toBe('/var/log/app.log');
    });

    it('prioritizes provided args over resolve args', function () {
      // 'FixedContext' wins over any runtime args
      @register(setArgs('FixedContext'))
      class Logger {
        constructor(@inject(args(0)) public context: string) {}
      }

      const root = createContainer().addRegistration(R.fromClass(Logger));

      // Even if we ask for 'RuntimeContext', we get 'FixedContext'
      const logger = root.resolve<Logger>('Logger', { args: ['RuntimeContext'] });

      expect(logger.context).toBe('FixedContext');
    });
  });

  describe('Dynamic Arguments (Factory)', () => {
    it('can resolve arguments dynamically from container', function () {
      class Config {
        env = 'production';
      }

      // Extract 'env' from Config service dynamically
      @register(setArgsFn((scope) => [scope.resolve<Config>('Config').env]))
      class Service {
        constructor(@inject(args(0)) public env: string) {}
      }

      const root = createContainer()
        .addRegistration(R.fromClass(Config)) // Key: 'Config'
        .addRegistration(R.fromClass(Service));

      const service = root.resolve<Service>('Service');
      expect(service.env).toBe('production');
    });
  });

  describe('Generic Repositories (Advanced Pattern)', () => {
    // This example demonstrates how to implement the Generic Repository pattern
    // where a generic EntityManager needs to know WHICH repository to use.

    interface IRepository {
      name: string;
    }

    // Tokens for specific repository types
    const UserRepositoryToken = new SingleToken<IRepository>('UserRepository');
    const TodoRepositoryToken = new SingleToken<IRepository>('TodoRepository');

    @register(bindTo(UserRepositoryToken))
    class UserRepository implements IRepository {
      name = 'UserRepository';
    }

    @register(bindTo(TodoRepositoryToken))
    class TodoRepository implements IRepository {
      name = 'TodoRepository';
    }

    // EntityManager is generic - it works with ANY repository.
    // The repository is the first arg passed via `EntityManagerToken.args(...)`.
    // `@inject(args(0))` reads it; the container auto-resolves InjectionToken args
    // before they reach the constructor.
    const EntityManagerToken = new SingleToken<EntityManager>('EntityManager');

    @register(
      bindTo(EntityManagerToken),
      singleton((arg1) => (arg1 as SingleToken).token), // Cache unique instance per repository type
    )
    class EntityManager {
      constructor(@inject(args(0)) public repository: IRepository) {}
    }

    class App {
      constructor(
        // Inject EntityManager configured for Users
        @inject(EntityManagerToken.args(UserRepositoryToken))
        public userManager: EntityManager,

        // Inject EntityManager configured for Todos
        @inject(EntityManagerToken.args(TodoRepositoryToken))
        public todoManager: EntityManager,
      ) {}
    }

    it('should create specialized instances based on token arguments', function () {
      const root = createContainer()
        .addRegistration(R.fromClass(EntityManager))
        .addRegistration(R.fromClass(UserRepository))
        .addRegistration(R.fromClass(TodoRepository));

      const app = root.resolve(App);

      expect(app.userManager.repository).toBeInstanceOf(UserRepository);
      expect(app.todoManager.repository).toBeInstanceOf(TodoRepository);
    });

    it('should cache specialized instances separately', function () {
      const root = createContainer()
        .addRegistration(R.fromClass(EntityManager))
        .addRegistration(R.fromClass(UserRepository))
        .addRegistration(R.fromClass(TodoRepository));

      // Resolve user manager twice
      const userManager1 = EntityManagerToken.args(UserRepositoryToken).resolve(root);
      const userManager2 = EntityManagerToken.args(UserRepositoryToken).resolve(root);

      // Should be same instance (cached)
      expect(userManager1).toBe(userManager2);

      // Resolve todo manager
      const todoManager = EntityManagerToken.args(TodoRepositoryToken).resolve(root);

      // Should be different from user manager
      expect(todoManager).not.toBe(userManager1);
    });
  });
});
