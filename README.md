# Typescript IoC (Inversion Of Control) container

![NPM version:latest](https://img.shields.io/npm/v/ts-ioc-container/latest.svg?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/ts-ioc-container.svg?style=flat-square)
![npm package minimized gzipped size (select exports)](https://img.shields.io/bundlejs/size/ts-ioc-container)
[![Coverage Status](https://coveralls.io/repos/github/IgorBabkin/ts-ioc-container/badge.svg?branch=master)](https://coveralls.io/github/IgorBabkin/ts-ioc-container?branch=master)
![License](https://img.shields.io/npm/l/ts-ioc-container)
[![semantic-release](https://img.shields.io/badge/%20%20%20FLO%20-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Advantages
- battle tested :boom:
- written on `typescript`
- simple and lightweight :heart:
- clean API :green_heart:
- supports `tagged scopes`
- fully test covered :100:
- can be used with decorators `@inject`
- can [inject properties](#inject-property)
- can inject [lazy dependencies](#lazy)
- composable and open to extend

## Content

- [Setup](#setup)
- [Container](#container)
    - [Basic usage](#basic-usage)
    - [Scope](#scope) `tags`
    - [Instances](#instances)
    - [Dispose](#dispose)
    - [Lazy](#lazy) `lazy`
- [Injector](#injector)
    - [Metadata](#metadata) `@inject`
    - [Simple](#simple)
    - [Proxy](#proxy)
- [Provider](#provider) `provider`
    - [Singleton](#singleton) `singleton`
    - [Arguments](#arguments) `args` `argsFn`
    - [Visibility](#visibility) `visible`
    - [Alias](#alias) `asAlias`
    - [Decorator](#decorator) `decorate`
- [Registration](#registration) `@register`
    - [Key](#key) `asKey`
    - [Scope](#scope) `scope`
- [Module](#module)
- [Hook](#hook) `@hook`
    - [OnConstruct](#onconstruct) `@onConstruct`
    - [OnDispose](#ondispose) `@onDispose`
    - [Inject Property](#inject-property)
    - [Inject Method](#inject-method)
- [Mock](#mock)
- [Error](#error)

## Setup

```shell script
npm install ts-ioc-container reflect-metadata
```
```shell script
yarn add ts-ioc-container reflect-metadata
```

Just put it in the entrypoint file of your project. It should be the first line of the code.
```typescript
import 'reflect-metadata';
```

And `tsconfig.json` should have next options:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Container
`IContainer` consists of:

- Provider is dependency factory which creates dependency
- Injector describes how to inject dependencies to constructor
- Registration is provider factory which registers provider in container

### Basic usage

```typescript
import 'reflect-metadata';
import { Container, type IContainer, inject, Registration as R, select } from 'ts-ioc-container';

/**
 * User Management Domain - Basic Dependency Injection
 *
 * This example demonstrates how to wire up a simple authentication service
 * that depends on a user repository. This pattern is common in web applications
 * where services need database access.
 */
describe('Basic usage', function () {
  // Domain types
  interface User {
    id: string;
    email: string;
    passwordHash: string;
  }

  // Repository interface - abstracts database access
  interface IUserRepository {
    findByEmail(email: string): User | undefined;
  }

  // Concrete implementation
  class UserRepository implements IUserRepository {
    private users: User[] = [{ id: '1', email: 'admin@example.com', passwordHash: 'hashed_password' }];

    findByEmail(email: string): User | undefined {
      return this.users.find((u) => u.email === email);
    }
  }

  it('should inject dependencies', function () {
    // AuthService depends on IUserRepository
    class AuthService {
      constructor(@inject('IUserRepository') private userRepo: IUserRepository) {}

      authenticate(email: string): boolean {
        const user = this.userRepo.findByEmail(email);
        return user !== undefined;
      }
    }

    // Wire up the container
    const container = new Container().addRegistration(R.fromClass(UserRepository).bindTo('IUserRepository'));

    // Resolve AuthService - UserRepository is automatically injected
    const authService = container.resolve(AuthService);

    expect(authService.authenticate('admin@example.com')).toBe(true);
    expect(authService.authenticate('unknown@example.com')).toBe(false);
  });

  it('should inject current scope for request context', function () {
    // In Express.js, each request gets its own scope
    // Services can access the current scope to resolve request-specific dependencies
    const appContainer = new Container({ tags: ['application'] });

    class RequestHandler {
      constructor(@inject(select.scope.current) public requestScope: IContainer) {}

      handleRequest(): string {
        // Access request-scoped dependencies
        return this.requestScope.hasTag('application') ? 'app-scope' : 'request-scope';
      }
    }

    const handler = appContainer.resolve(RequestHandler);

    expect(handler.requestScope).toBe(appContainer);
    expect(handler.handleRequest()).toBe('app-scope');
  });
});

```

### Scope
Sometimes you need to create a scope of container. For example, when you want to create a scope per request in web application. You can assign tags to scope and provider and resolve dependencies only from certain scope.

- NOTICE: remember that when scope doesn't have dependency then it will be resolved from parent container
- NOTICE: when you create a scope of container then all providers are cloned to new scope. For that reason every provider has methods `clone` and `isValid` to clone itself and check if it's valid for certain scope accordingly.
- NOTICE: when you create a scope then we clone ONLY tags-matched providers.

```typescript
import 'reflect-metadata';
import {
  bindTo,
  Container,
  DependencyNotFoundError,
  type IContainer,
  inject,
  register,
  Registration as R,
  scope,
  select,
  singleton,
} from 'ts-ioc-container';

/**
 * User Management Domain - Request Scopes
 *
 * In web applications, each HTTP request typically gets its own scope.
 * This allows request-specific data (current user, request ID, etc.)
 * to be isolated between concurrent requests.
 *
 * Scope hierarchy:
 *   Application (singleton services)
 *     └── Request (per-request services)
 *           └── Transaction (database transaction boundary)
 */

// SessionService is only available in request scope - not at application level
// This prevents accidental access to request-specific data from singletons
@register(bindTo('ISessionService'), scope((s) => s.hasTag('request')), singleton())
class SessionService {
  private userId: string | null = null;

  setCurrentUser(userId: string) {
    this.userId = userId;
  }

  getCurrentUserId(): string | null {
    return this.userId;
  }
}

describe('Scopes', function () {
  it('should isolate request-scoped services', function () {
    // Application container - lives for entire app lifetime
    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(SessionService));

    // Simulate two concurrent HTTP requests
    const request1Scope = appContainer.createScope({ tags: ['request'] });
    const request2Scope = appContainer.createScope({ tags: ['request'] });

    // Each request has its own SessionService instance
    const session1 = request1Scope.resolve<SessionService>('ISessionService');
    const session2 = request2Scope.resolve<SessionService>('ISessionService');

    session1.setCurrentUser('user-1');
    session2.setCurrentUser('user-2');

    // Sessions are isolated - user data doesn't leak between requests
    expect(session1.getCurrentUserId()).toBe('user-1');
    expect(session2.getCurrentUserId()).toBe('user-2');
    expect(session1).not.toBe(session2);

    // SessionService is NOT available at application level (security!)
    expect(() => appContainer.resolve('ISessionService')).toThrow(DependencyNotFoundError);
  });

  it('should create child scopes for transactions', function () {
    const appContainer = new Container({ tags: ['application'] });

    // RequestHandler can create a transaction scope for database operations
    class RequestHandler {
      constructor(@inject(select.scope.create({ tags: ['transaction'] })) public transactionScope: IContainer) {}

      executeInTransaction(): boolean {
        // Transaction scope inherits from request scope
        // Database operations can be rolled back together
        return this.transactionScope.hasTag('transaction');
      }
    }

    const handler = appContainer.resolve(RequestHandler);

    expect(handler.transactionScope).not.toBe(appContainer);
    expect(handler.transactionScope.hasTag('transaction')).toBe(true);
    expect(handler.executeInTransaction()).toBe(true);
  });
});

```

### Instances
Sometimes you want to get all instances from container and its scopes. For example, when you want to dispose all instances of container.

- you can get instances from container and scope which were created by injector

```typescript
import { bindTo, Container, inject, register, Registration as R, select } from 'ts-ioc-container';

describe('Instances', function () {
  @register(bindTo('ILogger'))
  class Logger {}

  it('should return injected instances', () => {
    class App {
      constructor(@inject(select.instances()) public loggers: Logger[]) {}
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope({ tags: ['child'] });

    root.resolve('ILogger');
    child.resolve('ILogger');

    const rootApp = root.resolve(App);
    const childApp = child.resolve(App);

    expect(childApp.loggers.length).toBe(1);
    expect(rootApp.loggers.length).toBe(2);
  });

  it('should return only current scope instances', () => {
    class App {
      constructor(@inject(select.instances().cascade(false)) public loggers: Logger[]) {}
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope({ tags: ['child'] });

    root.resolve('ILogger');
    child.resolve('ILogger');

    const rootApp = root.resolve(App);

    expect(rootApp.loggers.length).toBe(1);
  });

  it('should return injected instances by decorator', () => {
    const isLogger = (instance: unknown) => instance instanceof Logger;

    class App {
      constructor(@inject(select.instances(isLogger)) public loggers: Logger[]) {}
    }

    const container = new Container().addRegistration(R.fromClass(Logger));

    const logger0 = container.resolve('ILogger');
    const logger1 = container.resolve('ILogger');
    const app = container.resolve(App);

    expect(app.loggers).toHaveLength(2);
    expect(app.loggers[0]).toBe(logger0);
    expect(app.loggers[1]).toBe(logger1);
  });
});

```

### Dispose
Sometimes you want to dispose container and all its scopes. For example, when you want to prevent memory leaks. Or you want to ensure that nobody can use container after it was disposed.

- container can be disposed
- when container is disposed then all scopes are disposed too
- when container is disposed then it unregisters all providers and remove all instances

```typescript
import 'reflect-metadata';
import { Container, ContainerDisposedError, Registration as R, select } from 'ts-ioc-container';

/**
 * User Management Domain - Resource Cleanup
 *
 * When a scope ends (e.g., HTTP request completes), resources must be cleaned up:
 * - Database connections returned to pool
 * - File handles closed
 * - Temporary files deleted
 * - Cache entries cleared
 *
 * The container.dispose() method:
 * 1. Executes all onDispose hooks
 * 2. Clears all instances and registrations
 * 3. Detaches from parent scope
 * 4. Prevents further resolution
 */

// Simulates a database connection that must be closed
class DatabaseConnection {
  public isClosed = false;

  query(sql: string): string[] {
    if (this.isClosed) {
      throw new Error('Connection is closed');
    }
    return [`Result for: ${sql}`];
  }

  close(): void {
    this.isClosed = true;
  }
}

describe('Disposing', function () {
  it('should dispose container and prevent further usage', function () {
    const appContainer = new Container({ tags: ['application'] }).addRegistration(
      R.fromClass(DatabaseConnection).bindTo('IDatabase'),
    );

    // Create a request scope with a database connection
    const requestScope = appContainer.createScope({ tags: ['request'] });
    const connection = requestScope.resolve<DatabaseConnection>('IDatabase');

    // Connection works normally
    expect(connection.query('SELECT * FROM users')).toEqual(['Result for: SELECT * FROM users']);

    // Request ends - dispose the scope
    requestScope.dispose();

    // Scope is now unusable
    expect(() => requestScope.resolve('IDatabase')).toThrow(ContainerDisposedError);

    // All instances are cleared
    expect(select.instances().resolve(requestScope).length).toBe(0);

    // Application container is still functional
    expect(appContainer.resolve<DatabaseConnection>('IDatabase')).toBeDefined();
  });

  it('should clean up request-scoped resources on request end', function () {
    const appContainer = new Container({ tags: ['application'] }).addRegistration(
      R.fromClass(DatabaseConnection).bindTo('IDatabase'),
    );

    // Simulate Express.js request lifecycle
    function handleRequest(): { connection: DatabaseConnection; scope: Container } {
      const requestScope = appContainer.createScope({ tags: ['request'] }) as Container;
      const connection = requestScope.resolve<DatabaseConnection>('IDatabase');

      // Do some work...
      connection.query('INSERT INTO sessions VALUES (...)');

      return { connection, scope: requestScope };
    }

    // Request 1
    const request1 = handleRequest();
    expect(request1.connection.isClosed).toBe(false);

    // Request 1 ends - in Express, this would be in res.on('finish')
    request1.connection.close();
    request1.scope.dispose();

    // Request 2 gets a fresh connection
    const request2 = handleRequest();
    expect(request2.connection.isClosed).toBe(false);
    expect(request2.connection).not.toBe(request1.connection);

    // Cleanup
    request2.connection.close();
    request2.scope.dispose();
  });
});

```

### Lazy
Sometimes you want to create dependency only when somebody want to invoke it's method or property. This is what `lazy` is for.

```typescript
import 'reflect-metadata';
import { Container, inject, register, Registration as R, select as s, singleton } from 'ts-ioc-container';

/**
 * User Management Domain - Lazy Loading
 *
 * Some services are expensive to initialize:
 * - EmailNotifier: Establishes SMTP connection
 * - ReportGenerator: Loads templates, initializes PDF engine
 * - ExternalApiClient: Authenticates with third-party service
 *
 * Lazy loading defers instantiation until first use.
 * This improves startup time and avoids initializing unused services.
 *
 * Use cases:
 * - Services used only in specific code paths (error notification)
 * - Optional features that may not be triggered
 * - Breaking circular dependencies
 */
describe('lazy provider', () => {
  // Tracks whether SMTP connection was established
  @register(singleton())
  class SmtpConnectionStatus {
    isConnected = false;

    connect() {
      this.isConnected = true;
    }
  }

  // EmailNotifier is expensive - establishes SMTP connection on construction
  class EmailNotifier {
    constructor(@inject('SmtpConnectionStatus') private smtp: SmtpConnectionStatus) {
      // Simulate expensive SMTP connection
      this.smtp.connect();
    }

    sendPasswordReset(email: string): string {
      return `Password reset sent to ${email}`;
    }
  }

  // AuthService might need to send password reset emails
  // But most login requests don't need email (only password reset does)
  class AuthService {
    constructor(@inject(s.token('EmailNotifier').lazy()) public emailNotifier: EmailNotifier) {}

    login(email: string, password: string): boolean {
      // Most requests just validate credentials - no email needed
      return email === 'admin@example.com' && password === 'secret';
    }

    requestPasswordReset(email: string): string {
      // Only here do we actually need the EmailNotifier
      return this.emailNotifier.sendPasswordReset(email);
    }
  }

  function createContainer() {
    const container = new Container();
    container.addRegistration(R.fromClass(SmtpConnectionStatus)).addRegistration(R.fromClass(EmailNotifier));
    return container;
  }

  it('should not connect to SMTP until email is actually needed', () => {
    const container = createContainer();

    // AuthService is created, but EmailNotifier is NOT instantiated yet
    container.resolve(AuthService);
    const smtp = container.resolve<SmtpConnectionStatus>('SmtpConnectionStatus');

    // SMTP connection was NOT established - lazy loading deferred it
    expect(smtp.isConnected).toBe(false);
  });

  it('should connect to SMTP only when sending email', () => {
    const container = createContainer();

    const authService = container.resolve(AuthService);
    const smtp = container.resolve<SmtpConnectionStatus>('SmtpConnectionStatus');

    // Trigger password reset - this actually uses EmailNotifier
    const result = authService.requestPasswordReset('user@example.com');

    // Now SMTP connection was established
    expect(result).toBe('Password reset sent to user@example.com');
    expect(smtp.isConnected).toBe(true);
  });

  it('should only create one instance even with multiple method calls', () => {
    const container = createContainer();

    const authService = container.resolve(AuthService);

    // Multiple password resets
    authService.requestPasswordReset('user1@example.com');
    authService.requestPasswordReset('user2@example.com');

    // Only one EmailNotifier instance was created
    const emailNotifiers = Array.from(container.getInstances()).filter((x) => x instanceof EmailNotifier);
    expect(emailNotifiers.length).toBe(1);
  });

  it('should trigger instantiation when accessing property on lazy object', () => {
    const container = createContainer();

    const authService = container.resolve(AuthService);
    const smtp = container.resolve<SmtpConnectionStatus>('SmtpConnectionStatus');

    // Just getting the proxy doesn't trigger instantiation
    const notifier = authService.emailNotifier;
    expect(notifier).toBeDefined();
    expect(smtp.isConnected).toBe(false); // Still lazy!

    // Accessing a property ON the lazy object triggers instantiation
    const method = notifier.sendPasswordReset;
    expect(method).toBeDefined();
    expect(smtp.isConnected).toBe(true); // Now instantiated!
  });
});

```

## Injector
`IInjector` is used to describe how dependencies should be injected to constructor.

- `MetadataInjector` - injects dependencies using `@inject` decorator
- `ProxyInjector` - injects dependencies as dictionary `Record<string, unknown>`
- `SimpleInjector` - just passes container to constructor with others arguments

### Metadata
This type of injector uses `@inject` decorator to mark where dependencies should be injected. It's bases on `reflect-metadata` package. That's why I call it `MetadataInjector`.
Also you can [inject property.](#inject-property)

```typescript
import { Container, inject, Registration as R } from 'ts-ioc-container';

class Logger {
  name = 'Logger';
}

class App {
  constructor(@inject('ILogger') private logger: Logger) {}

  // OR
  // constructor(@inject((container, ...args) => container.resolve('ILogger', ...args)) private logger: ILogger) {
  // }

  getLoggerName(): string {
    return this.logger.name;
  }
}

describe('Reflection Injector', function () {
  it('should inject dependencies by @inject decorator', function () {
    const container = new Container().addRegistration(R.fromClass(Logger).bindToKey('ILogger'));

    const app = container.resolve(App);

    expect(app.getLoggerName()).toBe('Logger');
  });
});

```

### Simple
This type of injector just passes container to constructor with others arguments.

```typescript
import { Container, type IContainer, Registration as R, SimpleInjector } from 'ts-ioc-container';

describe('SimpleInjector', function () {
  it('should pass container as first parameter', function () {
    class App {
      constructor(public container: IContainer) {}
    }

    const container = new Container({ injector: new SimpleInjector() }).addRegistration(
      R.fromClass(App).bindToKey('App'),
    );
    const app = container.resolve<App>('App');

    expect(app.container).toBeInstanceOf(Container);
  });

  it('should pass parameters alongside with container', function () {
    class App {
      constructor(
        container: IContainer,
        public greeting: string,
      ) {}
    }

    const container = new Container({ injector: new SimpleInjector() }).addRegistration(
      R.fromClass(App).bindToKey('App'),
    );
    const app = container.resolve<App>('App', { args: ['Hello world'] });

    expect(app.greeting).toBe('Hello world');
  });
});

```

### Proxy
This type of injector injects dependencies as dictionary `Record<string, unknown>`.

```typescript
import { args, Container, ProxyInjector, Registration as R } from 'ts-ioc-container';

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

```

## Provider
Provider is dependency factory which creates dependency.

- `Provider.fromClass(Logger)`
- `Provider.fromValue(logger)`
- `new Provider((container, ...args) => container.resolve(Logger, {args}))`

```typescript
import {
  args,
  argsFn,
  bindTo,
  Container,
  inject,
  lazy,
  Provider,
  register,
  Registration as R,
  scopeAccess,
  select as s,
  singleton,
} from 'ts-ioc-container';

class Logger {}

class ConfigService {
  constructor(private readonly configPath: string) {}

  getPath(): string {
    return this.configPath;
  }
}

class UserService {}

class TestClass {}

class ClassWithoutTransformers {}

describe('Provider', () => {
  it('can be registered as a function', () => {
    const container = new Container().register('ILogger', new Provider(() => new Logger()));
    expect(container.resolve('ILogger')).not.toBe(container.resolve('ILogger'));
  });

  it('can be registered as a value', () => {
    const container = new Container().register('ILogger', Provider.fromValue(new Logger()));
    expect(container.resolve('ILogger')).toBe(container.resolve('ILogger'));
  });

  it('can be registered as a class', () => {
    const container = new Container().register('ILogger', Provider.fromClass(Logger));
    expect(container.resolve('ILogger')).not.toBe(container.resolve('ILogger'));
  });

  it('can be featured by pipe method', () => {
    const root = new Container({ tags: ['root'] }).register('ILogger', Provider.fromClass(Logger).pipe(singleton()));
    expect(root.resolve('ILogger')).toBe(root.resolve('ILogger'));
  });

  it('can be created from a dependency key', () => {
    const container = new Container()
      .register('ILogger', Provider.fromClass(Logger))
      .register('LoggerAlias', Provider.fromKey('ILogger'));
    const logger1 = container.resolve('ILogger');
    const logger2 = container.resolve('LoggerAlias');
    expect(logger2).toBeInstanceOf(Logger);
    expect(logger2).not.toBe(logger1);
  });

  it('supports lazy resolution', () => {
    const container = new Container().register('ILogger', Provider.fromClass(Logger));
    const lazyLogger = container.resolve('ILogger', { lazy: true });
    expect(typeof lazyLogger).toBe('object');
    const loggerPrototype = Object.getPrototypeOf(lazyLogger);
    expect(loggerPrototype).toBeDefined();
  });

  it('supports args decorator for providing extra arguments', () => {
    const container = new Container().register(
      'ConfigService',
      Provider.fromClass(ConfigService).pipe(args('/etc/config.json')),
    );
    const config = container.resolve<ConfigService>('ConfigService');
    expect(config.getPath()).toBe('/etc/config.json');
  });

  it('supports argsFn decorator for dynamic arguments', () => {
    const container = new Container()
      .register('Logger', Provider.fromClass(Logger))
      .register(
        'ConfigService',
        Provider.fromClass(ConfigService).pipe(argsFn((container) => ['/dynamic/config.json'])),
      );
    const config = container.resolve<ConfigService>('ConfigService');
    expect(config.getPath()).toBe('/dynamic/config.json');
  });

  it('combines args from argsFn with manually provided args', () => {
    const container = new Container()
      .register('Logger', Provider.fromClass(Logger))
      .register(
        'UserService',
        Provider.fromClass(UserService).pipe(argsFn((container) => [container.resolve('Logger')])),
      );
    const configService = new ConfigService('/test/config.json');
    const userService = container.resolve<UserService>('UserService', { args: [configService] });
    expect(userService).toBeInstanceOf(UserService);
  });

  it('supports visibility control between parent and child containers', () => {
    const rootContainer = new Container({ tags: ['root'] }).register(
      'ILogger',
      Provider.fromClass(Logger).pipe(
        scopeAccess(({ invocationScope, providerScope }) => invocationScope.hasTag('admin')),
      ),
    );
    const adminChild = rootContainer.createScope({ tags: ['admin'] });
    const userChild = rootContainer.createScope({ tags: ['user'] });
    expect(() => adminChild.resolve('ILogger')).not.toThrow();
    expect(() => userChild.resolve('ILogger')).toThrow();
  });

  it('supports chaining multiple pipe transformations', () => {
    const container = new Container().register(
      'ConfigService',
      Provider.fromClass(ConfigService).pipe(args('/default/config.json'), singleton()),
    );
    const config1 = container.resolve<ConfigService>('ConfigService');
    const config2 = container.resolve<ConfigService>('ConfigService');
    expect(config1).toBe(config2);
    expect(config1.getPath()).toBe('/default/config.json');
  });

  it('applies transformers when registering a class constructor as a value', () => {
    const container = new Container()
      .register('ClassConstructor', Provider.fromValue(TestClass))
      .register('ClassInstance', Provider.fromClass(TestClass));
    const instance1 = container.resolve('ClassConstructor');
    const instance2 = container.resolve('ClassConstructor');
    const instance3 = container.resolve('ClassInstance');
    expect(instance1).toBe(TestClass);
    expect(instance2).toBe(TestClass);
    expect(instance3).toBeInstanceOf(TestClass);
  });

  it('handles primitive values in Provider.fromValue', () => {
    const container = new Container()
      .register('StringValue', Provider.fromValue('test-string'))
      .register('NumberValue', Provider.fromValue(42))
      .register('BooleanValue', Provider.fromValue(true))
      .register('ObjectValue', Provider.fromValue({ key: 'value' }));
    expect(container.resolve('StringValue')).toBe('test-string');
    expect(container.resolve('NumberValue')).toBe(42);
    expect(container.resolve('BooleanValue')).toBe(true);
    expect(container.resolve('ObjectValue')).toEqual({ key: 'value' });
  });

  it('resolves dependencies with empty args', () => {
    const container = new Container().register('Logger', Provider.fromClass(Logger));
    const logger = container.resolve('Logger', { args: [] });
    expect(logger).toBeInstanceOf(Logger);
  });

  it('allows direct manipulation of visibility predicate', () => {
    const provider = Provider.fromClass(Logger);
    provider.setAccessRule(({ invocationScope }) => invocationScope.hasTag('special'));
    const container = new Container({ tags: ['root'] }).register('Logger', provider);
    const specialChild = container.createScope({ tags: ['special'] });
    const regularChild = container.createScope({ tags: ['regular'] });
    expect(() => specialChild.resolve('Logger')).not.toThrow();
    expect(() => regularChild.resolve('Logger')).toThrow();
  });

  it('allows direct manipulation of args function', () => {
    const provider = Provider.fromClass(ConfigService);
    provider.setArgs(() => ['/custom/path.json']);
    const container = new Container().register('ConfigService', provider);
    const config = container.resolve<ConfigService>('ConfigService');
    expect(config.getPath()).toBe('/custom/path.json');
  });

  it('handles class constructors when getTransformers returns null', () => {
    const container = new Container().register('NoTransformers', Provider.fromValue(ClassWithoutTransformers));
    const result = container.resolve('NoTransformers');
    expect(result).toBe(ClassWithoutTransformers);
  });

  it('allows to register lazy provider', () => {
    let isLoggerCreated = false;

    @register(bindTo('Logger'), lazy())
    class Logger {
      private logs: string[] = [];

      constructor() {
        isLoggerCreated = true;
      }

      info(message: string, context: Record<string, unknown>): void {
        this.logs.push(JSON.stringify({ ...context, level: 'info', message }));
      }

      serialize(): string {
        return this.logs.join('\n');
      }
    }

    class Main {
      constructor(@inject('Logger') private logger: Logger) {}

      getLogs(): string {
        return this.logger.serialize();
      }
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const main = root.resolve(Main);

    expect(isLoggerCreated).toBe(false);

    main.getLogs();

    expect(isLoggerCreated).toBe(true);
  });

  it('allows to resolve with args', () => {
    @register(bindTo('ILogger'))
    class Logger {
      readonly channel: string;

      constructor(options: { channel: string }) {
        this.channel = options.channel;
      }
    }

    class Main {
      constructor(@inject(s.token('ILogger').args({ channel: 'file' })) private logger: Logger) {}

      getChannel(): string {
        return this.logger.channel;
      }
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const main = root.resolve(Main);

    expect(main.getChannel()).toBe('file');
  });

  it('allows to resolve with argsFn', () => {
    @register(bindTo('ILogger'))
    class Logger {
      readonly channel: string;

      constructor(options: { channel: string }) {
        this.channel = options.channel;
      }
    }

    class Main {
      constructor(
        @inject(s.token('ILogger').argsFn((s) => [{ channel: s.resolve('channel') }])) private logger: Logger,
      ) {}

      getChannel(): string {
        return this.logger.channel;
      }
    }

    const root = new Container({ tags: ['root'] })
      .addRegistration(R.fromValue('file').bindToKey('channel'))
      .addRegistration(R.fromClass(Logger));

    const main = root.resolve(Main);

    expect(main.getChannel()).toBe('file');
  });
});

```

### Singleton
Sometimes you need to create only one instance of dependency per scope. For example, you want to create only one logger per scope.

- Singleton provider creates only one instance in every scope where it's resolved.
- NOTICE: if you create a scope 'A' of container 'root' then Logger of A !== Logger of root.

```typescript
import 'reflect-metadata';
import { bindTo, Container, register, Registration as R, singleton } from 'ts-ioc-container';

/**
 * User Management Domain - Singleton Pattern
 *
 * Singletons are services that should only have one instance per scope.
 * Common examples:
 * - PasswordHasher: Expensive to initialize (loads crypto config)
 * - DatabasePool: Connection pool shared across requests
 * - ConfigService: Application configuration loaded once
 *
 * Note: "singleton" in ts-ioc-container means "one instance per scope",
 * not "one instance globally". Each scope gets its own singleton instance.
 */

// PasswordHasher is expensive to create - should be singleton
@register(bindTo('IPasswordHasher'), singleton())
class PasswordHasher {
  private readonly salt: string;

  constructor() {
    // Simulate expensive initialization (loading crypto config, etc.)
    this.salt = 'random_salt_' + Math.random().toString(36);
  }

  hash(password: string): string {
    return `hashed_${password}_${this.salt}`;
  }

  verify(password: string, hash: string): boolean {
    return this.hash(password) === hash;
  }
}

describe('Singleton', function () {
  function createAppContainer() {
    return new Container({ tags: ['application'] });
  }

  it('should resolve the same PasswordHasher for every request in same scope', function () {
    const appContainer = createAppContainer().addRegistration(R.fromClass(PasswordHasher));

    // Multiple resolves return the same instance
    const hasher1 = appContainer.resolve<PasswordHasher>('IPasswordHasher');
    const hasher2 = appContainer.resolve<PasswordHasher>('IPasswordHasher');

    expect(hasher1).toBe(hasher2);
    expect(hasher1.hash('password')).toBe(hasher2.hash('password'));
  });

  it('should create different singleton per request scope', function () {
    // Application-level singleton
    const appContainer = createAppContainer().addRegistration(R.fromClass(PasswordHasher));

    // Each request scope gets its own singleton instance
    // This is useful when you want per-request caching
    const request1 = appContainer.createScope({ tags: ['request'] });
    const request2 = appContainer.createScope({ tags: ['request'] });

    const appHasher = appContainer.resolve<PasswordHasher>('IPasswordHasher');
    const request1Hasher = request1.resolve<PasswordHasher>('IPasswordHasher');
    const request2Hasher = request2.resolve<PasswordHasher>('IPasswordHasher');

    // Each scope has its own instance
    expect(appHasher).not.toBe(request1Hasher);
    expect(request1Hasher).not.toBe(request2Hasher);
  });

  it('should maintain singleton within a scope', function () {
    const appContainer = createAppContainer().addRegistration(R.fromClass(PasswordHasher));
    const requestScope = appContainer.createScope({ tags: ['request'] });

    // Within the same scope, singleton is maintained
    const hasher1 = requestScope.resolve<PasswordHasher>('IPasswordHasher');
    const hasher2 = requestScope.resolve<PasswordHasher>('IPasswordHasher');

    expect(hasher1).toBe(hasher2);
  });
});

```

### Arguments
Sometimes you want to bind some arguments to provider. This is what `ArgsProvider` is for.
- `provider(args('someArgument'))`
- `provider(argsFn((container) => [container.resolve(Logger), 'someValue']))`
- `Provider.fromClass(Logger).pipe(args('someArgument'))`
- NOTICE: args from this provider has higher priority than args from `resolve` method.

```typescript
import {
  args,
  argsFn,
  bindTo,
  Container,
  SingleToken,
  inject,
  MultiCache,
  register,
  Registration as R,
  resolveByArgs,
  singleton,
} from 'ts-ioc-container';

@register(bindTo('logger'))
class Logger {
  constructor(
    public name: string,
    public type?: string,
  ) {}
}

describe('ArgsProvider', function () {
  function createContainer() {
    return new Container();
  }

  it('can assign argument function to provider', function () {
    const root = createContainer().addRegistration(R.fromClass(Logger).pipe(argsFn(() => ['name'])));

    const logger = root.createScope().resolve<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('can assign argument to provider', function () {
    const root = createContainer().addRegistration(R.fromClass(Logger).pipe(args('name')));

    const logger = root.resolve<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('should set provider arguments with highest priority in compare to resolve arguments', function () {
    const root = createContainer().addRegistration(R.fromClass(Logger).pipe(args('name')));

    const logger = root.resolve<Logger>('logger', { args: ['file'] });

    expect(logger.name).toBe('name');
    expect(logger.type).toBe('file');
  });

  it('should resolve dependency by passing arguments resolve from container by another argument', function () {
    interface IRepository {
      name: string;
    }

    const IUserRepositoryKey = new SingleToken<IRepository>('IUserRepository');
    const ITodoRepositoryKey = new SingleToken<IRepository>('ITodoRepository');

    @register(bindTo(IUserRepositoryKey))
    class UserRepository implements IRepository {
      name = 'UserRepository';
    }

    @register(bindTo(ITodoRepositoryKey))
    class TodoRepository implements IRepository {
      name = 'TodoRepository';
    }

    interface IEntityManager {
      repository: IRepository;
    }

    const IEntityManagerKey = new SingleToken<IEntityManager>('IEntityManager');

    @register(bindTo(IEntityManagerKey), argsFn(resolveByArgs))
    class EntityManager {
      constructor(public repository: IRepository) {}
    }

    class Main {
      constructor(
        @inject(IEntityManagerKey.args(IUserRepositoryKey)) public userEntities: EntityManager,
        @inject(IEntityManagerKey.args(ITodoRepositoryKey)) public todoEntities: EntityManager,
      ) {}
    }

    const root = createContainer()
      .addRegistration(R.fromClass(EntityManager))
      .addRegistration(R.fromClass(UserRepository))
      .addRegistration(R.fromClass(TodoRepository));
    const main = root.resolve(Main);

    expect(main.userEntities.repository).toBeInstanceOf(UserRepository);
    expect(main.todoEntities.repository).toBeInstanceOf(TodoRepository);
  });

  it('should resolve memoized dependency by passing arguments resolve from container by another argument', function () {
    interface IRepository {
      name: string;
    }

    const IUserRepositoryKey = new SingleToken<IRepository>('IUserRepository');
    const ITodoRepositoryKey = new SingleToken<IRepository>('ITodoRepository');

    @register(bindTo(IUserRepositoryKey))
    class UserRepository implements IRepository {
      name = 'UserRepository';
    }

    @register(bindTo(ITodoRepositoryKey))
    class TodoRepository implements IRepository {
      name = 'TodoRepository';
    }

    interface IEntityManager {
      repository: IRepository;
    }

    const IEntityManagerKey = new SingleToken<IEntityManager>('IEntityManager');

    @register(bindTo(IEntityManagerKey), argsFn(resolveByArgs), singleton(MultiCache.fromFirstArg))
    class EntityManager {
      constructor(public repository: IRepository) {}
    }

    class Main {
      constructor(
        @inject(IEntityManagerKey.args(IUserRepositoryKey)) public userEntities: EntityManager,
        @inject(IEntityManagerKey.args(ITodoRepositoryKey)) public todoEntities: EntityManager,
      ) {}
    }

    const root = createContainer()
      .addRegistration(R.fromClass(EntityManager))
      .addRegistration(R.fromClass(UserRepository))
      .addRegistration(R.fromClass(TodoRepository));
    const main = root.resolve(Main);

    const userRepository = IEntityManagerKey.args(IUserRepositoryKey).resolve(root).repository;
    expect(userRepository).toBeInstanceOf(UserRepository);
    expect(main.userEntities.repository).toBe(userRepository);

    const todoRepository = IEntityManagerKey.args(ITodoRepositoryKey).resolve(root).repository;
    expect(todoRepository).toBeInstanceOf(TodoRepository);
    expect(main.todoEntities.repository).toBe(todoRepository);
  });
});

```

### Visibility
Sometimes you want to hide dependency if somebody wants to resolve it from certain scope. This uses `ScopeAccessRule` to control access.
- `provider(scopeAccess(({ invocationScope, providerScope }) => invocationScope === providerScope))` - dependency will be accessible only from the scope where it's registered
- `Provider.fromClass(Logger).pipe(scopeAccess(({ invocationScope, providerScope }) => invocationScope === providerScope))`

```typescript
import 'reflect-metadata';
import {
  bindTo,
  Container,
  DependencyNotFoundError,
  register,
  Registration as R,
  scope,
  scopeAccess,
  singleton,
} from 'ts-ioc-container';

/**
 * User Management Domain - Visibility Control
 *
 * Some services should only be accessible in specific scopes:
 * - AdminService: Only accessible in admin routes
 * - AuditLogger: Only accessible at application level (not per-request)
 * - DebugService: Only accessible in development environment
 *
 * scopeAccess() controls VISIBILITY - whether a registered service
 * can be resolved from a particular scope.
 *
 * This provides security-by-design:
 * - Prevents accidental access to sensitive services
 * - Enforces architectural boundaries
 * - Catches misuse at resolution time (not runtime)
 */
describe('Visibility', function () {
  it('should restrict admin services to admin routes only', () => {
    // UserManagementService can delete users - admin only!
    @register(
      bindTo('IUserManagement'),
      scope((s) => s.hasTag('application')), // Registered at app level
      singleton(),
      // Only accessible from admin scope, not regular request scope
      scopeAccess(({ invocationScope }) => invocationScope.hasTag('admin')),
    )
    class UserManagementService {
      deleteUser(userId: string): string {
        return `Deleted user ${userId}`;
      }
    }

    const appContainer = new Container({ tags: ['application'] }).addRegistration(
      R.fromClass(UserManagementService),
    );

    // Admin route scope
    const adminScope = appContainer.createScope({ tags: ['request', 'admin'] });

    // Regular user route scope
    const userScope = appContainer.createScope({ tags: ['request', 'user'] });

    // Admin can access UserManagementService
    const adminService = adminScope.resolve<UserManagementService>('IUserManagement');
    expect(adminService.deleteUser('user-123')).toBe('Deleted user user-123');

    // Regular users cannot access it - security enforced at DI level
    expect(() => userScope.resolve('IUserManagement')).toThrowError(DependencyNotFoundError);
  });

  it('should restrict application-level services from request scope', () => {
    // AuditLogger should only be used at application initialization
    // Not from request handlers (to prevent log corruption from concurrent access)
    @register(
      bindTo('IAuditLogger'),
      scope((s) => s.hasTag('application')),
      singleton(),
      // Only accessible from the scope where it was registered
      scopeAccess(({ invocationScope, providerScope }) => invocationScope === providerScope),
    )
    class AuditLogger {
      log(message: string): string {
        return `AUDIT: ${message}`;
      }
    }

    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(AuditLogger));

    const requestScope = appContainer.createScope({ tags: ['request'] });

    // Application can use AuditLogger (for startup logging)
    expect(appContainer.resolve<AuditLogger>('IAuditLogger').log('App started')).toBe('AUDIT: App started');

    // Request handlers cannot access it directly
    expect(() => requestScope.resolve('IAuditLogger')).toThrowError(DependencyNotFoundError);
  });
});

```

### Alias
Alias is needed to group keys
- `@register(asAlias('logger'))` helper assigns `logger` alias to registration.
- `by.aliases((it) => it.has('logger') || it.has('a'))` resolves dependencies which have `logger` or `a` aliases
- `Provider.fromClass(Logger).pipe(alias('logger'))`

```typescript
import 'reflect-metadata';
import {
  bindTo,
  Container,
  DependencyNotFoundError,
  inject,
  register,
  Registration as R,
  scope,
  select as s,
} from 'ts-ioc-container';

/**
 * User Management Domain - Alias Pattern (Multiple Implementations)
 *
 * Aliases allow multiple services to be registered under the same key.
 * This is useful for:
 * - Plugin systems (multiple notification channels)
 * - Strategy pattern (multiple authentication providers)
 * - Event handlers (multiple listeners for same event)
 *
 * Example: NotificationService with Email, SMS, and Push implementations
 */
describe('alias', () => {
  // All notification services share this alias
  const INotificationChannel = 'INotificationChannel';
  const notificationChannel = register(bindTo(s.alias(INotificationChannel)));

  interface INotificationChannel {
    send(userId: string, message: string): void;
    getDeliveredMessages(): string[];
  }

  // Email notification - always available
  @notificationChannel
  class EmailNotifier implements INotificationChannel {
    private delivered: string[] = [];

    send(userId: string, message: string): void {
      this.delivered.push(`EMAIL to ${userId}: ${message}`);
    }

    getDeliveredMessages(): string[] {
      return this.delivered;
    }
  }

  // SMS notification - for urgent messages
  @notificationChannel
  class SmsNotifier implements INotificationChannel {
    private delivered: string[] = [];

    send(userId: string, message: string): void {
      this.delivered.push(`SMS to ${userId}: ${message}`);
    }

    getDeliveredMessages(): string[] {
      return this.delivered;
    }
  }

  it('should notify through all channels', () => {
    // NotificationManager broadcasts to ALL registered channels
    class NotificationManager {
      constructor(@inject(s.alias(INotificationChannel)) private channels: INotificationChannel[]) {}

      notifyUser(userId: string, message: string): void {
        for (const channel of this.channels) {
          channel.send(userId, message);
        }
      }

      getChannelCount(): number {
        return this.channels.length;
      }
    }

    const container = new Container()
      .addRegistration(R.fromClass(EmailNotifier))
      .addRegistration(R.fromClass(SmsNotifier));

    const manager = container.resolve(NotificationManager);
    manager.notifyUser('user-123', 'Your password was reset');

    // Both channels received the message
    expect(manager.getChannelCount()).toBe(2);
  });

  it('should resolve single implementation by alias', () => {
    // Sometimes you only need one implementation (e.g., primary email service)
    @register(bindTo(s.alias('IPrimaryNotifier')))
    class PrimaryEmailNotifier {
      readonly type = 'email';
    }

    const container = new Container().addRegistration(R.fromClass(PrimaryEmailNotifier));

    // resolveOneByAlias returns first matching implementation
    const notifier = container.resolveOneByAlias<PrimaryEmailNotifier>('IPrimaryNotifier');
    expect(notifier.type).toBe('email');

    // Direct key resolution fails - only alias is registered
    expect(() => container.resolve('IPrimaryNotifier')).toThrowError(DependencyNotFoundError);
  });

  it('should use different implementations per scope', () => {
    // Development: Console logger for easy debugging
    @register(bindTo(s.alias('ILogger')), scope((s) => s.hasTag('development')))
    class ConsoleLogger {
      readonly type = 'console';
    }

    // Production: Database logger for audit trail
    @register(bindTo(s.alias('ILogger')), scope((s) => s.hasTag('production')))
    class DatabaseLogger {
      readonly type = 'database';
    }

    // Development environment
    const devContainer = new Container({ tags: ['development'] })
      .addRegistration(R.fromClass(ConsoleLogger))
      .addRegistration(R.fromClass(DatabaseLogger));

    // Production environment
    const prodContainer = new Container({ tags: ['production'] })
      .addRegistration(R.fromClass(ConsoleLogger))
      .addRegistration(R.fromClass(DatabaseLogger));

    const devLogger = devContainer.resolveOneByAlias<ConsoleLogger | DatabaseLogger>('ILogger');
    const prodLogger = prodContainer.resolveOneByAlias<ConsoleLogger | DatabaseLogger>('ILogger');

    expect(devLogger.type).toBe('console');
    expect(prodLogger.type).toBe('database');
  });
});

```

### Decorator
Sometimes you want to decorate you class with some logic. This is what `DecoratorProvider` is for.
- `provider(decorate((instance, container) => new LoggerDecorator(instance)))`

```typescript
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
} from 'ts-ioc-container';

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
      @inject(s.token('Logger').lazy()) private logger: Logger,
    ) {}

    async save(item: Todo): Promise<void> {
      this.logger.log(item.id);
      return this.repository.save(item);
    }
  }

  const logRepo = (dep: IRepository, scope: IContainer) => scope.resolve(LogRepository, { args: [dep] });

  @register(bindTo('IRepository'), decorate(logRepo))
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
    const app = container.resolve(App);
    const logger = container.resolve<Logger>('Logger');
    await app.run();

    // Assert
    expect(logger.printLogs()).toBe('1,2');
  });
});

```

## Registration
Registration is provider factory which registers provider in container.
- `@register(asKey('logger'))`
- `Registration.fromClass(Logger).to('logger')`
- `Registration.fromClass(Logger)`
- `Registration.fromValue(Logger)`
- `Registration.fromFn((container, ...args) => container.resolve(Logger, {args}))`

### Key
Sometimes you want to register provider with certain key. This is what `key` is for.

- by default, key is class name
- you can assign the same key to different registrations

```typescript
import {
  bindTo,
  Container,
  DependencyMissingKeyError,
  register,
  Registration as R,
  scope,
  select as s,
  singleton,
} from 'ts-ioc-container';

describe('Registration module', function () {
  const createContainer = () => new Container({ tags: ['root'] });

  it('should register class', function () {
    @register(bindTo('ILogger'), scope((s) => s.hasTag('root')), singleton())
    class Logger {}

    const root = createContainer().addRegistration(R.fromClass(Logger));

    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register value', function () {
    const root = createContainer().addRegistration(R.fromValue('smth').bindToKey('ISmth'));

    expect(root.resolve('ISmth')).toBe('smth');
  });

  it('should register fn', function () {
    const root = createContainer().addRegistration(R.fromFn(() => 'smth').bindToKey('ISmth'));

    expect(root.resolve('ISmth')).toBe('smth');
  });

  it('should raise an error if key is not provider', () => {
    expect(() => {
      createContainer().addRegistration(R.fromValue('smth'));
    }).toThrowError(DependencyMissingKeyError);
  });

  it('should register dependency by class name if @key is not provided', function () {
    class FileLogger {}

    const root = createContainer().addRegistration(R.fromClass(FileLogger));

    expect(root.resolve('FileLogger')).toBeInstanceOf(FileLogger);
  });

  it('should assign additional key which redirects to original one', function () {
    @register(bindTo('ILogger'), bindTo(s.alias('Logger')), singleton())
    class Logger {}

    const root = createContainer().addRegistration(R.fromClass(Logger));

    expect(root.resolveByAlias('Logger')[0]).toBeInstanceOf(Logger);
    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });
});

```

### Scope
Sometimes you need to register provider only in scope which matches to certain condition and their sub scopes. Especially if you want to register dependency as singleton for some tags, for example `root`. This uses `ScopeMatchRule` to determine which scopes should have the provider.
- `@register(scope((container) => container.hasTag('root'))` - register provider only in root scope
- `Registration.fromClass(Logger).when((container) => container.hasTag('root'))`

```typescript
import { bindTo, Container, register, Registration as R, scope, singleton } from 'ts-ioc-container';

@register(bindTo('ILogger'), scope((s) => s.hasTag('root')), singleton())
class Logger {}
describe('ScopeProvider', function () {
  it('should return the same instance', function () {
    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope();
    expect(root.resolve('ILogger')).toBe(child.resolve('ILogger'));
  });
});

```

## Module
Sometimes you want to encapsulate registration logic in separate module. This is what `IContainerModule` is for.

```typescript
import 'reflect-metadata';
import { bindTo, Container, type IContainer, type IContainerModule, register, Registration as R } from 'ts-ioc-container';

/**
 * User Management Domain - Container Modules
 *
 * Modules organize related registrations and allow swapping implementations
 * based on environment (development, testing, production).
 *
 * Common module patterns:
 * - ProductionModule: Real database, external APIs, email service
 * - DevelopmentModule: In-memory database, mock APIs, console logging
 * - TestingModule: Mocks with assertion capabilities
 *
 * This enables:
 * - Easy environment switching
 * - Isolated testing without external dependencies
 * - Feature flags via module composition
 */

// Auth service interface - same API for all environments
interface IAuthService {
  authenticate(email: string, password: string): boolean;
  getServiceType(): string;
}

// Production: Real authentication with database lookup
@register(bindTo('IAuthService'))
class ProductionAuthService implements IAuthService {
  authenticate(email: string, password: string): boolean {
    // In production, this would query the database
    return email === 'admin@example.com' && password === 'secure_password';
  }

  getServiceType(): string {
    return 'production';
  }
}

// Development: Accepts any credentials for easy testing
@register(bindTo('IAuthService'))
class DevelopmentAuthService implements IAuthService {
  authenticate(_email: string, _password: string): boolean {
    // Always succeed in development for easier testing
    return true;
  }

  getServiceType(): string {
    return 'development';
  }
}

// Production module - real services with security
class ProductionModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(ProductionAuthService));
    // In a real app, also register:
    // - Real database connection
    // - External email service
    // - Payment gateway
  }
}

// Development module - mocks and conveniences
class DevelopmentModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(DevelopmentAuthService));
    // In a real app, also register:
    // - In-memory database
    // - Console email logger
    // - Mock payment gateway
  }
}

describe('Container Modules', function () {
  function createContainer(isProduction: boolean) {
    const module = isProduction ? new ProductionModule() : new DevelopmentModule();
    return new Container().useModule(module);
  }

  it('should use production auth with strict validation', function () {
    const container = createContainer(true);
    const auth = container.resolve<IAuthService>('IAuthService');

    expect(auth.getServiceType()).toBe('production');
    expect(auth.authenticate('admin@example.com', 'secure_password')).toBe(true);
    expect(auth.authenticate('admin@example.com', 'wrong_password')).toBe(false);
  });

  it('should use development auth with permissive validation', function () {
    const container = createContainer(false);
    const auth = container.resolve<IAuthService>('IAuthService');

    expect(auth.getServiceType()).toBe('development');
    // Development mode accepts any credentials
    expect(auth.authenticate('any@email.com', 'any_password')).toBe(true);
  });

  it('should allow composing multiple modules', function () {
    // Modules can be composed for feature flags or A/B testing
    class FeatureFlagModule implements IContainerModule {
      constructor(private enableNewFeature: boolean) {}

      applyTo(container: IContainer): void {
        if (this.enableNewFeature) {
          // Register new feature implementations
        }
      }
    }

    const container = new Container()
      .useModule(new ProductionModule())
      .useModule(new FeatureFlagModule(true));

    // Base services from ProductionModule
    expect(container.resolve<IAuthService>('IAuthService').getServiceType()).toBe('production');
  });
});

```

## Hook
Sometimes you need to invoke methods after construct or dispose of class. This is what hooks are for.

### OnConstruct
```typescript
import {
  AddOnConstructHookModule,
  Container,
  HookContext,
  HookFn,
  inject,
  onConstruct,
  Registration as R,
} from 'ts-ioc-container';

const execute: HookFn = (ctx: HookContext) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

class Car {
  private engine!: string;

  @onConstruct(execute)
  setEngine(@inject('engine') engine: string) {
    this.engine = engine;
  }

  getEngine() {
    return this.engine;
  }
}

describe('onConstruct', function () {
  it('should run methods and resolve arguments from container', function () {
    const root = new Container()
      .useModule(new AddOnConstructHookModule())
      .addRegistration(R.fromValue('bmw').bindTo('engine'));

    const car = root.resolve(Car);

    expect(car.getEngine()).toBe('bmw');
  });
});

```

### OnDispose
```typescript
import {
  AddOnDisposeHookModule,
  bindTo,
  Container,
  type HookFn,
  inject,
  onDispose,
  register,
  Registration as R,
  singleton,
} from 'ts-ioc-container';

const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

@register(bindTo('logsRepo'), singleton())
class LogsRepo {
  savedLogs: string[] = [];

  saveLogs(messages: string[]) {
    this.savedLogs.push(...messages);
  }
}

@register(bindTo('logger'))
class Logger {
  @onDispose(({ instance, methodName }) => {
    // @ts-ignore
    instance[methodName].push('world');
  }) // <--- or extract it to @onDispose
  private messages: string[] = [];

  constructor(@inject('logsRepo') private logsRepo: LogsRepo) {}

  log(message: string): void {
    this.messages.push(message);
  }

  @onDispose(execute)
  save() {
    this.logsRepo.saveLogs(this.messages);
  }
}

describe('onDispose', function () {
  it('should invoke hooks on all instances', function () {
    const container = new Container()
      .useModule(new AddOnDisposeHookModule())
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromClass(LogsRepo));

    const logger = container.resolve<Logger>('logger');
    logger.log('Hello');
    const logsRepo = container.resolve<LogsRepo>('logsRepo');

    container.dispose();

    expect(logsRepo.savedLogs.join(',')).toBe('Hello,world');
  });
});

```

### Inject property

```typescript
import { Container, hook, HooksRunner, injectProp, Registration } from 'ts-ioc-container';

const onInitHookRunner = new HooksRunner('onInit');
describe('inject property', () => {
  it('should inject property', () => {
    class App {
      @hook('onInit', injectProp('greeting'))
      greeting!: string;
    }
    const expected = 'Hello world!';

    const scope = new Container().addRegistration(Registration.fromValue(expected).bindToKey('greeting'));
    const app = scope.resolve(App);
    onInitHookRunner.execute(app, { scope });

    expect(app.greeting).toBe(expected);
  });
});

```

## Error

- [DependencyNotFoundError.ts](..%2F..%2Flib%2Ferrors%2FDependencyNotFoundError.ts)
- [MethodNotImplementedError.ts](..%2F..%2Flib%2Ferrors%2FMethodNotImplementedError.ts)
- [DependencyMissingKeyError.ts](..%2F..%2Flib%2Ferrors%2FDependencyMissingKeyError.ts)
- [ContainerDisposedError.ts](..%2F..%2Flib%2Ferrors%2FContainerDisposedError.ts)

