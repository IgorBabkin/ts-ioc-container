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
  SingleToken,
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

describe('ArgsProvider', function () {
  function createContainer() {
    return new Container();
  }

  describe('Static Arguments', () => {
    it('can pass static arguments to constructor', function () {
      class FileLogger {
        constructor(public filename: string) {}
      }

      // Pre-configure the logger with a filename
      const root = createContainer().addRegistration(R.fromClass(FileLogger).pipe(args('/var/log/app.log')));

      // Resolve by class name (default key) to use the registered provider
      const logger = root.resolve<FileLogger>('FileLogger');
      expect(logger.filename).toBe('/var/log/app.log');
    });

    it('prioritizes provided args over resolve args', function () {
      class Logger {
        constructor(public context: string) {}
      }

      // 'FixedContext' wins over any runtime args
      const root = createContainer().addRegistration(R.fromClass(Logger).pipe(args('FixedContext')));

      // Even if we ask for 'RuntimeContext', we get 'FixedContext'
      // Resolve by class name to use the registered provider
      const logger = root.resolve<Logger>('Logger', { args: ['RuntimeContext'] });

      expect(logger.context).toBe('FixedContext');
    });
  });

  describe('Dynamic Arguments (Factory)', () => {
    it('can resolve arguments dynamically from container', function () {
      class Config {
        env = 'production';
      }

      class Service {
        constructor(public env: string) {}
      }

      const root = createContainer()
        .addRegistration(R.fromClass(Config)) // Key: 'Config'
        .addRegistration(
          R.fromClass(Service).pipe(
            // Extract 'env' from Config service dynamically
            // Note: We resolve 'Config' by string key to get the registered instance (if it were singleton)
            argsFn((scope) => [scope.resolve<Config>('Config').env]),
          ),
        );

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

    // EntityManager is generic - it works with ANY repository
    // We use argsFn(resolveByArgs) to tell it to look at the arguments passed to .args()
    const EntityManagerToken = new SingleToken<EntityManager>('EntityManager');

    @register(
      bindTo(EntityManagerToken),
      argsFn(resolveByArgs), // <--- Key magic: resolves dependencies based on arguments passed to token
      singleton(MultiCache.fromFirstArg), // Cache unique instance per repository type
    )
    class EntityManager {
      constructor(public repository: IRepository) {}
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
