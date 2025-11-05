import { args, Container, ProxyInjector, Registration as R } from '../lib';

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
      R.fromClass(Logger).bindToKey('logger'),
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
      .addRegistration(R.fromClass(App).bindToKey('App').pipe(args({ greetingTemplate })))
      .addRegistration(R.fromClass(Logger).bindToKey('logger'));

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

    // Mock container's resolveByAlias to return an array with a Logger instance
    const mockLogger = new Logger();
    const mockContainer = new Container({ injector: new ProxyInjector() });
    mockContainer.resolveByAlias = jest.fn().mockImplementation((key) => {
      // Always return the mock array for simplicity
      return [mockLogger];
    });
    mockContainer.addRegistration(R.fromClass(Service).bindToKey('service'));

    const app = mockContainer.resolve(App);
    expect(app.loggers).toBeInstanceOf(Array);
    expect(app.loggers.length).toBe(1);
    expect(app.loggers[0]).toBe(mockLogger);
    expect(app.service).toBeInstanceOf(Service);
    // Verify that resolveByAlias was called with the correct key
    expect(mockContainer.resolveByAlias).toHaveBeenCalledWith('loggersArray');
  });
});
