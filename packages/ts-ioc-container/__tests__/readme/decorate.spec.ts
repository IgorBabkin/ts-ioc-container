import {
  by,
  Container,
  decorate,
  IContainer,
  inject,
  key,
  MetadataInjector,
  provider,
  register,
  Registration as R,
  singleton,
} from '../../lib';

describe('lazy provider', () => {
  @provider(singleton())
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
      @inject(by.key('Logger')) private logger: Logger,
    ) {}

    async save(item: Todo): Promise<void> {
      this.logger.log(item.id);
      return this.repository.save(item);
    }
  }

  const logRepo = (dep: IRepository, scope: IContainer) => scope.resolve(LogRepository, { args: [dep] });

  @register(key('IRepository'))
  @provider(decorate(logRepo))
  class TodoRepository implements IRepository {
    async save(item: Todo): Promise<void> {
      console.log('Saving todo item', item);
    }
  }

  class App {
    constructor(@inject(by.key('IRepository')) public repository: IRepository) {}

    async run() {
      await this.repository.save({ id: '1', text: 'Hello' });
      await this.repository.save({ id: '2', text: 'Hello' });
    }
  }

  function createContainer() {
    const container = new Container(new MetadataInjector());
    container.add(R.toClass(TodoRepository)).add(R.toClass(Logger));
    return container;
  }

  it('should decorate repo by logger middleware', async () => {
    // Arrange
    const container = createContainer();

    // Act
    const app = container.resolve(App);
    const logger = container.resolve<Logger>('Logger');
    await app.run();

    // Assert
    expect(logger.printLogs()).toBe('1,2');
  });
});
