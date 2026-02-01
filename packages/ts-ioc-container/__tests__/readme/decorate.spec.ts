import {
  bindTo,
  Container,
  decorate,
  type IContainer,
  inject,
  register,
  Registration as R,
  select as s,
  singleton,
} from '../../lib';

/**
 * User Management Domain - Decorator Pattern
 *
 * The decorator pattern wraps a service with additional behavior:
 * - Logging: Log all repository operations for audit
 * - Caching: Cache results of expensive operations
 * - Retry: Automatically retry failed operations
 * - Validation: Validate inputs before processing
 *
 * In DI, decorators are applied at registration time, so consumers
 * get the decorated version without knowing about the decoration.
 *
 * This example shows a TodoRepository decorated with logging -
 * every save operation is automatically logged.
 */
describe('Decorator Pattern', () => {
  // Singleton logger collects all log entries
  @register(singleton())
  class Logger {
    private logs: string[] = [];

    log(message: string) {
      this.logs.push(message);
    }

    printLogs() {
      return this.logs.join(',');
    }
  }

  interface IRepository {
    save(item: Todo): Promise<void>;
  }

  interface Todo {
    id: string;
    text: string;
  }

  // Decorator: Wraps any IRepository with logging behavior
  class LoggingRepository implements IRepository {
    constructor(
      private repository: IRepository,
      @inject(s.token('Logger').lazy()) private logger: Logger,
    ) {}

    async save(item: Todo): Promise<void> {
      // Log the operation
      this.logger.log(item.id);
      // Delegate to the wrapped repository
      return this.repository.save(item);
    }
  }

  // Decorator factory - creates LoggingRepository wrapping the original
  const withLogging = (repository: IRepository, scope: IContainer) =>
    scope.resolve(LoggingRepository, { args: [repository] });

  // TodoRepository is automatically decorated with logging
  @register(bindTo('IRepository'), decorate(withLogging))
  class TodoRepository implements IRepository {
    async save(item: Todo): Promise<void> {
      // Actual database save logic would go here
    }
  }

  class App {
    constructor(@inject('IRepository') public repository: IRepository) {}

    async run() {
      await this.repository.save({ id: '1', text: 'Buy groceries' });
      await this.repository.save({ id: '2', text: 'Walk the dog' });
    }
  }

  function createAppContainer() {
    return new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(TodoRepository))
      .addRegistration(R.fromClass(Logger));
  }

  it('should automatically log all repository operations via decorator', async () => {
    const container = createAppContainer();

    const app = container.resolve(App);
    const logger = container.resolve<Logger>('Logger');

    // App uses repository normally - unaware of logging decorator
    await app.run();

    // All operations were logged transparently
    expect(logger.printLogs()).toBe('1,2');
  });
});
