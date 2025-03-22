import 'reflect-metadata';
import { Container, ProxyInjector, args, Registration as R } from '../lib';

describe('ProxyInjector', function () {
  it('should pass dependency to constructor as dictionary', function () {
    class Logger {}

    class App {
      logger: Logger;

      constructor({ logger }: { logger: Logger }) {
        this.logger = logger;
      }
    }

    const container = new Container({ injector: new ProxyInjector() }).addRegistration(
      R.fromClass(Logger).assignToKey('logger'),
    );

    const app = container.resolve(App);
    expect(app.logger).toBeInstanceOf(Logger);
  });

  it('should pass arguments as objects', function () {
    class Logger {}

    class App {
      logger: Logger;
      greeting: string;

      constructor({
        logger,
        greetingTemplate,
        name,
      }: {
        logger: Logger;
        greetingTemplate: (name: string) => string;
        name: string;
      }) {
        this.logger = logger;
        this.greeting = greetingTemplate(name);
      }
    }

    const greetingTemplate = (name: string) => `Hello ${name}`;

    const container = new Container({ injector: new ProxyInjector() })
      .addRegistration(R.fromClass(App).assignToKey('App').pipe(args({ greetingTemplate })))
      .addRegistration(R.fromClass(Logger).assignToKey('logger'));

    const app = container.resolve<App>('App', { args: [{ name: `world` }] });
    expect(app.greeting).toBe('Hello world');
  });

  it('should resolve array dependencies when property name contains "array"', function () {
    class Logger {}
    class Service {}

    class App {
      loggers: Logger[];
      service: Service;

      constructor({ loggersArray, service }: { loggersArray: Logger[]; service: Service }) {
        this.loggers = loggersArray;
        this.service = service;
      }
    }

    // Mock container's resolveMany to return an array with a Logger instance
    const mockLogger = new Logger();
    const mockContainer = new Container({ injector: new ProxyInjector() });
    const originalResolveMany = mockContainer.resolveMany;
    mockContainer.resolveMany = jest.fn().mockImplementation((key) => {
      console.log(`resolveMany called with key: ${key}, type: ${typeof key}, toString: ${key.toString()}`);
      // Always return the mock array for simplicity
      return [mockLogger];
    });
    mockContainer.addRegistration(R.fromClass(Service).assignToKey('service'));

    const app = mockContainer.resolve(App);
    console.log('App loggers:', app.loggers);
    expect(app.loggers).toBeInstanceOf(Array);
    expect(app.loggers.length).toBe(1);
    expect(app.loggers[0]).toBe(mockLogger);
    expect(app.service).toBeInstanceOf(Service);
    // Verify that resolveMany was called with the correct key
    expect(mockContainer.resolveMany).toHaveBeenCalledWith('loggersArray');
  });
});
