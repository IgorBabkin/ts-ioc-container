import {
  asKey,
  by,
  Container,
  decorate,
  type IContainer,
  inject,
  register,
  Registration as R,
  singleton,
} from '../../lib';

describe('lazy provider', () => {
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

  class LogRepository implements IRepository {
    constructor(
      private repository: IRepository,
      @inject(by.one('Logger').lazy()) private logger: Logger,
    ) {}

    async save(item: Todo): Promise<void> {
      this.logger.log(item.id);
      return this.repository.save(item);
    }
  }

  const logRepo = (dep: IRepository, scope: IContainer) => scope.resolveOne(LogRepository, { args: [dep] });

  @register(asKey('IRepository'), decorate(logRepo))
  class TodoRepository implements IRepository {
    async save(item: Todo): Promise<void> {}
  }

  class App {
    constructor(@inject('IRepository') public repository: IRepository) {}

    async run() {
      await this.repository.save({ id: '1', text: 'Hello' });
      await this.repository.save({ id: '2', text: 'Hello' });
    }
  }

  function createContainer() {
    const container = new Container();
    container.addRegistration(R.fromClass(TodoRepository)).addRegistration(R.fromClass(Logger));
    return container;
  }

  it('should decorate repo by logger middleware', async () => {
    // Arrange
    const container = createContainer();

    // Act
    const app = container.resolveOne(App);
    const logger = container.resolveOne<Logger>('Logger');
    await app.run();

    // Assert
    expect(logger.printLogs()).toBe('1,2');
  });
});
