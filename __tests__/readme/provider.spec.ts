import {
  args,
  argsFn,
  bindTo,
  Container,
  lazy,
  Provider,
  register,
  Registration as R,
  scopeAccess,
  singleton,
} from '../../lib';

/**
 * Data Processing Pipeline - Provider Patterns
 *
 * Providers are the recipes for creating objects. This suite demonstrates
 * how to customize object creation for a Data Processing Pipeline.
 *
 * Scenarios:
 * - FileProcessor: Created as a class instance
 * - Config: Created from a simple value object
 * - BatchProcessor: Singleton to coordinate across the app
 * - StreamProcessor: Lazy loaded only when needed
 */

class Logger {}

describe('Provider', () => {
  it('can be registered as a function (Factory Pattern)', () => {
    // dynamic factory
    const container = new Container().register('ILogger', new Provider(() => new Logger()));
    expect(container.resolve('ILogger')).not.toBe(container.resolve('ILogger'));
  });

  it('can be registered as a value (Config Pattern)', () => {
    // constant value
    const config = { maxRetries: 3 };
    const container = new Container().register('Config', Provider.fromValue(config));
    expect(container.resolve('Config')).toBe(config);
  });

  it('can be registered as a class (Standard Pattern)', () => {
    const container = new Container().register('ILogger', Provider.fromClass(Logger));
    expect(container.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('can be featured by fp method (Singleton Pattern)', () => {
    // Pipe "singleton()" to cache the instance
    const appContainer = new Container({ tags: ['application'] }).register(
      'SharedLogger',
      Provider.fromClass(Logger).pipe(singleton()),
    );
    expect(appContainer.resolve('SharedLogger')).toBe(appContainer.resolve('SharedLogger'));
  });

  it('can be created from a dependency key (Alias/Redirect Pattern)', () => {
    // "LoggerAlias" redirects to "ILogger"
    const container = new Container()
      .register('ILogger', Provider.fromClass(Logger))
      .register('LoggerAlias', Provider.fromKey('ILogger'));

    const logger = container.resolve('LoggerAlias');
    expect(logger).toBeInstanceOf(Logger);
  });

  it('supports lazy resolution (Performance Optimization)', () => {
    // Logger is not created until accessed
    const container = new Container().register('ILogger', Provider.fromClass(Logger));
    const lazyLogger = container.resolve('ILogger', { lazy: true });

    // It's a proxy, not the real instance yet
    expect(typeof lazyLogger).toBe('object');
    // Accessing it would trigger creation
  });

  it('supports args decorator for providing extra arguments', () => {
    class FileService {
      constructor(readonly basePath: string) {}
    }

    const container = new Container().register('FileService', Provider.fromClass(FileService).pipe(args('/var/data')));

    const service = container.resolve<FileService>('FileService');
    expect(service.basePath).toBe('/var/data');
  });

  it('supports argsFn decorator for dynamic arguments', () => {
    class Database {
      constructor(readonly connectionString: string) {}
    }

    const container = new Container().register('DbPath', Provider.fromValue('localhost:5432')).register(
      'Database',
      Provider.fromClass(Database).pipe(
        // Dynamically resolve connection string at creation time
        argsFn((scope) => [`postgres://${scope.resolve('DbPath')}`]),
      ),
    );

    const db = container.resolve<Database>('Database');
    expect(db.connectionString).toBe('postgres://localhost:5432');
  });

  it('supports visibility control (Security Pattern)', () => {
    // AdminService only visible in admin scope
    class AdminService {}

    const appContainer = new Container({ tags: ['application'] }).register(
      'AdminService',
      Provider.fromClass(AdminService).pipe(scopeAccess(({ invocationScope }) => invocationScope.hasTag('admin'))),
    );

    const adminScope = appContainer.createScope({ tags: ['admin'] });
    const publicScope = appContainer.createScope({ tags: ['public'] });

    expect(() => adminScope.resolve('AdminService')).not.toThrow();
    expect(() => publicScope.resolve('AdminService')).toThrow();
  });

  it('allows to register lazy provider via decorator', () => {
    let created = false;

    @register(bindTo('HeavyService'), lazy())
    class HeavyService {
      constructor() {
        created = true;
      }
      doWork() {}
    }

    const container = new Container().addRegistration(R.fromClass(HeavyService));
    const service = container.resolve<HeavyService>('HeavyService');

    expect(created).toBe(false); // Not created yet
    service.doWork(); // Access triggers creation
    expect(created).toBe(true);
  });
});
