import { bindTo, Container, ProxyInjector, register, Registration as R } from '../../lib';

describe('ProxyInjector', function () {
  it('should inject dependencies as a props object', function () {
    @register(bindTo('logger'))
    class Logger {
      log(msg: string) {
        return `Logged: ${msg}`;
      }
    }

    interface UserControllerDeps {
      logger: Logger;
      prefix: string;
    }

    class UserController {
      private logger: Logger;
      private prefix: string;

      constructor({ logger, prefix }: UserControllerDeps) {
        this.logger = logger;
        this.prefix = prefix;
      }

      createUser(name: string): string {
        return this.logger.log(`${this.prefix} ${name}`);
      }
    }

    const container = new Container({ injector: new ProxyInjector() })
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromValue('USER:').bindToKey('prefix'))
      .addRegistration(R.fromClass(UserController));

    const controller = container.resolve<UserController>('UserController');

    expect(controller.createUser('bob')).toBe('Logged: USER: bob');
  });

  it('should expose runtime args through the reserved "args" property', function () {
    @register(bindTo('database'))
    class Database {}

    class ReportGenerator {
      database: Database;
      format: string;

      constructor({ database, args }: { database: Database; args: string[] }) {
        this.database = database;
        this.format = args[0];
      }

      generate(): string {
        return `Report in ${this.format}`;
      }
    }

    const container = new Container({ injector: new ProxyInjector() })
      .addRegistration(R.fromClass(Database))
      .addRegistration(R.fromClass(ReportGenerator));

    const generator = container.resolve<ReportGenerator>('ReportGenerator', {
      args: ['PDF'],
    });

    expect(generator.database).toBeInstanceOf(Database);
    expect(generator.generate()).toBe('Report in PDF');
  });

  it('should resolve dependencies by alias when property name contains "alias"', function () {
    class FileLogger {}
    class ConsoleLogger {}

    interface AppDeps {
      loggersAlias: any[];
    }

    class App {
      constructor(public deps: AppDeps) {}
    }

    const container = new Container({ injector: new ProxyInjector() });

    const mockLoggers = [new FileLogger(), new ConsoleLogger()];
    container.resolveByAlias = vi.fn().mockReturnValue(mockLoggers);

    const app = container.resolve(App);

    expect(app.deps.loggersAlias).toBe(mockLoggers);
    expect(container.resolveByAlias).toHaveBeenCalledWith('loggersAlias');
  });
});
