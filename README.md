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
- [Quickstart](#quickstart)
- [Cheatsheet](#cheatsheet)
- [Recipes](#recipes)
- [Container](#container)
    - [Basic usage](#basic-usage)
    - [Scope](#scope) `tags`
    - [Dynamic Tag Management](#dynamic-tag-management) `addTags`
    - [Instances](#instances)
    - [Dispose](#dispose)
    - [Lazy](#lazy) `lazy`
    - [Lazy with registerPipe](#lazy-with-registerpipe) `lazy()`
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

## Quickstart

```typescript
import 'reflect-metadata';
import { Container, register, bindTo, singleton } from 'ts-ioc-container';

@register(bindTo('ILogger'), singleton())
class Logger {
  log(message: string) {
    console.log(message);
  }
}

class App {
  constructor(private logger = container.resolve<Logger>('ILogger')) {}
  start() {
    this.logger.log('hello');
  }
}

const container = new Container({ tags: ['application'] }).addRegistration(Logger);
container.resolve(App).start();
```

## Cheatsheet

- Register class with key: `@register(bindTo('Key')) class Service {}`
- Register value: `R.fromValue(config).bindToKey('Config')`
- Singleton: `@register(singleton())`
- Scoped registration: `@register(scope((s) => s.hasTag('request')))`
- Resolve by alias: `container.resolveByAlias('Alias')`
- Current scope token: `select.scope.current`
- Lazy token: `select.token('Service').lazy()`
- Inject decorator: `@inject('Key')`
- Property inject: `injectProp(target, 'propName', select.token('Key'))`

## Recipes

### Express/Next handler (per-request scope)
```typescript
const app = new Container({ tags: ['application'] })
  .addRegistration(R.fromClass(Logger).pipe(singleton()));

function handleRequest() {
  const requestScope = app.createScope({ tags: ['request'] });
  const logger = requestScope.resolve<Logger>('Logger');
  logger.log('req started');
}
```

### Background worker (singleton client, transient jobs)
```typescript
@register(singleton())
class QueueClient {}

class JobHandler {
  constructor(@inject('QueueClient') private queue: QueueClient) {}
}

const worker = new Container({ tags: ['worker'] })
  .addRegistration(R.fromClass(QueueClient))
  .addRegistration(R.fromClass(JobHandler));
```

### Frontend widget/page scope with lazy dependency
```typescript
@register(bindTo('FeatureFlags'), singleton())
class FeatureFlags {
  load() { /* fetch flags */ }
}

class Widget {
  constructor(@inject(select.token('FeatureFlags').lazy()) private flags: FeatureFlags) {}
}

const page = new Container({ tags: ['page'] })
  .addRegistration(R.fromClass(FeatureFlags))
  .addRegistration(R.fromClass(Widget));
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

### Dynamic Tag Management
You can dynamically add tags to a container after it's been created using the `addTags()` method. This is useful for environment-based configuration, feature flags, and progressive container setup.

- Tags can be added one at a time or multiple at once
- Tags must be added **before** registrations are applied - scope matching happens at registration time
- Useful for conditional configuration based on `NODE_ENV` or runtime flags
- Container can be configured incrementally as the application initializes

```typescript
import { bindTo, Container, register, Registration as R, scope } from 'ts-ioc-container';

describe('addTags', () => {
  it('should dynamically add tags to enable environment-based registration', () => {
    @register(bindTo('logger'), scope((s) => s.hasTag('development')))
    class ConsoleLogger {
      log(message: string) {
        console.log(`[DEV] ${message}`);
      }
    }

    @register(bindTo('logger'), scope((s) => s.hasTag('production')))
    class FileLogger {
      log(message: string) {
        console.log(`[PROD] ${message}`);
      }
    }

    // Create container and configure for environment
    const container = new Container();
    const environment = 'development';
    container.addTags(environment); // Add tag dynamically based on environment

    // Register services after tag is set
    container.addRegistration(R.fromClass(ConsoleLogger)).addRegistration(R.fromClass(FileLogger));

    // Resolve logger - gets ConsoleLogger because 'development' tag was added
    const logger = container.resolve<ConsoleLogger>('logger');
    expect(logger).toBeInstanceOf(ConsoleLogger);
  });

  it('should add multiple tags for feature-based configuration', () => {
    @register(bindTo('premiumFeature'), scope((s) => s.hasTag('premium')))
    class PremiumFeature {}

    @register(bindTo('betaFeature'), scope((s) => s.hasTag('beta')))
    class BetaFeature {}

    const container = new Container();

    // Add multiple tags at once
    container.addTags('premium', 'beta', 'experimental');

    // Verify all tags are present
    expect(container.hasTag('premium')).toBe(true);
    expect(container.hasTag('beta')).toBe(true);
    expect(container.hasTag('experimental')).toBe(true);

    // Register features after tags are added
    container.addRegistration(R.fromClass(PremiumFeature)).addRegistration(R.fromClass(BetaFeature));

    // Both features are available because container has both tags
    expect(container.resolve('premiumFeature')).toBeInstanceOf(PremiumFeature);
    expect(container.resolve('betaFeature')).toBeInstanceOf(BetaFeature);
  });

  it('should affect child scope creation', () => {
    @register(bindTo('service'), scope((s) => s.hasTag('api')))
    class ApiService {
      handleRequest() {
        return 'API response';
      }
    }

    const appContainer = new Container();

    // Add tag to parent
    appContainer.addTags('api');
    appContainer.addRegistration(R.fromClass(ApiService));

    // Create child scopes - they inherit parent's registrations
    const requestScope1 = appContainer.createScope({ tags: ['request'] });
    const requestScope2 = appContainer.createScope({ tags: ['request'] });

    // Both scopes can access the ApiService from parent
    expect(requestScope1.resolve<ApiService>('service').handleRequest()).toBe('API response');
    expect(requestScope2.resolve<ApiService>('service').handleRequest()).toBe('API response');
  });

  it('should enable incremental tag addition', () => {
    const container = new Container();

    // Start with basic tags
    container.addTags('application');
    expect(container.hasTag('application')).toBe(true);

    // Add more tags as needed
    container.addTags('monitoring', 'logging');
    expect(container.hasTag('monitoring')).toBe(true);
    expect(container.hasTag('logging')).toBe(true);

    // All tags are retained
    expect(container.hasTag('application')).toBe(true);
  });
});

```

### Instances
Sometimes you want to get all instances from container and its scopes. For example, when you want to dispose all instances of container.

- you can get instances from container and scope which were created by injector

```typescript
import { bindTo, Container, inject, register, Registration as R, select } from 'ts-ioc-container';

/**
 * User Management Domain - Instance Collection
 *
 * Sometimes you need access to all instances of a certain type:
 * - Collect all active database connections for health checks
 * - Gather all loggers to flush buffers before shutdown
 * - Find all request handlers for metrics collection
 *
 * The `select.instances()` token resolves all created instances,
 * optionally filtered by a predicate function.
 */
describe('Instances', function () {
  @register(bindTo('ILogger'))
  class Logger {}

  it('should collect instances across scope hierarchy', () => {
    // App that needs access to all logger instances (e.g., for flushing)
    class App {
      constructor(@inject(select.instances()) public loggers: Logger[]) {}
    }

    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));
    const requestScope = appContainer.createScope({ tags: ['request'] });

    // Create loggers in different scopes
    appContainer.resolve('ILogger');
    requestScope.resolve('ILogger');

    const appLevel = appContainer.resolve(App);
    const requestLevel = requestScope.resolve(App);

    // Request scope sees only its own instance
    expect(requestLevel.loggers.length).toBe(1);
    // Application scope sees all instances (cascades up from children)
    expect(appLevel.loggers.length).toBe(2);
  });

  it('should return only current scope instances when cascade is disabled', () => {
    // Only get instances from current scope, not parent scopes
    class App {
      constructor(@inject(select.instances().cascade(false)) public loggers: Logger[]) {}
    }

    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));
    const requestScope = appContainer.createScope({ tags: ['request'] });

    appContainer.resolve('ILogger');
    requestScope.resolve('ILogger');

    const appLevel = appContainer.resolve(App);

    // Only application-level instance, not request-level
    expect(appLevel.loggers.length).toBe(1);
  });

  it('should filter instances by predicate', () => {
    const isLogger = (instance: unknown) => instance instanceof Logger;

    class App {
      constructor(@inject(select.instances(isLogger)) public loggers: Logger[]) {}
    }

    const container = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));

    const logger0 = container.resolve('ILogger');
    const logger1 = container.resolve('ILogger');
    const app = container.resolve(App);

    expect(app.loggers).toHaveLength(2);
    expect(app.loggers[0]).toBe(logger0);
    expect(app.loggers[1]).toBe(logger1);
  });
});

```

### Check Registration
Sometimes you want to check if a registration with a specific key exists in the container. This is useful for conditional registration logic, validation, and debugging.

- `hasRegistration(key)` checks if a registration exists in the current container
- Only checks the current container's registrations (not parent containers)
- Works with string keys, symbol keys, and token keys
- Returns false after container disposal

```typescript
import { Container, Registration as R, bindTo, register, SingleToken } from 'ts-ioc-container';

/**
 * Container Registration Checking - hasRegistration
 *
 * The `hasRegistration` method allows you to check if a registration with a specific key
 * exists in the current container. This is useful for conditional registration logic,
 * validation, and debugging.
 *
 * Key points:
 * - Checks only the current container's registrations (not parent containers)
 * - Works with string keys, symbol keys, and token keys
 * - Returns false after container disposal
 * - Useful for conditional registration patterns
 */
describe('hasRegistration', function () {
  const createAppContainer = () => new Container({ tags: ['application'] });

  it('should return true when registration exists with string key', function () {
    const container = createAppContainer();
    container.addRegistration(R.fromValue('production').bindToKey('Environment'));

    expect(container.hasRegistration('Environment')).toBe(true);
  });

  it('should return false when registration does not exist', function () {
    const container = createAppContainer();

    expect(container.hasRegistration('NonExistentService')).toBe(false);
  });

  it('should work with symbol keys', function () {
    const container = createAppContainer();
    const serviceKey = Symbol('IService');
    container.addRegistration(R.fromValue({ name: 'Service' }).bindToKey(serviceKey));

    expect(container.hasRegistration(serviceKey)).toBe(true);
  });

  it('should work with token keys', function () {
    const container = createAppContainer();
    const loggerToken = new SingleToken<{ log: (msg: string) => void }>('ILogger');
    container.addRegistration(R.fromValue({ log: () => {} }).bindTo(loggerToken));

    expect(container.hasRegistration(loggerToken)).toBe(true);
  });

  it('should only check current container, not parent registrations', function () {
    // Parent container has a registration
    const parent = createAppContainer();
    parent.addRegistration(R.fromValue('parent-config').bindToKey('Config'));

    // Child scope does not have the registration
    const child = parent.createScope();
    child.addRegistration(R.fromValue('child-service').bindToKey('Service'));

    // Child should not see parent's registration
    expect(child.hasRegistration('Config')).toBe(false);
    // But child should see its own registration
    expect(child.hasRegistration('Service')).toBe(true);
    // Parent should see its own registration
    expect(parent.hasRegistration('Config')).toBe(true);
  });

  it('should work with class-based registrations', function () {
    @register(bindTo('ILogger'))
    class Logger {}

    const container = createAppContainer();
    container.addRegistration(R.fromClass(Logger));

    expect(container.hasRegistration('ILogger')).toBe(true);
  });

  it('should be useful for conditional registration patterns', function () {
    const container = createAppContainer();

    // Register a base service
    container.addRegistration(R.fromValue('base-service').bindToKey('BaseService'));

    // Conditionally register an extension only if base exists
    if (container.hasRegistration('BaseService')) {
      container.addRegistration(R.fromValue('extension-service').bindToKey('ExtensionService'));
    }

    expect(container.hasRegistration('BaseService')).toBe(true);
    expect(container.hasRegistration('ExtensionService')).toBe(true);
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
  isClosed = false;

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

### Lazy with registerPipe
The `lazy()` registerPipe can be used in two ways: with the `@register` decorator or directly on the `Provider` pipe. This allows you to defer expensive service initialization until first access.

**Use cases:**
- Defer expensive initialization (database connections, SMTP, external APIs)
- Conditional features that may not be used
- Breaking circular dependencies
- Memory optimization for optional services

**Two approaches:**

1. **With @register decorator**: Use `lazy()` as a registerPipe in the decorator
2. **With Provider pipe**: Use `Provider.fromClass().pipe(lazy())` directly

```typescript
import 'reflect-metadata';
import { bindTo, Container, inject, lazy, Provider, register, Registration as R, singleton } from 'ts-ioc-container';

/**
 * Lazy Loading with registerPipe
 *
 * The lazy() registerPipe can be used in two ways:
 * 1. With @register decorator - lazy()
 * 2. Directly on provider - provider.lazy()
 *
 * Both approaches defer instantiation until first access,
 * improving startup time and memory usage.
 */
describe('lazy registerPipe', () => {
  // Track initialization for testing
  const initLog: string[] = [];

  beforeEach(() => {
    initLog.length = 0;
  });

  /**
   * Example 1: Using lazy() with @register decorator
   *
   * The lazy() registerPipe defers service instantiation until first use.
   * Perfect for expensive services that may not always be needed.
   */
  describe('with @register decorator', () => {
    // Database connection pool - expensive to initialize
    @register(bindTo('DatabasePool'), singleton())
    class DatabasePool {
      constructor() {
        initLog.push('DatabasePool initialized');
      }

      query(sql: string): string[] {
        return [`Results for: ${sql}`];
      }
    }

    // Analytics service - expensive, but only used occasionally
    @register(bindTo('AnalyticsService'), lazy(), singleton())
    class AnalyticsService {
      constructor(@inject('DatabasePool') private db: DatabasePool) {
        initLog.push('AnalyticsService initialized');
      }

      trackEvent(event: string): void {
        this.db.query(`INSERT INTO events VALUES ('${event}')`);
      }

      generateReport(): string {
        return 'Analytics Report';
      }
    }

    // Application service - always used
    class AppService {
      constructor(@inject('AnalyticsService') public analytics: AnalyticsService) {
        initLog.push('AppService initialized');
      }

      handleRequest(path: string): void {
        // Most requests don't need analytics
        if (path.includes('/admin')) {
          // Only admin requests use analytics
          this.analytics.trackEvent(`Admin access: ${path}`);
        }
      }
    }

    it('should defer AnalyticsService initialization until first access', () => {
      const container = new Container()
        .addRegistration(R.fromClass(DatabasePool))
        .addRegistration(R.fromClass(AnalyticsService))
        .addRegistration(R.fromClass(AppService));

      // Resolve AppService
      const app = container.resolve<AppService>(AppService);

      // AppService is initialized, but AnalyticsService is NOT (it's lazy)
      // DatabasePool is also not initialized because AnalyticsService hasn't been accessed
      expect(initLog).toEqual(['AppService initialized']);

      // Handle non-admin request - analytics not used
      app.handleRequest('/api/users');
      expect(initLog).toEqual(['AppService initialized']);
    });

    it('should initialize lazy service when first accessed', () => {
      const container = new Container()
        .addRegistration(R.fromClass(DatabasePool))
        .addRegistration(R.fromClass(AnalyticsService))
        .addRegistration(R.fromClass(AppService));

      const app = container.resolve<AppService>(AppService);

      // Handle admin request - now analytics IS used
      app.handleRequest('/admin/dashboard');

      // AnalyticsService was initialized on first access (DatabasePool too, as a dependency)
      expect(initLog).toEqual(['AppService initialized', 'DatabasePool initialized', 'AnalyticsService initialized']);
    });

    it('should create only one instance even with multiple accesses', () => {
      const container = new Container()
        .addRegistration(R.fromClass(DatabasePool))
        .addRegistration(R.fromClass(AnalyticsService))
        .addRegistration(R.fromClass(AppService));

      const app = container.resolve<AppService>(AppService);

      // Access analytics multiple times
      app.handleRequest('/admin/dashboard');
      app.analytics.generateReport();
      app.analytics.trackEvent('test');

      // AnalyticsService initialized only once (singleton + lazy)
      const analyticsCount = initLog.filter((msg) => msg === 'AnalyticsService initialized').length;
      expect(analyticsCount).toBe(1);
    });
  });

  /**
   * Example 2: Using lazy() directly on provider
   *
   * For manual registration, call .lazy() on the provider pipe.
   * This gives fine-grained control over lazy loading per dependency.
   */
  describe('with pure provider', () => {
    // Email service - expensive SMTP connection
    class EmailService {
      constructor() {
        initLog.push('EmailService initialized - SMTP connected');
      }

      send(to: string, subject: string): string {
        return `Email sent to ${to}: ${subject}`;
      }
    }

    // SMS service - expensive gateway connection
    class SmsService {
      constructor() {
        initLog.push('SmsService initialized - Gateway connected');
      }

      send(to: string, message: string): string {
        return `SMS sent to ${to}: ${message}`;
      }
    }

    // Notification service - uses email and SMS, but maybe not both
    class NotificationService {
      constructor(
        @inject('EmailService') public email: EmailService,
        @inject('SmsService') public sms: SmsService,
      ) {
        initLog.push('NotificationService initialized');
      }

      notifyByEmail(user: string, message: string): string {
        return this.email.send(user, message);
      }

      notifyBySms(phone: string, message: string): string {
        return this.sms.send(phone, message);
      }
    }

    it('should allow selective lazy loading - email lazy, SMS eager', () => {
      const container = new Container()
        // EmailService is lazy - won't connect to SMTP until used
        .addRegistration(
          R.fromClass(EmailService)
            .bindToKey('EmailService')
            .pipe(singleton(), (p) => p.lazy()),
        )
        // SmsService is eager - connects to gateway immediately
        .addRegistration(R.fromClass(SmsService).bindToKey('SmsService').pipe(singleton()))
        .addRegistration(R.fromClass(NotificationService));

      // Resolve NotificationService
      const notifications = container.resolve<NotificationService>(NotificationService);

      // SmsService initialized immediately (eager)
      // EmailService NOT initialized yet (lazy)
      expect(initLog).toEqual(['SmsService initialized - Gateway connected', 'NotificationService initialized']);

      // Send SMS - already initialized
      notifications.notifyBySms('555-1234', 'Test');
      expect(initLog).toEqual(['SmsService initialized - Gateway connected', 'NotificationService initialized']);
    });

    it('should initialize lazy email service when first accessed', () => {
      const container = new Container()
        .addRegistration(
          R.fromClass(EmailService)
            .bindToKey('EmailService')
            .pipe(singleton(), (p) => p.lazy()),
        )
        .addRegistration(R.fromClass(SmsService).bindToKey('SmsService').pipe(singleton()))
        .addRegistration(R.fromClass(NotificationService));

      const notifications = container.resolve<NotificationService>(NotificationService);

      // Send email - NOW EmailService is initialized
      const result = notifications.notifyByEmail('user@example.com', 'Welcome!');

      expect(result).toBe('Email sent to user@example.com: Welcome!');
      expect(initLog).toContain('EmailService initialized - SMTP connected');
    });

    it('should work with multiple lazy providers', () => {
      const container = new Container()
        // Both services are lazy
        .addRegistration(
          R.fromClass(EmailService)
            .bindToKey('EmailService')
            .pipe(singleton(), (p) => p.lazy()),
        )
        .addRegistration(
          R.fromClass(SmsService)
            .bindToKey('SmsService')
            .pipe(singleton(), (p) => p.lazy()),
        )
        .addRegistration(R.fromClass(NotificationService));

      const notifications = container.resolve<NotificationService>(NotificationService);

      // Neither service initialized yet
      expect(initLog).toEqual(['NotificationService initialized']);

      // Use SMS - only SMS initialized
      notifications.notifyBySms('555-1234', 'Test');
      expect(initLog).toEqual(['NotificationService initialized', 'SmsService initialized - Gateway connected']);

      // Use Email - now Email initialized
      notifications.notifyByEmail('user@example.com', 'Test');
      expect(initLog).toEqual([
        'NotificationService initialized',
        'SmsService initialized - Gateway connected',
        'EmailService initialized - SMTP connected',
      ]);
    });
  });

  /**
   * Example 3: Pure Provider usage (without Registration)
   *
   * Use Provider.fromClass() directly with lazy() for maximum flexibility.
   */
  describe('with pure Provider', () => {
    class CacheService {
      constructor() {
        initLog.push('CacheService initialized - Redis connected');
      }

      get(key: string): string | null {
        return `cached:${key}`;
      }
    }

    class ApiService {
      constructor(@inject('CacheService') private cache: CacheService) {
        initLog.push('ApiService initialized');
      }

      fetchData(id: string): string {
        const cached = this.cache.get(id);
        return cached || `fresh:${id}`;
      }
    }

    it('should use Provider.fromClass with lazy() helper', () => {
      // Create pure provider with lazy loading
      const cacheProvider = Provider.fromClass(CacheService).pipe(lazy(), singleton());

      const container = new Container();
      container.register('CacheService', cacheProvider);
      container.addRegistration(R.fromClass(ApiService));

      const api = container.resolve<ApiService>(ApiService);

      // CacheService not initialized yet (lazy)
      expect(initLog).toEqual(['ApiService initialized']);

      // Access cache - NOW it's initialized
      api.fetchData('user:1');
      expect(initLog).toContain('CacheService initialized - Redis connected');
    });

    it('should allow importing lazy as named export', () => {
      // Demonstrate that lazy() is imported from the library
      const cacheProvider = Provider.fromClass(CacheService).pipe(lazy());

      const container = new Container();
      container.register('CacheService', cacheProvider);

      const cache = container.resolve<CacheService>('CacheService');

      // Not initialized until accessed
      expect(initLog).toEqual([]);
      cache.get('test');
      expect(initLog).toEqual(['CacheService initialized - Redis connected']);
    });
  });

  /**
   * Example 4: Combining lazy with other pipes
   *
   * lazy() works seamlessly with other provider transformations.
   */
  describe('combining with other pipes', () => {
    class ConfigService {
      constructor(
        public apiUrl: string,
        public timeout: number,
      ) {
        initLog.push(`ConfigService initialized with ${apiUrl}`);
      }
    }

    it('should combine lazy with args and singleton', () => {
      const container = new Container().addRegistration(
        R.fromClass(ConfigService)
          .bindToKey('Config')
          .pipe(
            (p) => p.setArgs(() => ['https://api.example.com', 5000]),
            (p) => p.lazy(),
          )
          .pipe(singleton()),
      );

      // Config not initialized yet
      expect(initLog).toEqual([]);

      // Resolve - still not initialized (lazy)
      const config1 = container.resolve<ConfigService>('Config');
      expect(initLog).toEqual([]);

      // Access property - NOW initialized
      const url = config1.apiUrl;
      expect(url).toBe('https://api.example.com');
      expect(initLog).toEqual(['ConfigService initialized with https://api.example.com']);

      // Resolve again - same instance (singleton)
      const config2 = container.resolve<ConfigService>('Config');
      expect(config2).toBe(config1);
      expect(initLog.length).toBe(1); // Still only one initialization
    });
  });

  /**
   * Example 5: Real-world use case - Resource Management
   *
   * Lazy loading is ideal for:
   * - Database connections
   * - File handles
   * - External API clients
   * - Report generators
   */
  describe('real-world example - feature flags', () => {
    class FeatureFlagService {
      constructor() {
        initLog.push('FeatureFlagService initialized');
      }

      isEnabled(feature: string): boolean {
        return feature === 'premium';
      }
    }

    @register(bindTo('PremiumFeature'), lazy(), singleton())
    class PremiumFeature {
      constructor(@inject('FeatureFlagService') private flags: FeatureFlagService) {
        initLog.push('PremiumFeature initialized - expensive operation');
      }

      execute(): string {
        return 'Premium feature executed';
      }
    }

    class Application {
      constructor(
        @inject('FeatureFlagService') private flags: FeatureFlagService,
        @inject('PremiumFeature') private premium: PremiumFeature,
      ) {
        initLog.push('Application initialized');
      }

      handleRequest(feature: string): string {
        if (this.flags.isEnabled(feature)) {
          return this.premium.execute();
        }
        return 'Standard feature';
      }
    }

    it('should not initialize premium features for standard users', () => {
      const container = new Container()
        .addRegistration(R.fromClass(FeatureFlagService).bindToKey('FeatureFlagService').pipe(singleton()))
        .addRegistration(R.fromClass(PremiumFeature))
        .addRegistration(R.fromClass(Application));

      const app = container.resolve<Application>(Application);

      // Standard request - premium feature not initialized
      const result = app.handleRequest('standard');
      expect(result).toBe('Standard feature');
      expect(initLog).not.toContain('PremiumFeature initialized - expensive operation');
    });

    it('should initialize premium features only for premium users', () => {
      const container = new Container()
        .addRegistration(R.fromClass(FeatureFlagService).bindToKey('FeatureFlagService').pipe(singleton()))
        .addRegistration(R.fromClass(PremiumFeature))
        .addRegistration(R.fromClass(Application));

      const app = container.resolve<Application>(Application);

      // Premium request - NOW premium feature is initialized
      const result = app.handleRequest('premium');
      expect(result).toBe('Premium feature executed');
      expect(initLog).toContain('PremiumFeature initialized - expensive operation');
    });
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

/**
 * User Management Domain - Metadata Injection
 *
 * The MetadataInjector (default) uses TypeScript decorators and reflect-metadata
 * to automatically inject dependencies into constructor parameters.
 *
 * How it works:
 * 1. @inject('key') decorator marks a parameter for injection
 * 2. Container reads metadata at resolution time
 * 3. Dependencies are resolved and passed to constructor
 *
 * This is the most common pattern in Angular, NestJS, and similar frameworks.
 * Requires: "experimentalDecorators" and "emitDecoratorMetadata" in tsconfig.
 */

class Logger {
  name = 'Logger';
}

class App {
  // @inject tells the container which dependency to resolve for this parameter
  constructor(@inject('ILogger') private logger: Logger) {}

  // Alternative: inject via function for dynamic resolution
  // constructor(@inject((container, ...args) => container.resolve('ILogger', ...args)) private logger: ILogger) {}

  getLoggerName(): string {
    return this.logger.name;
  }
}

describe('Metadata Injector', function () {
  it('should inject dependencies using @inject decorator', function () {
    const container = new Container({ tags: ['application'] }).addRegistration(
      R.fromClass(Logger).bindToKey('ILogger'),
    );

    // Container reads @inject metadata and resolves 'ILogger' for the logger parameter
    const app = container.resolve(App);

    expect(app.getLoggerName()).toBe('Logger');
  });
});

```

### Simple
This type of injector just passes container to constructor with others arguments.

```typescript
import { Container, type IContainer, Registration as R, SimpleInjector } from 'ts-ioc-container';

/**
 * Command Pattern - Simple Injector
 *
 * The SimpleInjector passes the container itself as the first argument to the constructor.
 * This is useful for:
 * - Service Locators (like Command Dispatchers or Routers)
 * - Factory classes that need to resolve dependencies dynamically
 * - Legacy code migration where passing the container is common
 *
 * In this example, a CommandDispatcher uses the container to dynamically
 * resolve the correct handler for each command type.
 */

interface ICommand {
  type: string;
}

interface ICommandHandler {
  handle(command: ICommand): string;
}

class CreateUserCommand implements ICommand {
  readonly type = 'CreateUser';
  constructor(readonly username: string) {}
}

class CreateUserHandler implements ICommandHandler {
  handle(command: CreateUserCommand): string {
    return `User ${command.username} created`;
  }
}

describe('SimpleInjector', function () {
  it('should inject container to allow dynamic resolution (Service Locator pattern)', function () {
    // Dispatcher needs the container to find handlers dynamically based on command type
    class CommandDispatcher {
      constructor(private container: IContainer) {}

      dispatch(command: ICommand): string {
        // Dynamically resolve handler: "Handler" + "CreateUser"
        const handlerKey = `Handler${command.type}`;
        const handler = this.container.resolve<ICommandHandler>(handlerKey);
        return handler.handle(command);
      }
    }

    const container = new Container({ injector: new SimpleInjector() })
      .addRegistration(R.fromClass(CommandDispatcher).bindToKey('Dispatcher'))
      .addRegistration(R.fromClass(CreateUserHandler).bindToKey('HandlerCreateUser'));

    const dispatcher = container.resolve<CommandDispatcher>('Dispatcher');
    const result = dispatcher.dispatch(new CreateUserCommand('alice'));

    expect(result).toBe('User alice created');
  });

  it('should pass additional arguments alongside the container', function () {
    // Factory that creates widgets with a specific theme
    class WidgetFactory {
      constructor(
        private container: IContainer,
        private theme: string, // Passed as argument during resolve
      ) {}

      createWidget(name: string): string {
        return `Widget ${name} with ${this.theme} theme (Container available: ${!!this.container})`;
      }
    }

    const container = new Container({ injector: new SimpleInjector() }).addRegistration(
      R.fromClass(WidgetFactory).bindToKey('WidgetFactory'),
    );

    // Pass "dark" as the theme argument
    const factory = container.resolve<WidgetFactory>('WidgetFactory', { args: ['dark'] });

    expect(factory.createWidget('Button')).toBe('Widget Button with dark theme (Container available: true)');
  });
});

```

### Proxy
This type of injector injects dependencies as dictionary `Record<string, unknown>`.

```typescript
import { Container, ProxyInjector, Registration as R } from 'ts-ioc-container';

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
  lazy,
  Provider,
  register,
  Registration as R,
  scopeAccess,
  singleton,
} from 'ts-ioc-container';

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
  inject,
  MultiCache,
  register,
  Registration as R,
  resolveByArgs,
  singleton,
  SingleToken,
} from 'ts-ioc-container';

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

    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(UserManagementService));

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

/**
 * User Management Domain - Registration Patterns
 *
 * Registrations define how dependencies are bound to the container.
 * Common patterns:
 * - Register by class (auto-generates key from class name)
 * - Register by value (constants, configuration)
 * - Register by factory function (dynamic creation)
 * - Register with aliases (multiple keys for same service)
 *
 * This is the foundation for dependency injection - telling the container
 * "when someone asks for X, give them Y".
 */
describe('Registration module', function () {
  const createAppContainer = () => new Container({ tags: ['application'] });

  it('should register class with scope and lifecycle', function () {
    // Logger is registered at application scope as a singleton
    @register(bindTo('ILogger'), scope((s) => s.hasTag('application')), singleton())
    class Logger {}

    const appContainer = createAppContainer().addRegistration(R.fromClass(Logger));

    expect(appContainer.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register configuration value', function () {
    // Register application configuration as a value
    const appContainer = createAppContainer().addRegistration(R.fromValue('production').bindToKey('Environment'));

    expect(appContainer.resolve('Environment')).toBe('production');
  });

  it('should register factory function', function () {
    // Factory functions are useful for dynamic creation
    const appContainer = createAppContainer().addRegistration(
      R.fromFn(() => `app-${Date.now()}`).bindToKey('RequestId'),
    );

    expect(appContainer.resolve('RequestId')).toContain('app-');
  });

  it('should raise an error if binding key is not provided', () => {
    // Values and functions must have explicit keys (classes use class name by default)
    expect(() => {
      createAppContainer().addRegistration(R.fromValue('orphan-value'));
    }).toThrowError(DependencyMissingKeyError);
  });

  it('should register dependency by class name when no key decorator is used', function () {
    // Without @register(bindTo('key')), the class name becomes the key
    class FileLogger {}

    const appContainer = createAppContainer().addRegistration(R.fromClass(FileLogger));

    expect(appContainer.resolve('FileLogger')).toBeInstanceOf(FileLogger);
  });

  it('should register with multiple keys using aliases', function () {
    // Same service accessible via direct key and alias
    @register(bindTo('ILogger'), bindTo(s.alias('Logger')), singleton())
    class Logger {}

    const appContainer = createAppContainer().addRegistration(R.fromClass(Logger));

    // Accessible via alias (for group resolution)
    expect(appContainer.resolveByAlias('Logger')[0]).toBeInstanceOf(Logger);
    // Accessible via direct key
    expect(appContainer.resolve('ILogger')).toBeInstanceOf(Logger);
  });
});

```

### Scope
Sometimes you need to register provider only in scope which matches to certain condition and their sub scopes. Especially if you want to register dependency as singleton for some tags, for example `root`. This uses `ScopeMatchRule` to determine which scopes should have the provider.
- `@register(scope((container) => container.hasTag('root'))` - register provider only in root scope
- `Registration.fromClass(Logger).when((container) => container.hasTag('root'))`

```typescript
import { bindTo, Container, register, Registration as R, scope, singleton } from 'ts-ioc-container';

/**
 * Scoping - Scope Match Rule
 *
 * You can restrict WHERE a provider is registered.
 * This is useful for singleton services that should only exist in the root scope,
 * or per-request services that should only exist in request scopes.
 */

describe('ScopeProvider', function () {
  it('should register provider only in matching scope', function () {
    // SharedState should be a singleton in the root 'application' scope
    // It will be visible to all child scopes, but physically resides in 'application'
    @register(
      bindTo('SharedState'),
      scope((s) => s.hasTag('application')), // Only register in application scope
      singleton(), // One instance per application
    )
    class SharedState {
      data = 'shared';
    }

    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(SharedState));
    const requestScope = appContainer.createScope({ tags: ['request'] });

    // Both resolve to the SAME instance because it's a singleton in the app scope
    const appState = appContainer.resolve('SharedState');
    const requestState = requestScope.resolve('SharedState');

    expect(appState).toBe(requestState);
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

    const container = new Container().useModule(new ProductionModule()).useModule(new FeatureFlagModule(true));

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

/**
 * Lifecycle - OnConstruct Hook
 *
 * The @onConstruct hook allows you to run logic immediately after an object is created.
 * This is useful for:
 * - Initialization logic that depends on injected services
 * - Setting up event listeners
 * - Establishing connections (though lazy is often better)
 * - Computing initial state
 *
 * Note: You must register the AddOnConstructHookModule or manually add the hook runner.
 */

const execute: HookFn = (ctx: HookContext) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

describe('onConstruct', function () {
  it('should run initialization method after dependencies are resolved', function () {
    class DatabaseConnection {
      isConnected = false;
      connectionString = '';

      // @onConstruct marks this method to be called after instantiation
      // Arguments are resolved from the container like constructor params
      @onConstruct(execute)
      connect(@inject('ConnectionString') connectionString: string) {
        this.connectionString = connectionString;
        this.isConnected = true;
      }
    }

    const container = new Container()
      // Enable @onConstruct support
      .useModule(new AddOnConstructHookModule())
      // Register config
      .addRegistration(R.fromValue('postgres://localhost:5432').bindTo('ConnectionString'));

    // Resolve class - constructor is called, then @onConstruct method
    const db = container.resolve(DatabaseConnection);

    expect(db.isConnected).toBe(true);
    expect(db.connectionString).toBe('postgres://localhost:5432');
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
import 'reflect-metadata';
import { Container, hook, HooksRunner, injectProp, Registration } from 'ts-ioc-container';

/**
 * UI Components - Property Injection
 *
 * Property injection is useful when you don't control the class instantiation
 * (like in some UI frameworks, Web Components, or legacy systems) or when
 * you want to avoid massive constructors in base classes.
 *
 * This example demonstrates a ViewModel that gets dependencies injected
 * AFTER construction via an initialization hook.
 */

describe('inject property', () => {
  it('should inject property', () => {
    // Runner for the 'onInit' lifecycle hook
    const onInitHookRunner = new HooksRunner('onInit');

    class UserViewModel {
      // Inject 'GreetingService' into 'greeting' property during 'onInit'
      @hook('onInit', injectProp('GreetingService'))
      greetingService!: string;

      display(): string {
        return `${this.greetingService} User`;
      }
    }

    const container = new Container().addRegistration(Registration.fromValue('Hello').bindToKey('GreetingService'));

    // 1. Create instance (dependencies not yet injected)
    const viewModel = container.resolve(UserViewModel);

    // 2. Run lifecycle hooks to inject properties
    onInitHookRunner.execute(viewModel, { scope: container });

    expect(viewModel.greetingService).toBe('Hello');
    expect(viewModel.display()).toBe('Hello User');
  });
});

```

## Error

- [DependencyNotFoundError.ts](..%2F..%2Flib%2Ferrors%2FDependencyNotFoundError.ts)
- [MethodNotImplementedError.ts](..%2F..%2Flib%2Ferrors%2FMethodNotImplementedError.ts)
- [DependencyMissingKeyError.ts](..%2F..%2Flib%2Ferrors%2FDependencyMissingKeyError.ts)
- [ContainerDisposedError.ts](..%2F..%2Flib%2Ferrors%2FContainerDisposedError.ts)

