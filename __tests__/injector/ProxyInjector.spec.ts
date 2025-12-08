import { Container, ProxyInjector, Registration as R } from '../../lib';

/**
 * Clean Architecture - Proxy Injector
 *
 * The ProxyInjector injects dependencies as a single object (props/options pattern).
 * This is popular in modern JavaScript/TypeScript (like React props or destructuring).
 *
 * Advantages:
 * - Named parameters are more readable than positional arguments
 * - Order of arguments doesn't matter
 * - Easy to add/remove dependencies without breaking inheritance chains
 * - Works well with "Clean Architecture" adapters
 */

describe('ProxyInjector', function () {
  it('should inject dependencies as a props object', function () {
    class Logger {
      log(msg: string) {
        return `Logged: ${msg}`;
      }
    }

    // Dependencies defined as an interface
    interface UserControllerDeps {
      logger: Logger;
      prefix: string;
    }

    // Controller receives all dependencies in a single object
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
      .addRegistration(R.fromClass(Logger).bindToKey('logger'))
      .addRegistration(R.fromValue('USER:').bindToKey('prefix'))
      .addRegistration(R.fromClass(UserController).bindToKey('UserController'));

    const controller = container.resolve<UserController>('UserController');

    expect(controller.createUser('bob')).toBe('Logged: USER: bob');
  });

  it('should support mixing injected dependencies with runtime arguments', function () {
    class Database {}

    interface ReportGeneratorDeps {
      database: Database;
      format: string; // Runtime argument
    }

    class ReportGenerator {
      constructor(public deps: ReportGeneratorDeps) {}

      generate(): string {
        return `Report in ${this.deps.format}`;
      }
    }

    const container = new Container({ injector: new ProxyInjector() })
      .addRegistration(R.fromClass(Database).bindToKey('database'))
      .addRegistration(R.fromClass(ReportGenerator).bindToKey('ReportGenerator'));

    // "format" is passed at resolution time
    const generator = container.resolve<ReportGenerator>('ReportGenerator', {
      args: [{ format: 'PDF' }],
    });

    expect(generator.deps.database).toBeInstanceOf(Database);
    expect(generator.generate()).toBe('Report in PDF');
  });

  it('should resolve array dependencies by alias (convention over configuration)', function () {
    // If a property is named "loggersArray", it looks for alias "loggersArray"
    // and resolves it as an array of all matches.

    class FileLogger {}
    class ConsoleLogger {}

    interface AppDeps {
      loggersArray: any[]; // Injected as array of all loggers
    }

    class App {
      constructor(public deps: AppDeps) {}
    }

    const container = new Container({ injector: new ProxyInjector() });

    // Mocking the behavior for this specific test as ProxyInjector uses resolveByAlias
    // which delegates to the container.
    // In a real scenario, you'd register multiple loggers with the same alias.
    const mockLoggers = [new FileLogger(), new ConsoleLogger()];

    container.resolveByAlias = jest.fn().mockReturnValue(mockLoggers);

    const app = container.resolve(App);

    expect(app.deps.loggersArray).toBe(mockLoggers);
    expect(container.resolveByAlias).toHaveBeenCalledWith('loggersArray');
  });
});
