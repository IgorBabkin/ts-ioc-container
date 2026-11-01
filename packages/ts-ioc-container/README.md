# TypeScript AOP Platform & Dependency Injection Container

![NPM version:latest](https://img.shields.io/npm/v/ts-ioc-container/latest.svg?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/ts-ioc-container.svg?style=flat-square)
![npm package minimized gzipped size (select exports)](https://img.shields.io/bundlejs/size/ts-ioc-container)
[![Coverage Status](https://coveralls.io/repos/github/IgorBabkin/ts-ioc-container/badge.svg?branch=master)](https://coveralls.io/github/IgorBabkin/ts-ioc-container?branch=master)
![License](https://img.shields.io/npm/l/ts-ioc-container)

**More than a DI container: an AOP platform for building the engines your systems run on.**

`ts-ioc-container` gives you the building blocks for your own engines and frameworks —
scopes, typed tokens, hooks and transparent proxies — on top of a fast,
lightweight dependency injection core. It runs anywhere TypeScript does: in the
browser, on the server, in workers and in CLI scripts. Use it for large
enterprise applications, complex services and small automation scripts alike,
with zero runtime dependencies.

It is two things at once:

- **A meta-framework engine.** Build your own framework from the container's
  parts — a middleware pipeline, a command bus, a UI action engine, an agent
  runtime — without forking anything. → [Meta-framework engine](#meta-framework-engine)
- **A living cookbook.** Every example in this README is a test that runs in CI
  on every release, and the [Cookbook](#cookbook) collects complete, working
  architectures. The docs can't drift from the code, so anything you — or your
  AI coding agent — copy from here works with the version you installed.

## Advantages

- fast TypeScript dependency resolution
- lightweight and dependency-minimal
- clean API for classes, keys, tokens, aliases, and scopes
- no global container object; pass containers and scopes explicitly
- supports tagged application, request, transaction, page, and widget scopes
- decorator support with `@register`, `@inject`, and `@hook` — lifecycle hook keys are yours to name
- can [inject properties](#inject-property)
- can inject [lazy dependencies](#lazy)
- composable provider and registration pipelines
- custom injectors, hooks, and provider behavior
- a base for your own frameworks and engines — see [Meta-framework engine](#meta-framework-engine)
- every example is executable, so the docs never lie — see [Cookbook](#cookbook)

## Meta-framework engine

Think of the container as a small kernel for domain-specific frameworks, agent
runtimes and middleware pipelines. Everything below uses only the public API,
and each point links to a recipe that runs in CI.

- **Aspect-oriented programming.** `decorate(...)` sees every dependency as it
  leaves the container, so you can wrap it in a proxy and run cross-cutting
  concerns — logging, authorization, caching, transactions, metrics — around its
  methods without touching business code. Proxies made with `ProxyRegistry` stay
  transparent to the library (`unwrapProxy`, metadata reads, `hasInstance`).
  → [Mediator recipe](#mediator-proxy-calls-through-middleware)
- **Middleware pipelines.** A `GroupAliasToken` collects every implementation of
  an interface from the resolving scope, so "the middleware list" is just a
  registration: a scope adds or swaps one by `addRegistration`, and a middleware
  can inject request-scoped state. → [Mediator recipe](#mediator-proxy-calls-through-middleware)
- **Declarative interfaces.** Method metadata (`addMethodMeta`, `addMethodTag`)
  lets a method declare its policy (`@requiresRole('admin')`, `@cached()`), and
  `createComposeClassDecorator` names a whole decorator stack (`@repository(...)`,
  `@middleware()`) — a vocabulary your team and AI agents can apply without
  knowing the wiring. → [Composing decorators](#composing-decorators)
- **Hooks with full context.** `@hook(key, fn)` collects per-member hooks for any
  key you define; each `IHookContext` carries the instance, the scope it was
  resolved in, the method name and `resolveArgs()` / `invokeMethod()` — and the
  runner is yours, so the execution model is too. → [Declarative action pipeline](#declarative-action-pipeline),
  [Error bubbling through scopes](#error-bubbling-through-scopes)
- **Isolated scopes with disposal.** `createScope({ tags })` snapshots the
  matching registrations into a child scope — one per request, job or agent run
  — and `dispose()` tears it down; subscribe to `container.scopeDisposed` to
  release resources. → [Unit of work per request](#unit-of-work-per-request),
  [Scope disposal hooks](#scope-disposal-hooks)
- **Packaged engines.** An `IContainerModule` bundles an engine's registrations,
  so consumers turn it on with one `container.useModule(new MyEngineModule())`.
  → [Module](#module)

## Content

- [Meta-framework engine](#meta-framework-engine)
- [Setup](#setup)
- [Environment support](#environment-support)
- [AI coding agents](#ai-coding-agents)
- [Quickstart](#quickstart)
- [Cheatsheet](#cheatsheet)
- [Container](#container)
  - [Basic usage](#basic-usage)
  - [Scope](#scope) `tags`
  - [Instances](#instances)
  - [Dispose](#dispose)
  - [Lazy](#lazy) `lazy`
  - [Lazy with registerPipe](#lazy-with-registerpipe) `lazy()`
- [Injector](#injector)
  - [Metadata](#metadata) `@inject`
  - [Mapping injected values](#mapping-injected-values)
  - [Simple](#simple)
  - [Proxy](#proxy)
- [Provider](#provider) `provider`
  - [Singleton](#singleton) `singleton`
  - [Auto resolve](#auto-resolve) `autoResolve`
  - [Arguments](#arguments) `appendArgs` `appendArgsFn`
  - [Visibility](#visibility) `visible`
  - [Alias](#alias) `asAlias`
  - [Decorator](#decorator) `decorate`
  - [On resolve](#on-resolve) `onResolve`
- [Registration](#registration) `@register`
  - [Token](#token) `bindTo`
  - [Scope](#scope) `scope`
  - [Environment-based registration](#environment-based-registration) `Env`
  - [Composing decorators](#composing-decorators) `createComposeClassDecorator`
  - [Feature flags](#feature-flags) `MultiVariantFeatureToken` `ToggleFeatureToken`
- [Module](#module)
  - [Bundle a module at build time](#bundle-a-module-at-build-time) `@ts-ioc-container/bundler`
- [Hook](#hook) `@hook`
  - [Hook domains](#hook-domains) `ScopeHook` `InjectorHook` `ProviderHook`
  - [Construct hooks](#construct-hooks) `onConstructed`
  - [Scope disposal hooks](#scope-disposal-hooks) `scopeDisposed`
  - [Inject Property](#inject-property)
- [Cookbook](#cookbook)
  - [Mediator: proxy calls through middleware](#mediator-proxy-calls-through-middleware) `decorate` `GroupAliasToken`
  - [Declarative action pipeline](#declarative-action-pipeline) `@hook` `sequential`
  - [Error bubbling through scopes](#error-bubbling-through-scopes) `GroupAliasToken` `HookCollector`
  - [Retry later](#retry-later) `addMethodTag` `decorate`
  - [Unit of work per request](#unit-of-work-per-request) `singleton(cacheKey)` `byArgs`
  - [Layer and scope decorators](#layer-and-scope-decorators) `createComposeClassDecorator`
  - [Per-request scope (Express / Next.js)](#per-request-scope-express--nextjs)
  - [Frontend widget with a lazy page dependency](#frontend-widget-with-a-lazy-page-dependency)
  - [Background worker](#background-worker)
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

## Environment support

`ts-ioc-container` ships both CommonJS and ES module builds (selected
automatically via the package `exports` map) plus TypeScript declarations, so it
runs anywhere modern JavaScript does. The package is `sideEffects`-free, so
bundlers tree-shake unused exports.

| Environment | Supported | Module format | Notes |
| --- | :---: | --- | --- |
| Node.js (ESM, `import`) | ✅ | ESM | Node.js 18+; resolved via the `import` condition. |
| Node.js (CommonJS, `require`) | ✅ | CJS | Node.js 18+; resolved via the `require` condition. |
| Browser / Web (via bundlers) | ✅ | ESM | webpack, Vite, Rollup, esbuild, Parcel; tree-shakeable. |
| TypeScript | ✅ | CJS + ESM | Types shipped for both; needs `experimentalDecorators` for the metadata injector. |
| Deno | ✅ | ESM | Use the `npm:ts-ioc-container` specifier. |
| Bun | ✅ | CJS + ESM | Runs the native ESM/CJS builds directly. |

> [!NOTE]
> The default `MetadataInjector` (and the `@inject` / `@hook` decorators) rely
> on `reflect-metadata`. It is declared as an
> optional peer dependency — install it and import it once at your entrypoint.
> `SimpleInjector` and `ProxyInjector` do not need it.

## AI coding agents

The package is built to be used by AI coding agents as well as people:

- **`AGENTS.md`** ships in the package (`node_modules/ts-ioc-container/AGENTS.md`):
  setup, recipes, pitfalls, removed APIs and error codes for the installed
  version. Point your agent at it.
- **Architect skill for Claude Code.** `ts-ioc-container-architect` knows the
  cookbook: it picks the right pattern for the task (mediator, action pipeline,
  error bubbling, retry, unit of work, layer decorators) and applies the
  library's rules. This repository is its plugin marketplace — nothing to
  publish or sign up for. From a shell:

  ```shell
  claude plugin marketplace add IgorBabkin/ts-ioc-container
  claude plugin install ts-ioc-container@ts-ioc-container
  ```

  or, inside a Claude Code session (2.1.275 or later):

  ```shell
  /plugin install ts-ioc-container --marketplace IgorBabkin/ts-ioc-container
  ```

  or copy the version that ships with your installed package into your project:

  ```shell
  cp -r node_modules/ts-ioc-container/skills/ts-ioc-container-architect .claude/skills/
  ```

- **[`llms.txt`](https://github.com/IgorBabkin/ts-ioc-container/blob/main/llms.txt)**
  indexes the docs for agents that browse.

## Quickstart

```typescript
import { bindTo, Container, inject, register, Registration as R, singleton, SingleToken, by } from 'ts-ioc-container';

interface ILogger {
  log(message: string): void;
}

const ILoggerToken = new SingleToken<ILogger>('ILogger');

@register(bindTo(ILoggerToken), singleton())
class Logger implements ILogger {
  log(message: string) {
    console.log(message);
  }
}

class App {
  constructor(@inject(by(ILoggerToken)) private logger: ILogger) {}
  start() {
    this.logger.log('hello');
  }
}

describe('Quickstart', function () {
  it('should resolve App with injected Logger', function () {
    const container = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));

    const app = container.resolve(App);
    app.start();

    expect(app).toBeInstanceOf(App);
  });
});

```

## Cheatsheet

- Register class with key (preferred): `@register('Key') class Service {}` (or `@register(Token)`) then `container.addRegistration(R.fromClass(Service))`
- Register value: `R.fromValue(config).bindTo('Config')`
- Register factory: `R.fromFn(({ scope }) => createX(scope)).bindTo('X')`
- Singleton: `@register(singleton())`
- Eager service: `@register(autoResolve())` + `container.useModule(new AutoResolveModule())`
- Scoped registration: `@register(scope((s) => s.hasTag('request')))`
- Resolve by alias: `container.resolveByAlias('Alias')`
- Current scope token: `select.scope.current`
- Lazy token: `select.token('Service').lazy()`
- Inject decorator: `@inject(by(Token))` / `@inject(by('Key'))` / `@inject(by(Logger))` — the argument is always one `InjectFn`, `by(...)` builds the usual one
- Custom inject function: `@inject(({ scope, args }) => ...)`
- Map an injected value: `@inject(pipe(by('Key'), sanitize(), validate()))`
- Property inject: `@hook('onInit', injectProp(by('Key')))`
- Proxy a dependency through middleware: `@register(Token, decorate((dep, scope) => proxy(dep, scope)))` + a `GroupAliasToken` of middleware — see [Mediator](#mediator-proxy-calls-through-middleware)
- Name a decorator stack: `const repository = (token) => createComposeClassDecorator(register(token, singleton()), addClassMeta('injection-token', () => token))`

> [!TIP]
> For classes, prefer the `@register('Key')` / `@register(Token)` decorator over
> the fluent `R.fromClass(Class).bindTo('Key')` chain (`@register` accepts a key
> or token directly; `@register(bindTo(Token))` is redundant). The decorator co-locates the binding
> with the class and reads consistently with other registration pipes
> (`scope`, `singleton`, `appendArgsFn`, ...). Use the fluent `bindTo` chain only
> for `R.fromValue(...)` and `R.fromFn(...)` (which have no class to decorate)
> or for third-party classes you don't own.

## Container

`IContainer` consists of:

- Provider is dependency factory which creates dependency
- Injector describes how to inject dependencies to constructor
- Registration is provider factory which registers provider in container

### Basic usage

```typescript
import 'reflect-metadata';
import { bindTo, Container, type IContainer, inject, register, Registration as R, select, by } from 'ts-ioc-container';

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
  @register(bindTo('IUserRepository'))
  class UserRepository implements IUserRepository {
    private users: User[] = [{ id: '1', email: 'admin@example.com', passwordHash: 'hashed_password' }];

    findByEmail(email: string): User | undefined {
      return this.users.find((u) => u.email === email);
    }
  }

  it('should inject dependencies', function () {
    // AuthService depends on IUserRepository
    class AuthService {
      constructor(@inject(by('IUserRepository')) private userRepo: IUserRepository) {}

      authenticate(email: string): boolean {
        const user = this.userRepo.findByEmail(email);
        return user !== undefined;
      }
    }

    // Wire up the container
    const container = new Container().addRegistration(R.fromClass(UserRepository));

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
      constructor(@inject(by(select.scope.current)) public requestScope: IContainer) {}

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

> [!IMPORTANT]
> Scope creation is snapshot-like. Existing parent registrations are applied to the child scope when `createScope()` is called, and when a scope doesn't have a dependency it resolves from the parent container.

> [!WARNING]
> Registrations added to a parent after a child scope has already been created are not automatically applied to that existing child. Create a new scope or add the registration to the child explicitly.

> [!WARNING]
> Scope matching happens when a registration is applied to a container. Only registrations whose scope rules match that container are registered there.

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
  by,
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
      constructor(
        @inject(by(select.scope.create({ tags: ['transaction'] })))
        public transactionScope: IContainer,
      ) {}

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
import { bindTo, Container, inject, register, Registration as R, select, by } from 'ts-ioc-container';

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
      constructor(@inject(by(select.instances())) public loggers: Logger[]) {}
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
      constructor(@inject(by(select.instances().cascade(false))) public loggers: Logger[]) {}
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
      constructor(@inject(by(select.instances(isLogger))) public loggers: Logger[]) {}
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

### Dispose

Sometimes you want to dispose a container or scope. For example, when a request, page, widget, or other local lifecycle ends.

- container can be disposed
- when container is disposed then it runs its `onScopeDisposed` hooks, unregisters its providers, removes its local instances, and detaches from its parent

> [!IMPORTANT]
> Dispose is local to the container being disposed. Child scopes are not disposed automatically; dispose them explicitly when their own lifecycle ends.

```typescript
import 'reflect-metadata';
import { bindTo, Container, ContainerDisposedError, register, Registration as R, select } from 'ts-ioc-container';

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
 * 1. Executes all onScopeDisposed hooks
 * 2. Clears all instances and registrations
 * 3. Detaches from parent scope
 * 4. Prevents further resolution
 */

// Simulates a database connection that must be closed
@register(bindTo('IDatabase'))
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
    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(DatabaseConnection));

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
    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(DatabaseConnection));

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

- Lazy class instances are wrapped in a JavaScript `Proxy`; the real class instance is created on first property or method access.

> [!IMPORTANT]
> `lazy` is designed only for class instances resolved from class providers.

> [!WARNING]
> Do not use `lazy` for primitive values, plain values, functions, or non-class provider results.

```typescript
import 'reflect-metadata';
import { Container, inject, register, Registration as R, select as s, singleton, by } from 'ts-ioc-container';

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
    constructor(@inject(by('SmtpConnectionStatus')) private smtp: SmtpConnectionStatus) {
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
    constructor(
      @inject(by(s.token('EmailNotifier').lazy()))
      public emailNotifier: EmailNotifier,
    ) {}

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

The `lazy()` registerPipe can be used in two ways: with the `@register` decorator or directly on the `Provider` pipe. This allows you to defer expensive class instance initialization until first access.

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
import {
  appendArgs,
  arg,
  bindTo,
  Container,
  inject,
  lazy,
  Provider,
  register,
  Registration as R,
  singleton,
  by,
} from 'ts-ioc-container';

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
      constructor(@inject(by('DatabasePool')) private db: DatabasePool) {
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
      constructor(@inject(by('AnalyticsService')) public analytics: AnalyticsService) {
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
        @inject(by('EmailService')) public email: EmailService,
        @inject(by('SmsService')) public sms: SmsService,
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
        .addRegistration(R.fromClass(EmailService).pipe(singleton(), lazy()))
        // SmsService is eager - connects to gateway immediately
        .addRegistration(R.fromClass(SmsService).pipe(singleton()))
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
        .addRegistration(R.fromClass(EmailService).pipe(singleton(), lazy()))
        .addRegistration(R.fromClass(SmsService).pipe(singleton()))
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
        .addRegistration(R.fromClass(EmailService).pipe(singleton(), lazy()))
        .addRegistration(R.fromClass(SmsService).pipe(singleton(), lazy()))
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
      constructor(@inject(by('CacheService')) private cache: CacheService) {
        initLog.push('ApiService initialized');
      }

      fetchData(id: string): string {
        const cached = this.cache.get(id);
        return cached || `fresh:${id}`;
      }
    }

    it('should use Provider.fromClass with lazy() helper', () => {
      // Create pure provider with lazy loading
      const cacheProvider = Provider.fromClass(CacheService).lazy().singleton();

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
      const cacheProvider = Provider.fromClass(CacheService).lazy();

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
    @register(bindTo('Config'))
    class ConfigService {
      constructor(
        @inject(arg(0)) public apiUrl: string,
        @inject(arg(1)) public timeout: number,
      ) {
        initLog.push(`ConfigService initialized with ${apiUrl}`);
      }
    }

    it('should combine lazy with args and singleton', () => {
      const container = new Container().addRegistration(
        R.fromClass(ConfigService).pipe(appendArgs('https://api.example.com', 5000), lazy()).pipe(singleton()),
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
    @register(singleton())
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
      constructor() {
        initLog.push('PremiumFeature initialized - expensive operation');
      }

      execute(): string {
        return 'Premium feature executed';
      }
    }

    class Application {
      constructor(
        @inject(by('FeatureFlagService')) private flags: FeatureFlagService,
        @inject(by('PremiumFeature')) private premium: PremiumFeature,
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
        .addRegistration(R.fromClass(FeatureFlagService))
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
        .addRegistration(R.fromClass(FeatureFlagService))
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

`@inject` takes exactly one argument, an `InjectFn`: `(options: ProviderOptions) => T`.
It is called with the resolution context of the class being constructed — the
`scope` it is built in and the runtime `args` it is built with — and whatever it
returns is injected. There is no other form, only functions which build one:

- `by(target)` — resolves a token, a `DependencyKey` or a class from the scope,
  forwarding the runtime args (see
  [runtime args flow through tokens](#runtime-args-flow-through-tokens)):
  `@inject(by(LoggerToken))`, `@inject(by('Logger'))`, `@inject(by(Logger))`.
- `arg(index)` / `args` / `argsFn(predicate)` — pick from the runtime args.
- `byArgs(pick)` — resolve the token `pick` finds among the runtime args.
- `pipe(fn, ...mappers)` — map what another `InjectFn` returns.
- Your own: `@inject(({ scope }) => scope)` injects the current scope,
  `@inject(({ scope }) => Token.resolve(scope))` resolves a token *without*
  the args.

```typescript
import { bindTo, Container, inject, register, Registration as R, by } from 'ts-ioc-container';

/**
 * User Management Domain - Metadata Injection
 *
 * The MetadataInjector (default) uses TypeScript decorators and reflect-metadata
 * to automatically inject dependencies into constructor parameters.
 *
 * How it works:
 * 1. @inject(by('key')) decorator marks a parameter for injection
 * 2. Container reads metadata at resolution time
 * 3. Dependencies are resolved and passed to constructor
 *
 * This is the most common pattern in Angular, NestJS, and similar frameworks.
 * Requires: "experimentalDecorators" and "emitDecoratorMetadata" in tsconfig.
 */

@register(bindTo('ILogger'))
class Logger {
  name = 'Logger';
}

class App {
  // @inject tells the container which dependency to resolve for this parameter
  constructor(@inject(by('ILogger')) private logger: Logger) {}

  // Alternative: inject via function for dynamic resolution
  // constructor(@inject(by('ILogger')) private logger: ILogger) {}

  getLoggerName(): string {
    return this.logger.name;
  }
}

describe('Metadata Injector', function () {
  it('should inject dependencies using @inject decorator', function () {
    const container = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));

    // Container reads @inject metadata and resolves 'ILogger' for the logger parameter
    const app = container.resolve(App);

    expect(app.getLoggerName()).toBe('Logger');
  });
});

```

### Mapping injected values

An `InjectFn` is a function, so mapping the value it resolves is function
composition — `pipe(fn, ...mappers)` (exported) runs each **mapper** on the
previous result, left to right, and the value the last one returns is what
reaches the constructor parameter:

```typescript
@inject(pipe(by<Config>('Config'), takeApiUrl(), stripTrailingSlash(), requireHttps()))
```

A mapper is a plain `(value) => value` function, so mappers compose into named,
reusable steps (selecting a member, sanitizing, validating) and each step's
parameter type is inferred from the previous one. `pipe(fn, ...mappers)` is
itself an `InjectFn`, so it goes wherever one does — `@inject(...)`, a
`FunctionToken`, or `injectProp(pipe(by('Config'), takeApiUrl()))`.

```typescript
import 'reflect-metadata';
import { Container, inject, Registration as R, pipe, by } from 'ts-ioc-container';

/**
 * Mapping injected values
 *
 * `@inject` takes one `InjectFn`, so mapping what it resolves is composition:
 * `pipe(fn, ...mappers)` applies each mapper to the previous result, left to
 * right, and is itself an `InjectFn`. Mappers are plain functions, so they
 * compose into reusable, named steps.
 */

interface Config {
  apiUrl: string;
  retries: number;
}

// Reusable mappers, each returning a `(value) => value` function
const takeApiUrl = () => (config: Config) => config.apiUrl;
const stripTrailingSlash = () => (url: string) => url.replace(/\/$/, '');
const requireHttps = () => (url: string) => {
  if (!url.startsWith('https://')) {
    throw new Error(`Insecure api url: ${url}`);
  }
  return url;
};

describe('inject mappers', () => {
  it('should pipe the resolved dependency through every mapper', () => {
    class ApiClient {
      constructor(
        @inject(pipe(by<Config>('Config'), takeApiUrl(), stripTrailingSlash(), requireHttps()))
        readonly apiUrl: string,
      ) {}
    }

    const container = new Container().addRegistration(
      R.fromValue<Config>({ apiUrl: 'https://api.com/', retries: 3 }).bindToKey('Config'),
    );

    expect(container.resolve(ApiClient).apiUrl).toBe('https://api.com');
  });

  it('should throw from a mapper when the resolved value is not acceptable', () => {
    class ApiClient {
      constructor(
        @inject(pipe(by<Config>('Config'), takeApiUrl(), requireHttps()))
        readonly apiUrl: string,
      ) {}
    }

    const container = new Container().addRegistration(
      R.fromValue<Config>({ apiUrl: 'http://api.com', retries: 3 }).bindToKey('Config'),
    );

    expect(() => container.resolve(ApiClient)).toThrow('Insecure api url: http://api.com');
  });
});

```

### Simple

This type of injector just passes container to constructor with others arguments.

```typescript
import { bindTo, Container, type IContainer, register, Registration as R, SimpleInjector } from 'ts-ioc-container';

@register(bindTo('HandlerCreateUser'))
class CreateUserHandler {
  handle(username: string): string {
    return `User ${username} created`;
  }
}

describe('SimpleInjector', function () {
  it('should inject container to allow dynamic resolution', function () {
    @register(bindTo('Dispatcher'))
    class CommandDispatcher {
      constructor(private container: IContainer) {}

      dispatch(type: string, payload: string): string {
        const handler = this.container.resolve<CreateUserHandler>(`Handler${type}`);
        return handler.handle(payload);
      }
    }

    const container = new Container({ injector: new SimpleInjector() })
      .addRegistration(R.fromClass(CommandDispatcher))
      .addRegistration(R.fromClass(CreateUserHandler));

    const dispatcher = container.resolve<CommandDispatcher>('Dispatcher');

    expect(dispatcher.dispatch('CreateUser', 'alice')).toBe('User alice created');
  });

  it('should pass additional arguments alongside the container', function () {
    class WidgetFactory {
      constructor(
        private container: IContainer,
        private theme: string,
      ) {}

      createWidget(name: string): string {
        return `Widget ${name} with ${this.theme} theme (container: ${!!this.container})`;
      }
    }

    const container = new Container({ injector: new SimpleInjector() }).addRegistration(R.fromClass(WidgetFactory));

    const factory = container.resolve<WidgetFactory>('WidgetFactory', { args: ['dark'] });

    expect(factory.createWidget('Button')).toBe('Widget Button with dark theme (container: true)');
  });
});

```

### Proxy

This type of injector injects dependencies as dictionary `Record<string, unknown>`.

- **`args` reserved keyword**: accessing `deps.args` returns the raw `args[]` array passed at resolve time
- **Alias convention**: any property name containing `"alias"` (case-insensitive) is resolved via `resolveByAlias` instead of `resolve`

```typescript
import { bindTo, Container, ProxyInjector, register, Registration as R } from 'ts-ioc-container';

describe('ProxyInjector', function () {
  it('should inject dependencies as a props object', function () {
    @register(bindTo('logger'))
    class Logger {
      log(msg: string) {
        return `Logged: ${msg}`;
      }
    }

    class UserController {
      private logger: Logger;
      private prefix: string;

      constructor({ logger, prefix }: { logger: Logger; prefix: string }) {
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

    expect(container.resolve<UserController>('UserController').createUser('bob')).toBe('Logged: USER: bob');
  });

  it('should expose runtime args through the reserved "args" property', function () {
    class ReportGenerator {
      format: string;

      constructor({ args }: { args: string[] }) {
        this.format = args[0];
      }

      generate(): string {
        return `Report in ${this.format}`;
      }
    }

    const container = new Container({ injector: new ProxyInjector() }).addRegistration(R.fromClass(ReportGenerator));

    const generator = container.resolve<ReportGenerator>('ReportGenerator', { args: ['PDF'] });

    expect(generator.generate()).toBe('Report in PDF');
  });
});

```

## Provider

Provider is dependency factory which creates dependency.

- `Provider.fromClass(Logger)`
- `Provider.fromValue(logger)`
- `new Provider(({ scope, ...options }) => scope.resolve(Logger, options))`

```typescript
import { arg, bindTo, Container, inject, lazy, Provider, register, Registration as R } from 'ts-ioc-container';

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
    // Use ".singleton()" to cache the instance
    const appContainer = new Container({ tags: ['application'] }).register(
      'SharedLogger',
      Provider.fromClass(Logger).singleton(),
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
      constructor(@inject(arg(0)) readonly basePath: string) {}
    }

    const container = new Container().register(
      'FileService',
      Provider.fromClass(FileService).addArgsFn(({ args = [] }) => [...args, '/var/data']),
    );

    const service = container.resolve<FileService>('FileService');
    expect(service.basePath).toBe('/var/data');
  });

  it('supports argsFn decorator for dynamic arguments', () => {
    class Database {
      constructor(@inject(arg(0)) readonly connectionString: string) {}
    }

    const container = new Container().register('DbPath', Provider.fromValue('localhost:5432')).register(
      'Database',
      // Dynamically resolve connection string at creation time
      Provider.fromClass(Database).addArgsFn(({ scope }) => [`postgres://${scope.resolve('DbPath')}`]),
    );

    const db = container.resolve<Database>('Database');
    expect(db.connectionString).toBe('postgres://localhost:5432');
  });

  it('supports visibility control (Security Pattern)', () => {
    // AdminService only visible in admin scope
    class AdminService {}

    const appContainer = new Container({ tags: ['application'] }).register(
      'AdminService',
      Provider.fromClass(AdminService).addAccessRule(({ invocationScope }) => invocationScope.hasTag('admin')),
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

> [!IMPORTANT]
> Singleton means one instance per scope. If you create a scope `A` of container `root`, then `Logger` of `A` !== `Logger` of `root`.

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

### Auto resolve

Some services are never injected anywhere - they subscribe to a queue, start a
timer, or warm a cache as soon as their scope exists. Lazy resolution would
never create them, because nothing asks for them.

- `@register(autoResolve())` marks a provider as eager
- `container.useModule(new AutoResolveModule())` enables eager resolution for
  every scope created afterwards
- `container.autoResolve()` resolves the eager providers of one container on demand

Both accept an optional `AutoResolveOptions` (`{ args?: unknown[] }`) whose `args`
are forwarded to every eagerly resolved provider, exactly as `resolve` forwards
them - so they reach `@inject(arg(0))` parameters, `scopeAccess` rules and the
`singleton()` cache key. `new AutoResolveModule({ args })` applies the same args
to every created scope; call `scope.autoResolve({ args })` yourself when the
value differs per scope.

> [!IMPORTANT]
> `autoResolve()` on its own does nothing - the container has to opt in with
> `AutoResolveModule`. The container the module is applied to is not a created
> scope, so call `container.autoResolve()` explicitly to eagerly resolve its own
> providers.

Eager resolution goes through the provider unchanged, so `singleton()` still
returns the eagerly created instance later, and providers which are not
registered in the created scope (`scope(...)`) or deny access to it
(`scopeAccess(...)`) are skipped.

```typescript
import 'reflect-metadata';
import {
  arg,
  autoResolve,
  AutoResolveModule,
  bindTo,
  Container,
  type IContainer,
  inject,
  register,
  Registration as R,
  scope,
  singleton,
} from 'ts-ioc-container';

/**
 * User Management Domain - Eager Services
 *
 * Some services are never injected anywhere: they subscribe to a queue, start a
 * timer, or warm a cache as soon as their scope exists. Nothing resolves them,
 * so lazy resolution would never create them at all.
 *
 * `autoResolve()` marks such a provider as eager, and `AutoResolveModule`
 * resolves every eager provider of a scope right after the scope is created.
 */

const auditTrail: string[] = [];
const openedLogs: string[] = [];

// Started for every request, even though no other class injects it
@register(bindTo('IRequestAuditor'), scope((s) => s.hasTag('request')), autoResolve(), singleton())
class RequestAuditor {
  constructor() {
    auditTrail.push('request started');
  }
}

// Eager too, but parameterized - the args come from whoever triggers eager resolution
@register(bindTo('IRequestLog'), scope((s) => s.hasTag('request')), autoResolve())
class RequestLog {
  constructor(@inject(arg(0)) readonly requestId: string = 'anonymous') {
    openedLogs.push(requestId);
  }
}

// Resolved on demand, the usual way
@register(bindTo('IUserRepository'), singleton())
class UserRepository {
  findById(id: string): string {
    return `user_${id}`;
  }
}

describe('Auto resolve', function () {
  function createAppContainer(options: { args?: unknown[] } = {}): IContainer {
    return new Container({ tags: ['application'] })
      .useModule(new AutoResolveModule(options))
      .addRegistration(R.fromClass(RequestAuditor))
      .addRegistration(R.fromClass(RequestLog))
      .addRegistration(R.fromClass(UserRepository));
  }

  beforeEach(() => {
    auditTrail.length = 0;
    openedLogs.length = 0;
  });

  it('should create eager services as soon as a scope is created', function () {
    const app = createAppContainer();

    // Nothing has been created yet - the application container is not a created scope
    expect(auditTrail).toEqual([]);

    app.createScope({ tags: ['request'] });
    app.createScope({ tags: ['request'] });

    // One auditor per request scope, without anybody resolving it
    expect(auditTrail).toEqual(['request started', 'request started']);
  });

  it('should reuse the eagerly created instance', function () {
    const requestScope = createAppContainer().createScope({ tags: ['request'] });

    const auditor = requestScope.resolve<RequestAuditor>('IRequestAuditor');

    expect(auditTrail).toEqual(['request started']);
    expect(requestScope.resolve<RequestAuditor>('IRequestAuditor')).toBe(auditor);
  });

  it('should treat resolve options as optional', function () {
    createAppContainer().createScope({ tags: ['request'] });

    expect(openedLogs).toEqual(['anonymous']);
  });

  it('should forward args to every eagerly resolved provider', function () {
    // The same args reach every scope the module creates...
    createAppContainer({ args: ['req-42'] }).createScope({ tags: ['request'] });

    expect(openedLogs).toEqual(['req-42']);

    // ...or pass a per-scope value by calling autoResolve yourself
    const requestScope = createAppContainer().createScope({ tags: ['request'] });
    requestScope.autoResolve({ args: ['req-43'] });

    expect(openedLogs).toEqual(['req-42', 'anonymous', 'req-43']);
  });

  it('should leave other providers lazy', function () {
    const requestScope = createAppContainer().createScope({ tags: ['request'] });

    expect(requestScope.resolve<UserRepository>('IUserRepository').findById('1')).toBe('user_1');
  });
});

```

### Arguments

Sometimes you want to bind some arguments to provider.

- `provider(appendArgs('someArgument'))`
- `provider(appendArgsFn(({ scope }) => [scope.resolve(Logger), 'someValue']))`
- `Provider.fromClass(Logger).pipe(appendArgs('someArgument'))`

### Dependencies as arguments

Args are passed to the constructor **as-is** — the library never resolves an `InjectionToken` (or a bare constructor) it finds in the args list. Resolve it at the call site with `argsFn`:

- `ServiceToken.argsFn((scope) => [ValueToken.resolve(scope)])` — `ValueToken` is resolved from the container, its value is passed as arg
- `ServiceToken.argsFn((scope) => [scope.resolve(SomeService)])` — `SomeService` is constructed by the container
- `ServiceToken.args('literal')` — literal value passed directly
- `ServiceToken.args(ValueToken)` — the token object itself is passed as arg

`argToToken(value)` is the helper for a call site that wants "resolve tokens, pass literals through": it returns an `InjectionToken` as-is and wraps anything else in a `ConstantToken`, so `@inject(({ scope, args = [] }) => argToToken(args[0]).resolve(scope))` accepts either.

`byArgs(pick)` is the `InjectFn` for a class whose dependency is **chosen by the caller**: the caller passes the dependency's token as a runtime arg, `pick` finds it in the args list, and `byArgs` resolves it in the current scope (without args). It pairs with `findArgOrFail`, which throws `ArgumentNotFoundError` when no arg matches — and the same picker keys the `singleton()`, so there is one instance per chosen dependency:

```typescript
import {
  ArgumentNotFoundError,
  byArgs,
  Container,
  findArgOrFail,
  inject,
  type InjectionToken,
  register,
  Registration as R,
  singleton,
  SingleToken,
} from 'ts-ioc-container';

interface IRepository {
  name: string;
}

// a repository token carries its own marker, so it can be found among the runtime args
class RepositoryToken<T extends IRepository> extends SingleToken<T> {}
const isRepositoryToken = (value: unknown): value is InjectionToken<IRepository> => value instanceof RepositoryToken;
const repositoryTokenOf = findArgOrFail<InjectionToken<IRepository>>(isRepositoryToken);

const IUserRepositoryToken = new RepositoryToken<IRepository>('IUserRepository');
const IOrderRepositoryToken = new RepositoryToken<IRepository>('IOrderRepository');
const IEntityManagerToken = new SingleToken<EntityManager>('IEntityManager');

@register(IUserRepositoryToken)
class UserRepository implements IRepository {
  name = 'users';
}

@register(IOrderRepositoryToken)
class OrderRepository implements IRepository {
  name = 'orders';
}

// the caller chooses the repository; one entity manager per repository token
@register(IEntityManagerToken, singleton(repositoryTokenOf))
class EntityManager {
  constructor(@inject(byArgs(repositoryTokenOf)) readonly repository: IRepository) {}
}

describe('byArgs', function () {
  const createContainer = () =>
    new Container()
      .addRegistration(R.fromClass(UserRepository))
      .addRegistration(R.fromClass(OrderRepository))
      .addRegistration(R.fromClass(EntityManager));

  it('should resolve the token the caller passes as a runtime arg', function () {
    const container = createContainer();

    const users = IEntityManagerToken.resolve(container, { args: [IUserRepositoryToken] });
    const orders = IEntityManagerToken.resolve(container, { args: [IOrderRepositoryToken] });

    expect(users.repository.name).toBe('users');
    expect(orders.repository.name).toBe('orders');
    expect(IEntityManagerToken.resolve(container, { args: [IUserRepositoryToken] })).toBe(users);
  });

  it('should throw when no runtime arg matches', function () {
    const container = createContainer();

    expect(() => IEntityManagerToken.resolve(container, { args: ['not a token'] })).toThrow(ArgumentNotFoundError);
  });
});

```

### Positional arg injection with `arg(index)`, `args`, and `argsFn`

Constructor parameters that should pick up positional args from `ProviderOptions` must be annotated with `@inject(arg(index))`. Parameters without `@inject` resolve to `undefined`.

- `@inject(arg(0))` — resolves the first element of the `args` array passed at resolution time
- `@inject(args)` — resolves the whole runtime `args` array
- Works together with `token.args(...)` / `token.argsFn(...)` to pass typed dependencies through the args context

`argsFn(predicate)` is the general form: it iterates the runtime `args` array and returns the **first argument matching** `predicate(value, index)` — think `args.find(predicate)`. `arg(index)` is just a shortcut for matching by position: `arg(0)` is `argsFn((value, index) => index === 0)`. `args` is `({ args }) => args`, i.e. it returns the runtime args array as-is. Every `InjectFn` receives one `ProviderOptions` object — `{ scope, args, lazy }` — where `args` is the runtime args array.

`findArgOrFail(predicate)` is the strict counterpart for `singleton()` cache keys — `singleton(findArgOrFail(isUserId))` keys a per-argument singleton, for example. It receives the full runtime `args` array, returns the first argument matching `predicate(value)`, and throws `ArgumentNotFoundError` when none does, instead of silently handing out `undefined`.

### Runtime args flow through tokens

Every container-backed token (`SingleToken`, `ClassToken`, `SingleAliasToken`, `GroupAliasToken`, `FunctionToken`) forwards the `args` of its own `resolve` call to the provider, exactly like `container.resolve(key, { args })` does. `token.args(...)` and `token.argsFn(...)` **append after** the runtime args, so `token.args('x').resolve(container, { args: ['r'] })` hands the provider `['r', 'x']`.

Every `@inject` function is called with the args of the class being constructed, so an `InjectFn` which hands them on — `by(Token)` does, being `({ scope, ...options }) => Token.resolve(scope, options)` — **cascades** them into the injected dependency: they reach the dependency's provider, its `@inject(arg(index))` parameters, its `scopeAccess` rule and its `singleton()` cache key. One that does not — `({ scope }) => Token.resolve(scope)` — resolves the dependency with no args at all; which one a parameter wants is written at the parameter. The cascade is what lets a per-user `UserService` share a per-user `UserRepository` without passing the id along by hand:

```typescript
import {
  arg,
  bindTo,
  Container,
  findArgOrFail,
  inject,
  register,
  Registration as R,
  singleton,
  SingleToken,
  by,
} from 'ts-ioc-container';

interface IUserRepository {
  userId: string;
}

const IUserRepositoryKey = new SingleToken<IUserRepository>('IUserRepository');
const isUserId = (value: unknown): value is string => typeof value === 'string';

// one repository per user id - the id is the singleton cache key
@register(bindTo(IUserRepositoryKey), singleton(findArgOrFail<string>(isUserId)))
class UserRepository implements IUserRepository {
  constructor(@inject(arg(0)) public userId: string) {}
}

class UserService {
  constructor(@inject(by(IUserRepositoryKey)) public repository: IUserRepository) {}
}

describe('Token Runtime Arguments', function () {
  it('should forward runtime args to the provider behind the token', function () {
    const container = new Container().addRegistration(R.fromClass(UserRepository));

    expect(IUserRepositoryKey.resolve(container, { args: ['user-1'] }).userId).toBe('user-1');
  });

  it('should cascade the runtime args of a class into its injected dependencies', function () {
    const container = new Container().addRegistration(R.fromClass(UserRepository));

    const service = container.resolve(UserService, { args: ['user-1'] });
    const sameUser = container.resolve(UserService, { args: ['user-1'] });
    const otherUser = container.resolve(UserService, { args: ['user-2'] });

    expect(service.repository.userId).toBe('user-1');
    expect(sameUser.repository).toBe(service.repository);
    expect(otherUser.repository.userId).toBe('user-2');
  });
});

```

> [!IMPORTANT]
> Runtime args come first. A dependency that reads `@inject(arg(0))` sees the *caller's* first runtime arg whenever the caller was resolved with args, even if its token was specialized with `token.args(...)`. Pick args by shape (`argsFn(predicate)`, `findArgOrFail(predicate)`) rather than by position when a class can be resolved with runtime args and its dependencies are specialized with `token.args(...)`.

### Immutable token chaining

`token.args(...)`, `token.argsFn(...)`, and `token.lazy()` all return **new token instances** — the parent token is never mutated. This allows the same token to be specialized in multiple independent ways (one-way linked list: parent → many children).

```typescript
const ApiToken = new SingleToken<IApiClient>('IApiClient');
// Independent children — ApiToken is unchanged
const dataToken = ApiToken.args('https://data.api.com', 5000);
const userToken = ApiToken.args('https://users.api.com', 1000);
```

```typescript
import {
  arg,
  appendArgs,
  appendArgsFn,
  bindTo,
  Container,
  inject,
  register,
  Registration as R,
  SingleToken,
  singleton,
  by,
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

describe('IProvider', function () {
  function createContainer() {
    return new Container();
  }

  describe('Static Arguments', () => {
    it('can pass static arguments to constructor', function () {
      // Pre-configure the logger with a filename
      @register(appendArgs('/var/log/app.log'))
      class FileLogger {
        constructor(@inject(arg(0)) public filename: string) {}
      }

      const root = createContainer().addRegistration(R.fromClass(FileLogger));

      // Resolve by class name (default key) to use the registered provider
      const logger = root.resolve<FileLogger>('FileLogger');
      expect(logger.filename).toBe('/var/log/app.log');
    });

    it('appends configured args after resolve args', function () {
      @register(appendArgs('ConfiguredContext'))
      class Logger {
        constructor(
          @inject(arg(0)) public runtimeContext: string,
          @inject(arg(1)) public configuredContext: string,
        ) {}
      }

      const root = createContainer().addRegistration(R.fromClass(Logger));

      const logger = root.resolve<Logger>('Logger', { args: ['RuntimeContext'] });

      expect(logger.runtimeContext).toBe('RuntimeContext');
      expect(logger.configuredContext).toBe('ConfiguredContext');
    });
  });

  describe('Dynamic Arguments (Factory)', () => {
    it('can resolve arguments dynamically from container', function () {
      class Config {
        env = 'production';
      }

      // Extract 'env' from Config service dynamically
      @register(appendArgsFn(({ scope }) => [scope.resolve<Config>('Config').env]))
      class Service {
        constructor(@inject(arg(0)) public env: string) {}
      }

      const root = createContainer()
        .addRegistration(R.fromClass(Config)) // Key: 'Config'
        .addRegistration(R.fromClass(Service));

      const service = root.resolve<Service>('Service');
      expect(service.env).toBe('production');
    });
  });

  describe('Appending Arguments', () => {
    it('can append static arguments after existing resolve arguments', function () {
      @register(appendArgs('configured'))
      class Service {
        constructor(
          @inject(arg(0)) public runtime: string,
          @inject(arg(1)) public configured: string,
        ) {}
      }

      const root = createContainer().addRegistration(R.fromClass(Service));

      const service = root.resolve<Service>('Service', { args: ['runtime'] });
      expect(service.runtime).toBe('runtime');
      expect(service.configured).toBe('configured');
    });

    it('can append dynamic arguments after runtime args', function () {
      class Config {
        tenant = 'tenant-a';
      }

      @register(appendArgs('fixed'), appendArgsFn(({ scope }) => [scope.resolve<Config>('Config').tenant]))
      class Service {
        constructor(
          @inject(arg(0)) public runtime: string,
          @inject(arg(1)) public fixed: string,
          @inject(arg(2)) public tenant: string,
        ) {}
      }

      const root = createContainer().addRegistration(R.fromClass(Config)).addRegistration(R.fromClass(Service));

      const service = root.resolve<Service>('Service', { args: ['runtime'] });
      expect(service.runtime).toBe('runtime');
      expect(service.fixed).toBe('fixed');
      expect(service.tenant).toBe('tenant-a');
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

    // EntityManager is generic - it works with ANY repository.
    // The repository is the first arg; `@inject(arg(0))` reads it. Args are
    // passed through as-is, so the call site resolves the repository token
    // itself with `argsFn` before it reaches the constructor.
    const EntityManagerToken = new SingleToken<EntityManager>('EntityManager');
    const withRepository = (token: SingleToken<IRepository>) =>
      EntityManagerToken.argsFn((scope) => [token.resolve(scope)]);

    @register(
      bindTo(EntityManagerToken),
      singleton(([repository]) => (repository as IRepository).name), // Cache unique instance per repository type
    )
    class EntityManager {
      constructor(@inject(arg(0)) public repository: IRepository) {}
    }

    class App {
      constructor(
        // Inject EntityManager configured for Users
        @inject(by(withRepository(UserRepositoryToken)))
        public userManager: EntityManager,

        // Inject EntityManager configured for Todos
        @inject(by(withRepository(TodoRepositoryToken)))
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
      const userManager1 = withRepository(UserRepositoryToken).resolve(root);
      const userManager2 = withRepository(UserRepositoryToken).resolve(root);

      // Should be same instance (cached)
      expect(userManager1).toBe(userManager2);

      // Resolve todo manager
      const todoManager = withRepository(TodoRepositoryToken).resolve(root);

      // Should be different from user manager
      expect(todoManager).not.toBe(userManager1);
    });
  });
});

```

### Visibility

Sometimes you want to hide dependency if somebody wants to resolve it from certain scope. This uses `ScopeAccessRule` to control access.

> [!IMPORTANT]
> Use `scope()` to decide where a provider is registered. Use `scopeAccess()` to decide which invocation scopes can see an already registered provider.

- `provider(scopeAccess(({ invocationScope, providerScope }) => invocationScope === providerScope))` - dependency will be accessible only from the scope where it's registered
- `Provider.fromClass(Logger).pipe(scopeAccess(({ invocationScope, providerScope }) => invocationScope === providerScope))`

Rules compose as a left-fold starting from `true` — each rule receives the accumulated result of all previous rules, enabling AND/OR logic across multiple `scopeAccess` calls.

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
  by,
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
      constructor(
        @inject(by(s.alias(INotificationChannel)))
        private channels: INotificationChannel[],
      ) {}

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

Sometimes you want to decorate you class with some logic. Use the `decorate(...)` pipe — it appends a `DecorateFn` to the provider's mapper chain via `IProvider.map(...)`.

- `provider(decorate((instance, container) => new LoggerDecorator(instance)))`

```typescript
import {
  arg,
  bindTo,
  Container,
  decorate,
  type IContainer,
  inject,
  register,
  Registration as R,
  select as s,
  singleton,
  by,
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
      @inject(arg(0)) private repository: IRepository,
      @inject(by(s.token('Logger').lazy())) private logger: Logger,
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
    constructor(@inject(by('IRepository')) public repository: IRepository) {}

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

### On resolve

Sometimes you don't want to change the dependency, only to react to it. Use the `onResolve(...)` pipe — it appends a `ProviderHook` that receives the resolved dependency and the resolving scope.

- `provider(onResolve((instance, scope) => tracker.track(instance)))`

Hooks run after the whole `decorate(...)` chain, so they always observe the fully decorated dependency, and their return value is ignored — `onResolve` can never swap the dependency out. They fire per resolution, which means a `singleton()` provider runs them only on the resolve that fills the cache.

This — or a hook key collected over the same provider event — is the recommended way to react to a dependency; see [Construct hooks](#construct-hooks) for why construction is the narrower event.

```typescript
import 'reflect-metadata';
import { Container, type IContainer, onResolve, register, Registration as R, singleton } from 'ts-ioc-container';

/**
 * Observability Domain - onResolve hooks
 *
 * `onResolve(...)` attaches side effects to a provider. Every time the provider
 * hands a dependency back, each hook is called with that dependency and the
 * resolving scope.
 *
 * Unlike `decorate(...)`, a hook cannot replace the dependency - its return
 * value is ignored. Use `decorate` to change what the caller gets, and
 * `onResolve` to react to what the caller got: tracking, metrics, registering
 * the instance with an external bus.
 *
 * Hooks always run after the whole `decorate` chain, so they observe the fully
 * decorated dependency no matter where `onResolve` sits in the pipe list.
 */
describe('onResolve', () => {
  it('should observe every resolved dependency without changing it', () => {
    const resolved: Array<{ name: string; fromRequest: boolean }> = [];

    const track = (dependency: unknown, scope: IContainer) => {
      resolved.push({ name: (dependency as Connection).name, fromRequest: scope.hasTag('request') });
    };

    @register(onResolve(track))
    class Connection {
      readonly name = 'Connection';
    }

    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Connection));
    const request = app.createScope({ tags: ['request'] });

    const connection = request.resolve<Connection>('Connection');

    // The caller still receives the untouched instance
    expect(connection).toBeInstanceOf(Connection);
    // ...and the hook saw it, together with the scope it was resolved from
    expect(resolved).toEqual([{ name: 'Connection', fromRequest: true }]);
  });

  it('should run once for a singleton and on every resolve otherwise', () => {
    let poolCount = 0;
    let sessionCount = 0;

    @register(singleton(), onResolve(() => poolCount++))
    class ConnectionPool {}

    @register(onResolve(() => sessionCount++))
    class Session {}

    const app = new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(ConnectionPool))
      .addRegistration(R.fromClass(Session));

    app.resolve('ConnectionPool');
    app.resolve('ConnectionPool');
    app.resolve('Session');
    app.resolve('Session');

    // A singleton caches the dependency, so hooks fire on the resolve that filled the cache
    expect(poolCount).toBe(1);
    expect(sessionCount).toBe(2);
  });
});

```

## Registration

Registration is provider factory which registers provider in container.

- `@register(bindTo('logger'))`
- `Registration.fromClass(Logger).bindTo('logger')`
- `Registration.fromClass(Logger)`
- `Registration.fromValue(Logger)`
- `Registration.fromFn(({ scope, ...options }) => scope.resolve(Logger, options))`

### Token

Use `bindTo(key)` to register a provider under a specific key. By default the key is the class name. Multiple registrations can share the same key.

A plain `DependencyKey` (`string` / `symbol`) or an `InjectionToken` that implements `BindToken` (`SingleToken`, `SingleAliasToken`, `GroupAliasToken`) can also be passed directly to `@register(...)` — it binds under the hood exactly like `bindTo(...)`, so `@register('ILogger')` / `@register(LoggerToken)` and `@register(bindTo('ILogger'))` / `@register(bindTo(LoggerToken))` are equivalent.

> [!TIP]
> Prefer `SingleToken<T>` over plain string literals as registration keys. Tokens are type-safe, rename-friendly, and prevent typos that only surface at runtime.

```typescript
import {
  bindTo,
  Container,
  DependencyMissingKeyError,
  register,
  Registration as R,
  scope,
  select as s,
  SingleToken,
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

  it('should register directly from a token passed to @register, without wrapping it in bindTo()', function () {
    // Passing an InjectionToken straight to @register binds to it under the hood
    const LoggerToken = new SingleToken<FileLogger>('ILogger');

    @register(LoggerToken, singleton())
    class FileLogger {}

    const appContainer = createAppContainer().addRegistration(R.fromClass(FileLogger));

    expect(LoggerToken.resolve(appContainer)).toBeInstanceOf(FileLogger);
  });

  it('should register directly from a plain key passed to @register, without wrapping it in bindTo()', function () {
    // A plain DependencyKey straight in @register binds to it under the hood
    @register('PlainLogger')
    class Logger {}

    const appContainer = createAppContainer().addRegistration(R.fromClass(Logger));

    expect(appContainer.resolve('PlainLogger')).toBeInstanceOf(Logger);
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
  by,
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
      constructor(
        @inject(by(select.scope.create({ tags: ['transaction'] })))
        public transactionScope: IContainer,
      ) {}

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

### Environment-based registration

Picking an implementation by deployment environment (`prod` / `dev` / `test`)
needs no dedicated API - it is the same `scope()` mechanism as above: tag the
container with its env and scope each implementation to the env it belongs to.
Multiple registrations share the same key; only the one whose scope rule
matches the container's tag registers there.

```typescript
import { bindTo, Container, register, Registration as R, scope, SingleToken } from 'ts-ioc-container';

/**
 * Environment-based Registration
 *
 * An app often needs a different implementation per deployment environment -
 * a real payment gateway in production, a stub in tests, a verbose one in dev.
 * This is a plain application of `scope()`: tag the container with its env and
 * scope each implementation to the env tag it belongs to. No dedicated API is
 * needed - the same `ScopeMatchRule` mechanism used for `request` / `transaction`
 * scopes applies here too.
 */
type Env = 'prod' | 'dev' | 'test';

interface IPaymentGateway {
  charge(amount: number): string;
}

const PaymentGatewayToken = new SingleToken<IPaymentGateway>('IPaymentGateway');

@register(bindTo(PaymentGatewayToken), scope((c) => c.hasTag('prod')))
class StripeGateway implements IPaymentGateway {
  charge(amount: number): string {
    return `charged $${amount} via Stripe`;
  }
}

@register(bindTo(PaymentGatewayToken), scope((c) => c.hasTag('dev')))
class LoggingGateway implements IPaymentGateway {
  charge(amount: number): string {
    return `[dev] would charge $${amount}`;
  }
}

@register(bindTo(PaymentGatewayToken), scope((c) => c.hasTag('test')))
class FakeGateway implements IPaymentGateway {
  charge(amount: number): string {
    return `faked charge of $${amount}`;
  }
}

const createContainerForEnv = (env: Env) =>
  new Container({ tags: [env] })
    .addRegistration(R.fromClass(StripeGateway))
    .addRegistration(R.fromClass(LoggingGateway))
    .addRegistration(R.fromClass(FakeGateway));

describe('Environment-based registration', function () {
  it('should resolve the implementation whose scope tag matches the container env', function () {
    expect(PaymentGatewayToken.resolve(createContainerForEnv('prod'))).toBeInstanceOf(StripeGateway);
    expect(PaymentGatewayToken.resolve(createContainerForEnv('dev'))).toBeInstanceOf(LoggingGateway);
    expect(PaymentGatewayToken.resolve(createContainerForEnv('test'))).toBeInstanceOf(FakeGateway);
  });

  it('should behave like the environment it was resolved for', function () {
    const gateway = PaymentGatewayToken.resolve(createContainerForEnv('test'));

    expect(gateway.charge(10)).toBe('faked charge of $10');
  });
});

```

### Composing decorators

A decorator stack repeated on every class of a layer is worth a name.
`createComposeClassDecorator(...decorators)` gives it one: it returns a single
`ClassDecorator` which applies the stack **bottom-up, exactly as stacking would**,
so `@createComposeClassDecorator(a, b)` behaves like `@a @b`. A decorator which
returns a replacement class hands it to the next one, the way the runtime threads
a stack.

`createComposeMethodDecorator` and `createComposeParameterDecorator` do the same
for methods and constructor parameters. The method form threads the property
descriptor, so wrapping decorators (`@once`, `@throttle`, ...) compose too.

```typescript
import {
  addClassMeta,
  Container,
  createComposeClassDecorator,
  createComposeParameterDecorator,
  getClassMeta,
  inject,
  by,
  addParamLabel,
  getParamLabels,
  register,
  Registration as R,
  scope,
  singleton,
  SingleToken,
} from 'ts-ioc-container';

/**
 * A decorator stack repeated on every class of a layer is worth a name.
 * `createComposeClassDecorator` (and its `createComposeMethodDecorator` /
 * `createComposeParameterDecorator` siblings) turns one into a single decorator,
 * applied bottom-up exactly as stacking would.
 */
describe('composing decorators', () => {
  const INJECTION_TOKEN = 'injection-token';

  // Every repository binds to its own token, is an application-scoped singleton,
  // and remembers the token it was registered under.
  const repository = <T>(token: SingleToken<T>) =>
    createComposeClassDecorator(
      register(
        token,
        scope((s) => s.hasTag('application')),
        singleton(),
      ),
      addClassMeta(INJECTION_TOKEN, () => token),
    );

  it('should apply the whole stack the composed decorator stands for', () => {
    const UserRepositoryToken = new SingleToken<UserRepository>('IUserRepository');

    @repository(UserRepositoryToken)
    class UserRepository {
      findById(id: string) {
        return { id };
      }
    }

    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(UserRepository));

    expect(UserRepositoryToken.resolve(app)).toBeInstanceOf(UserRepository);
    // singleton() applied, so the same instance comes back
    expect(UserRepositoryToken.resolve(app)).toBe(UserRepositoryToken.resolve(app));
    // and the class still carries the metadata written beside the registration
    expect(getClassMeta(UserRepository, INJECTION_TOKEN)).toBe(UserRepositoryToken);
  });

  it('should compose parameter decorators the same way', () => {
    const ConfigToken = new SingleToken<{ apiUrl: string }>('IConfig');

    // @inject plus a label describing where the value came from
    const fromConfig = createComposeParameterDecorator(inject(by(ConfigToken)), addParamLabel('source', 'config'));

    class ApiClient {
      constructor(@fromConfig public config: { apiUrl: string }) {}
    }

    const app = new Container({ tags: ['application'] }).addRegistration(
      R.fromValue({ apiUrl: 'https://api.example.com' }).bindTo(ConfigToken),
    );

    expect(app.resolve(ApiClient).config.apiUrl).toBe('https://api.example.com');
    expect(getParamLabels(ApiClient, 0).get('source')).toBe('config');
  });
});

```

### Feature flags

Feature tokens let a feature flag choose which implementation is injected, so
consumers depend on one type and never see the flag. The implementations
decide where they belong - each one's own token declares its role:

- `token.variantOf(Feature, 'blue')` - used while the flag serves the variant `blue` (`getVariant`)
- `token.primaryVariantOf(Feature)` - used while the flag is on and no named variant implementation matches
- `token.fallbackOf(Feature)` - used otherwise: the flag is off, serves nothing implemented, or its client throws

**Every flag has a fallback**: resolving a feature without one registered is a
`DependencyNotFoundError`, whatever the flag serves. `MultiVariantFeatureToken<T, V>`
is the general case; `ToggleFeatureToken<T>` is its on/off case - no named
variants, only a primary one (`isEnabled`). Each implementation stays
injectable through its own token.

The flag client comes from `IFeatureFlagsToken` and the context it evaluates
for from `IFeatureContextToken`, both resolved from the resolving scope on every
resolution - register the context in your `request` scope. A missing client or
context is a `DependencyNotFoundError`, never a silent fallback.

`IFeatureFlags` is shaped after Unleash (`isEnabled(name, context)`,
`getVariant(name, context)`), so an Unleash client is registered as is:
`R.fromValue(unleash).bindTo(IFeatureFlagsToken)`. Resolution is synchronous;
wrap an asynchronous client (e.g. the OpenFeature server SDK) in an adapter
that evaluates ahead of time. `Feature.lazy()` defers the evaluation to first use.

```typescript
import 'reflect-metadata';
import {
  by,
  Container,
  type FeatureContext,
  type FeatureVariant,
  type IFeatureFlags,
  IFeatureContextToken,
  IFeatureFlagsToken,
  inject,
  MultiVariantFeatureToken,
  register,
  Registration as R,
  SingleToken,
  ToggleFeatureToken,
} from 'ts-ioc-container';

/**
 * Checkout Domain - Feature Flags
 *
 * A flag chooses which implementation is injected; the consumer depends on one
 * type and never sees the flag. The implementations decide where they belong:
 * each one's own token declares it
 *
 * - `.variantOf(feature, name)` - used while the flag serves the variant `name`;
 * - `.primaryVariantOf(feature)` - used while the flag is on and no named
 *   variant implementation matches (the "on" side of a toggle);
 * - `.fallbackOf(feature)` - used otherwise. Every flag has one.
 *
 * `ToggleFeatureToken` is the on/off case of `MultiVariantFeatureToken`: no
 * named variants, only a primary one.
 *
 * The flag client is any object with `isEnabled(name, context)` and
 * `getVariant(name, context)` - an Unleash client works as is:
 *   container.addRegistration(R.fromValue(unleash).bindTo(IFeatureFlagsToken));
 */

// Toggle: new checkout on / off
interface IPaymentGateway {
  pay(amount: number): string;
}

const PaymentGatewayToken = new ToggleFeatureToken<IPaymentGateway>('new-checkout');

// Each implementation's own token declares where it belongs
@register(new SingleToken<IPaymentGateway>('LegacyGateway').fallbackOf(PaymentGatewayToken))
class LegacyGateway implements IPaymentGateway {
  pay(amount: number) {
    return `legacy charged ${amount}`;
  }
}

@register(new SingleToken<IPaymentGateway>('StripeGateway').primaryVariantOf(PaymentGatewayToken))
class StripeGateway implements IPaymentGateway {
  pay(amount: number) {
    return `stripe charged ${amount}`;
  }
}

// Multi-variant: A/B/n experiment on the checkout button
interface ICheckoutButton {
  render(): string;
}

const CheckoutButtonToken = new MultiVariantFeatureToken<ICheckoutButton, 'blue' | 'green'>('checkout-button');

@register(new SingleToken<ICheckoutButton>('GreyButton').fallbackOf(CheckoutButtonToken))
class GreyButton implements ICheckoutButton {
  render() {
    return 'grey button';
  }
}

@register(new SingleToken<ICheckoutButton>('BlueButton').variantOf(CheckoutButtonToken, 'blue'))
class BlueButton implements ICheckoutButton {
  render() {
    return 'blue button';
  }
}

@register(new SingleToken<ICheckoutButton>('GreenButton').variantOf(CheckoutButtonToken, 'green'))
class GreenButton implements ICheckoutButton {
  render() {
    return 'green button';
  }
}

class CheckoutPage {
  constructor(
    @inject(by(PaymentGatewayToken)) private readonly gateway: IPaymentGateway,
    @inject(by(CheckoutButtonToken)) private readonly button: ICheckoutButton,
  ) {}

  render(amount: number) {
    return `${this.button.render()}, ${this.gateway.pay(amount)}`;
  }
}

// Stands in for an Unleash client
class InMemoryFlags implements IFeatureFlags {
  isEnabled(name: string, context?: FeatureContext) {
    return name === 'new-checkout' && context?.userId === 'beta-tester';
  }

  getVariant(name: string, context?: FeatureContext): FeatureVariant {
    const bucket = { 'beta-tester': 'green', 'user-1': 'blue' }[context?.userId ?? ''];
    return name === 'checkout-button' && bucket
      ? { name: bucket, enabled: true }
      : { name: 'disabled', enabled: false };
  }
}

describe('Feature flags', () => {
  const app = new Container({ tags: ['application'] })
    .addRegistration(R.fromValue(new InMemoryFlags()).bindTo(IFeatureFlagsToken))
    .addRegistration(R.fromClass(LegacyGateway))
    .addRegistration(R.fromClass(GreyButton))
    .addRegistration(R.fromClass(StripeGateway))
    .addRegistration(R.fromClass(BlueButton))
    .addRegistration(R.fromClass(GreenButton));

  // The context is per request: each request evaluates the flags for its own user
  const handleRequest = (userId: string) => {
    const request = app.createScope({ tags: ['request'] });
    request.addRegistration(R.fromValue({ userId }).bindTo(IFeatureContextToken));
    return request.resolve(CheckoutPage).render(42);
  };

  it('serves each user the implementations their flags select', () => {
    expect(handleRequest('beta-tester')).toBe('green button, stripe charged 42');
    expect(handleRequest('user-1')).toBe('blue button, legacy charged 42');
  });

  it('serves the fallbacks to everyone else', () => {
    expect(handleRequest('regular-user')).toBe('grey button, legacy charged 42');
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

### Bundle a module at build time

Writing that module by hand for every class gets old fast. [`@ts-ioc-container/bundler`](https://www.npmjs.com/package/@ts-ioc-container/bundler)
generates it instead: its `tic` CLI scans the folders a config names, at build time, and prints one
plain `IContainerModule` that registers every exported class decorated with `@register`. Nothing is
scanned at runtime, and the output uses only the public API, so it type-checks and tree-shakes like
code you wrote yourself.

#### Basic usage

```shell script
npm install --save-dev @ts-ioc-container/bundler
```

Decorate the classes as usual — each keeps its own `@register(...)` config (key, scope, singleton, …):

```typescript
// src/services/Greeter.ts
@register(IGreeterToken, singleton())
export class Greeter implements IGreeter {}
```

Describe the bundle in a config file, then build it. `tic build` is a Unix filter: it prints the bundle
to stdout and writes nothing, so the shell decides where it is saved:

```yaml
# app.bundle.yml
paths:
  include:
    - '@app/services'
    - ./src/infra
```

```shell script
tic build app.bundle.yml > src/di/app.bundle.ts
```

```typescript
// src/di/app.bundle.ts
// Generated by `tic build`. Do not edit by hand.
// Paths: @app/services, ./src/infra
import { type IContainer, type IContainerModule, Registration } from 'ts-ioc-container';
import { MemoryLogger } from '@app/infra/logging/MemoryLogger';
import { Greeter } from '@app/services/Greeter';

export class AppBundle implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(Registration.fromClass(MemoryLogger));
    container.addRegistration(Registration.fromClass(Greeter));
  }
}
```

```typescript
import { AppBundle } from './di/app.bundle';

const container = new Container().useModule(new AppBundle());
```

The class is named after the config file — `app.bundle.yml` exports `AppBundle`. Rebuild after adding a
class, and let CI check that the saved bundle is current:

```json
{
  "scripts": {
    "bundle": "tic build app.bundle.yml > src/di/app.bundle.ts",
    "bundle:check": "tic build app.bundle.yml | diff - src/di/app.bundle.ts"
  }
}
```

Never edit a `*.bundle.ts` by hand, and keep it out of your formatter (add it to `.prettierignore`), so the
check compares like with like.

#### Basic config

A config (`<name>.bundle.json`, `.yaml` or `.yml`) describes one bundle. Only `paths.include` is required —
`paths` is always an object, never a bare folder or list — and an unknown field is an error:

```yaml
# optional: editor completion and validation (in JSON, set "$schema" to the same path)
# yaml-language-server: $schema=./node_modules/@ts-ioc-container/bundler/tic.schema.json
paths:
  include: # folders to scan, sub-folders included
    - '@app/services'
    - ./src/infra
  exclude: # replaces the default, so restate the test globs you still want
    - '**/*.dev.ts'
    - '**/*.spec.ts'
    - '**/*.test.ts'
    - '**/__tests__/**'
    - '**/node_modules/**'
match: '*Service' # optional: only classes whose name matches
```

| Field             | Default                                    | Meaning                                                                                     |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `paths.include`   | — (required)                               | Folder, or list of folders, to scan                                                         |
| `paths.exclude`   | test files, `__tests__/`, `node_modules/`  | Globs of files never read                                                                   |
| `match`           | exported classes with `@register`          | Class-name globs, or `{ export, decorators, glob, exclude }`                                |
| `name`            | the file's stem (`app.bundle.yml` → `app`) | The bundle's name; the class is `AppBundle`                                                 |
| `tsconfig`        | `./tsconfig.json`                          | Where the `paths` aliases come from (see below)                                             |
| `importExtension` | `.js` under node16/nodenext, else none     | Extension of the generated imports                                                          |

Relative paths resolve against the config file. Need one bundle per environment? Keep what they share in
`common.bundle.yml` and what each adds in `prod.bundle.yml`, `dev.bundle.yml`, …, and merge them like
webpack-merge — objects field by field, lists (`paths.include`, `paths.exclude`, `match.glob`, …)
concatenated, any other value replaced by the later config:

```bash
tic build common.bundle.yml prod.bundle.yml > src/di/prod.bundle.ts # exports ProdBundle
```

#### tsconfig aliases

Every import in a bundle is written through a tsconfig `paths` alias — never a path relative to where the
file is saved — so the bundle works wherever you put it. Declare an alias covering each scanned folder:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": { "@app/*": ["./src/*"] }
  }
}
```

- A folder in `paths.include` is either relative to the config (`./src/infra`) or an alias
  (`@app/services`); either way, the imports come out as `@app/...`.
- A selected class that no alias covers fails the build, naming its file — add a `paths` entry for its folder.
- The tsconfig only supplies aliases and the import extension; it never adds files to the scan. Name another
  one with `tsconfig: ./tsconfig.app.json`.
- An exclude glob may start with an alias too: `@generated/**`, or `@generated` for the whole folder.
- Your app's toolchain must resolve the same aliases at run time (Vite, webpack, Jest, `tsconfig-paths`, …), as
  it already does for any aliased import — `tsc` alone type-checks them but does not rewrite them.

See the [bundler README](https://github.com/IgorBabkin/ts-ioc-container/tree/main/packages/bundler#readme)
for the full config reference, stdin configs and the programmatic `build()` API.

## Hook

Sometimes you need to invoke methods after construct or dispose of class. This is what hooks are for.

`@hook(key, hook)` is the only hook decorator the library ships, and the key is
yours: there is no `@onConstruct` or `@onScopeDisposed` in the package, because
each is one line of your own code
([ADR 0017](../../adr/0017-no-predefined-hook-keys.md)).

```typescript
// yours, named in your vocabulary
const onScopeDisposed = (fn: HookType) => hook('onScopeDisposed', fn);
```

A decorated member takes **one** hook. Several hooks are combined at the
declaration site, by the combinator that says how they relate:

```typescript
class OrderService {
  @hook('actions', sequential(authorize, validate, persist))
  submit() {}

  @onScopeDisposed(parallel(flushMetrics, closeSocket))
  destroy() {}
}
```

- `sequential(...hooks)` runs them in declaration order, awaiting each one that
  goes async before the next.
- `parallel(...hooks)` starts them all at once and settles when every one has.
- `oncePerInstance(hook)` runs its hook a single time per instance, however
  often the event fires.

They compose, because each returns an ordinary `HookFn`:
`oncePerInstance(sequential(connect, warmUp))`, or a `parallel(...)` nested
inside a `sequential(...)`. A hook class (`HookType`) may be passed anywhere a
hook function can. Writing your own combinator needs nothing from the library
beyond `toHookFn`.

A member carries exactly one hook per key, so decorating the same member twice
under one key replaces the earlier hook rather than adding to it — decorators
are applied bottom-up, so the topmost one is the one that stays.

Every hook may be sync or async — the one decorator takes both, so there is no
separate async form to reach for. *Running* them is not the library's job at
all, and neither is deciding when to collect them
([ADR 0016](../../adr/0016-collect-hooks-let-the-caller-run-them.md),
[ADR 0018](../../adr/0018-no-hook-modules.md)). The library answers one
question — which hooks does this object declare, and against what context do
they run — and the container's events are where you ask it.

A **`HookCollector`** is keyed to one of your hook keys and answers a single
question: `getActions(target, { scope })` returns one **`HookAction`** per
decorated member — the hook resolved to a function, bound to the
`IHookContext` it runs against (which carries the member's own `methodName`). It performs nothing, and how the
hooks *within* one member relate was already settled by the combinator at the
declaration site ([ADR 0015](../../adr/0015-one-hook-per-member.md)). It reads a
class's metadata once and reuses it, so collecting on a hot event is cheap.

A **runner** performs them. Order, awaiting and failure handling are decided
there and nowhere else; `toTask` turns an action into the `Task` that
`runInOrder` and `runAtOnce` take. The library exports no type for it — it
never calls a runner, nor is it handed one — so name the shape yourself:

```typescript
// yours, like the hook keys
type HookRunner = (actions: HookAction[], context: ExecutionContext) => void;

// members one after another, never awaited: sync hooks finish before this returns
const immediate: HookRunner = (actions) => {
  for (const { hook, context } of actions) {
    hook(context);
  }
};

// members one after another, awaiting any that goes async; both kinds of failure reported
const inOrder =
  (onError: (scope: IContainer) => (error: unknown) => void): HookRunner =>
  (actions, { scope }) => {
    try {
      runInOrder(actions.map(toTask))?.catch(onError(scope));
    } catch (ex) {
      onError(scope)(ex);
    }
  };

// every member started at once
const atOnce: HookRunner = (actions) => {
  runAtOnce(actions.map(toTask));
};

```

Then wire collecting to the event you want it on. There is no
`OnConstructModule` in the package: an `IContainerModule` is one method, and
these are the whole of what the modules this library used to ship contained.

```typescript
const onConstructHooks = new HookCollector({ key: 'onConstruct' });
const onScopeDisposedHooks = new HookCollector({ key: 'onScopeDisposed' });

// construction is the injector's event, and one injector backs the whole scope tree
const constructModule = (run: HookRunner): IContainerModule => ({
  applyTo: (container) =>
    container.getInjector().onConstructed((instance, scope) => {
      run(onConstructHooks.getActions(instance, { scope }), { scope });
    }),
});

// disposal is a scope event; collecting every instance into one list lets the
// runner order the instances as well as the members
const disposeModule = (run: HookRunner): IContainerModule => ({
  applyTo: (container) =>
    container.scopeDisposed.subscribe((scope) => {
      run(
        scope.getInstances().flatMap((instance) => onScopeDisposedHooks.getActions(instance, { scope })),
        { scope },
      );
    }),
});

const container = new Container().useModule(constructModule(inOrder(report))).useModule(disposeModule(atOnce));
```

For resolve hooks, reach the providers through `registered.subscribe(...)` and
`provider.onResolved(...)`, or pipe a single registration with
[`onResolve`](#on-resolve). Narrowing is the collector's:
`new HookCollector({ key: 'onConstruct', predicate })`.

Resolution and disposal stay synchronous unless the runner makes them
otherwise: `runInOrder` and `runAtOnce` stay synchronous until a hook returns a
promise, so sync hooks finish before `resolve` (or `dispose`) returns and async
ones are started there and settle afterwards. Instances that must expose
readiness should publish it themselves, for example by storing the pending
promise on the instance.

Failures belong to the runner too — nothing in the library catches what a hook
throws or rejects with. A runner which neither guards nor awaits lets a sync
throw propagate out of `resolve` / `dispose` and drops an async rejection.

A custom key is collected and run the same way, with no module in between:

```typescript
const workflow = new HookCollector({ key: 'workflow' });

container.getInjector().onConstructed((instance, scope) => {
  runInOrder(workflow.getActions(instance, { scope }).map(toTask));
});
```

`predicate`, `createExecutionContext` and `mapExecutionContext` can be set on
the collector or overridden per `getActions` call.

### Hook domains

The decorators above declare hook *metadata* on a class. The imperative side —
the callbacks the container machinery runs — is registered on whichever
abstraction raises the event, one hook type per domain:

| Domain       | Registered on | Type            | Where                                                    |
| ------------ | ------------- | --------------- | -------------------------------------------------------- |
| **Scope**    | `IContainer`  | `ScopeHook`     | `scopeCreated.subscribe(...)`, `scopeDisposed.subscribe(...)` |
| **Scope**    | `IContainer`  | `RegisteredHook`| `registered.subscribe(...)`                              |
| **Injector** | `IInjector`   | `InjectorHook`  | `onConstructed(...)`                                     |
| **Provider** | `IProvider`   | `ProviderHook`  | `onResolved(...)`, or the [`onResolve`](#on-resolve) pipe |

A container passes its injector to every scope it creates, so **one injector**
backs the whole scope tree, and `container.getInjector()` hands it out: an
`onConstructed` hook registered through it covers every scope, whenever it was
added. Scope hooks, by contrast, are copied into a child at `createScope` time,
so a child inherits what its parent held then and later additions to either
stay local.

```typescript
const container = new Container({ tags: ['application'] });

// Scope events are typed events on the container itself
const stop = container.scopeCreated.subscribe((scope) => audit.scopeOpened(scope));
container.scopeDisposed.subscribe((scope) => audit.scopeClosed(scope));
container.registered.subscribe((provider, key) => audit.registered(key));

stop(); // detached; `container.scopeCreated.unsubscribe(fn)` does the same by reference

// Construction is the injector's event, not a scope's
container.getInjector().onConstructed((instance, scope) => metrics.built(instance, scope));
```

The scope events are `scopeCreated`, `scopeDisposed` (`ITypedEvent<[IContainer]>`)
and `registered` (`ITypedEvent<[IProvider, DependencyKey, IContainer]>`);
`subscribe` returns the unsubscribe function. The exposed events carry no
`emit` — only the container raises its own events.

`TypedEvent` itself is exported for your own events: `subscribe` / `unsubscribe`
/ `emit` / `dispose`, with `ITypedEvent` as the subscriber-only view to hand out.

These four events are the whole surface hooks are wired to; the library ships no
module over them ([ADR 0018](../../adr/0018-no-hook-modules.md)).

### Construct hooks

> **Prefer collecting on resolve — through `registered` / `onResolved`, or the
> [`onResolve`](#on-resolve) pipe — over collecting on construction.**
> Construction is the *injector's* event, so it fires only for dependencies the
> injector builds: a `fromValue` constant or a factory registration never
> triggers it. It also observes the instance before
> the provider's `decorate(...)` chain wraps it, so a hook sees the bare
> instance rather than what the caller receives. A resolve hook runs on every
> dependency leaving a provider, after the whole decorate chain — the same
> ordering, awaiting and error handling, on what the caller actually gets.
> Reach for construct hooks only when you mean "this class was just
> constructed" specifically.

```typescript
import 'reflect-metadata';
import {
  Container,
  type HookFn,
  type IContainer,
  hook,
  HookCollector,
  type HookType,
  type IContainerModule,
  inject,
  Registration as R,
  runInOrder,
  toTask,
  type ExecutionContext,
  type HookAction,
  by,
} from 'ts-ioc-container';

const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

const executeAsync: HookFn = async (ctx) => {
  await ctx.invokeMethod({ args: ctx.resolveArgs() });
};

// The library ships no construct decorator: the key, the decorator which writes
// it and the collector which reads it are all ours.
const onConstruct = (fn: HookType) => hook('onConstruct', fn);
const onConstructHooks = new HookCollector({ key: 'onConstruct' });

// Running the collected hooks is ours too, and so is naming the shape that does
// it: the library neither calls a runner nor is handed one.
type HookRunner = (actions: HookAction[], context: ExecutionContext) => void;

// This runner keeps the
// actions in declaration order, stays synchronous until one returns a promise,
// and reports a throw and a rejection alike.
const run =
  (onError: (scope: IContainer) => (ex: unknown) => void = () => () => {}): HookRunner =>
  (actions, { scope }) => {
    try {
      runInOrder(actions.map(toTask))?.catch(onError(scope));
    } catch (ex) {
      onError(scope)(ex);
    }
  };

// Construction is the injector's event, and hanging the collection off it is
// ours: the library ships no module for that, and a module is just an `applyTo`.
const onConstructModule = (run: HookRunner): IContainerModule => ({
  applyTo: (container) =>
    container.getInjector().onConstructed((instance, scope) => {
      run(onConstructHooks.getActions(instance, { scope }), { scope });
    }),
});

describe('onConstruct', function () {
  it('should run initialization method after dependencies are resolved', function () {
    class DatabaseConnection {
      isConnected = false;
      connectionString = '';

      @onConstruct(execute)
      connect(@inject(by('ConnectionString')) connectionString: string) {
        this.connectionString = connectionString;
        this.isConnected = true;
      }
    }

    const container = new Container()
      .useModule(onConstructModule(run()))
      .addRegistration(R.fromValue('postgres://localhost:5432').bindTo('ConnectionString'));

    const db = container.resolve(DatabaseConnection);

    expect(db.isConnected).toBe(true);
    expect(db.connectionString).toBe('postgres://localhost:5432');
  });

  it('should forward hook exceptions to the runner’s error handler with the scope', function () {
    const failure = new Error('boom');

    class BrokenService {
      @onConstruct(() => {
        throw failure;
      })
      init() {}
    }

    let captured: { ex: unknown; scope: IContainer } | undefined;
    const container = new Container().useModule(
      onConstructModule(
        run((scope) => (ex) => {
          captured = { ex, scope };
        }),
      ),
    );

    expect(() => container.resolve(BrokenService)).not.toThrow();
    expect(captured?.ex).toBe(failure);
    expect(captured?.scope).toBe(container);
  });

  it('should expose the resolving scope to the runner’s error handler', function () {
    class BrokenService {
      @onConstruct(() => {
        throw new Error('boom');
      })
      init() {}
    }

    let scope: IContainer | undefined;
    const container = new Container().useModule(
      onConstructModule(
        run((s) => () => {
          scope = s;
        }),
      ),
    );
    const child = container.createScope();

    child.resolve(BrokenService);

    expect(scope).toBe(child);
  });

  it('should run an async initialization method after the instance is created', async function () {
    class DatabaseConnection {
      isConnected = false;
      connectionString = '';
      readonly ready: Promise<void>;

      private markReady!: () => void;

      constructor() {
        this.ready = new Promise((resolve) => {
          this.markReady = resolve;
        });
      }

      @onConstruct(executeAsync)
      async connect(@inject(by('ConnectionString')) connectionString: string) {
        await Promise.resolve();
        this.connectionString = connectionString;
        this.isConnected = true;
        this.markReady();
      }
    }

    // The runner awaits the hooks; resolution itself still does not wait for them.
    const container = new Container()
      .useModule(onConstructModule(run()))
      .addRegistration(R.fromValue('postgres://localhost:5432').bindTo('ConnectionString'));

    const db = container.resolve(DatabaseConnection);

    // resolution does not wait for async hooks
    expect(db.isConnected).toBe(false);

    await db.ready;

    expect(db.isConnected).toBe(true);
    expect(db.connectionString).toBe('postgres://localhost:5432');
  });

  it('should forward rejected hooks to the runner’s error handler with the scope', async function () {
    const failure = new Error('boom');

    class BrokenService {
      @onConstruct(() => Promise.reject(failure))
      init() {}
    }

    let captured: { ex: unknown; scope: IContainer } | undefined;
    const container = new Container().useModule(
      onConstructModule(
        run((scope) => (ex) => {
          captured = { ex, scope };
        }),
      ),
    );

    const child = container.createScope();
    child.resolve(BrokenService);

    await vi.waitFor(() => expect(captured).toBeDefined());

    expect(captured?.ex).toBe(failure);
    expect(captured?.scope).toBe(child);
  });
});

```

### Scope disposal hooks

```typescript
import 'reflect-metadata';
import {
  bindTo,
  Container,
  type HookFn,
  hook,
  HookCollector,
  type HookType,
  inject,
  register,
  Registration as R,
  singleton,
  type ExecutionContext,
  type HookAction,
  type IContainerModule,
  by,
} from 'ts-ioc-container';

const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

// The library ships no dispose decorator: the key, the decorator which writes it
// and the collector which reads it are all ours.
const onScopeDisposed = (fn: HookType) => hook('onScopeDisposed', fn);
const onScopeDisposedHooks = new HookCollector({ key: 'onScopeDisposed' });

// Naming the shape which performs collected actions is ours: the library
// neither calls a runner nor is handed one.
type HookRunner = (actions: HookAction[], context: ExecutionContext) => void;

// This runner performs the collected hooks in order and never awaits.
const run: HookRunner = (actions) => {
  for (const { hook, context } of actions) {
    hook(context);
  }
};

// Disposal is a scope event, and hanging the collection off it is ours: the
// library ships no module for that, and a module is just an `applyTo`. Every
// instance of the scope is collected into one list, so the runner orders the
// instances as well as the members.
const onScopeDisposedModule = (run: HookRunner): IContainerModule => ({
  applyTo: (container) =>
    container.scopeDisposed.subscribe((scope) => {
      run(
        scope.getInstances().flatMap((instance) => onScopeDisposedHooks.getActions(instance, { scope })),
        { scope },
      );
    }),
});

@register(bindTo('logsRepo'), singleton())
class LogsRepo {
  savedLogs: string[] = [];

  saveLogs(messages: string[]) {
    this.savedLogs.push(...messages);
  }
}

@register(bindTo('logger'))
class Logger {
  private messages: string[] = [];

  constructor(@inject(by('logsRepo')) private logsRepo: LogsRepo) {}

  log(message: string): void {
    this.messages.push(message);
  }

  @onScopeDisposed(execute)
  save() {
    this.logsRepo.saveLogs(this.messages);
  }
}

describe('onScopeDisposed', function () {
  it('should invoke hooks on all instances when container is disposed', function () {
    const container = new Container()
      .useModule(onScopeDisposedModule(run))
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromClass(LogsRepo));

    const logger = container.resolve<Logger>('logger');
    logger.log('Hello');
    const logsRepo = container.resolve<LogsRepo>('logsRepo');

    container.dispose();

    expect(logsRepo.savedLogs).toEqual(['Hello']);
  });
});

```

### Inject property

```typescript
import 'reflect-metadata';
import { Container, hook, HookCollector, injectProp, Registration, sequential, toTask, by } from 'ts-ioc-container';

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
    // Collector for the 'onInit' lifecycle hook
    const onInit = new HookCollector({ key: 'onInit' });

    class UserViewModel {
      // Inject 'GreetingService' into 'greeting' property during 'onInit'
      @hook('onInit', injectProp(by('GreetingService')))
      greetingService!: string;

      display(): string {
        return `${this.greetingService} User`;
      }
    }

    const container = new Container().addRegistration(Registration.fromValue('Hello').bindToKey('GreetingService'));

    // 1. Create instance (dependencies not yet injected)
    const viewModel = container.resolve(UserViewModel);

    // 2. Collect the lifecycle hooks and run them to inject properties
    onInit
      .getActions(viewModel, { scope: container })
      .map(toTask)
      .forEach((task) => task());

    expect(viewModel.greetingService).toBe('Hello');
    expect(viewModel.display()).toBe('Hello User');
  });

  it('should read the applied instance property via getProperty', () => {
    const onInit = new HookCollector({ key: 'onInit' });

    let injectedValue: unknown;

    class UserViewModel {
      @hook(
        'onInit',
        sequential(injectProp(by('GreetingService')), (context) => {
          injectedValue = context.getProperty();
        }),
      )
      greetingService!: string;
    }

    const container = new Container().addRegistration(Registration.fromValue('Hello').bindToKey('GreetingService'));

    const viewModel = container.resolve(UserViewModel);
    onInit
      .getActions(viewModel, { scope: container })
      .map(toTask)
      .forEach((task) => task());

    expect(injectedValue).toBe('Hello');
  });
});

```

## Cookbook

Complete architectures built on the container. Like every example in this
README, each recipe is a test file in `__tests__/readme/` that runs in CI on
every release, so it compiles and passes against the version you install. Found
a pattern worth sharing? Add a spec there and include it here — that is how the
cookbook grows.

### Mediator: proxy calls through middleware

A call pipeline built from three container features: `decorate(...)` wraps a
service in a proxy, a `GroupAliasToken` collects the middleware from the
resolving scope, and method metadata declares the policies the middleware
enforce. The service holds business logic only; logging, authorization and
caching live in middleware that can be added per scope. Change the terminal step
and the same shape is a command bus, a CQRS query pipeline, an RPC client or an
action engine for UI controllers.

```typescript
import 'reflect-metadata';
import {
  addMethodMeta,
  addMethodTag,
  by,
  Container,
  decorate,
  getMethodMeta,
  getMethodTags,
  GroupAliasToken,
  type IContainer,
  type IContainerModule,
  inject,
  ProxyRegistry,
  register,
  Registration as R,
  type RegistrationMapper,
  scope,
  singleton,
  SingleToken,
  unwrapProxy,
} from 'ts-ioc-container';

/**
 * Mediator - proxy a dependency's calls through a middleware pipeline
 *
 * The container already owns the two things a call pipeline needs: the moment a
 * dependency leaves it (the `decorate(...)` registration pipe) and a way to
 * collect every implementation of an interface (`GroupAliasToken`). Together
 * they make a small engine:
 *
 * - `mediated()` wraps a registered class in a proxy. Each method call becomes a
 *   `MethodCall` message handed to the `Mediator` of the scope that resolved it.
 * - Middleware are ordinary classes registered under `IMiddlewareToken`, resolved
 *   from that same scope - so a middleware can depend on request state (the
 *   current user), and a scope can add one without touching any service.
 * - A middleware decides whether it takes part (`match`) and wraps the rest of
 *   the chain (`next`): it runs code around it, short-circuits it, or maps its
 *   error.
 * - Policies are declared on the methods with method metadata
 *   (`@requiresRole('admin')`, `@cached()`) and read by the middleware that
 *   enforces them, so the service body holds business logic only.
 *
 * Change the terminal step and the same shape is a command bus, a CQRS query
 * pipeline, an RPC client, or an action engine for UI controllers.
 */

// --- The engine ------------------------------------------------------------

type MethodCall = { target: object; method: string; args: unknown[] };
type Next = () => Promise<unknown>;

interface IMiddleware {
  /** Higher runs outer: it sees the call first and the result last. */
  readonly priority: number;
  match(call: MethodCall): boolean;
  handle(call: MethodCall, next: Next): Promise<unknown>;
}

const IMiddlewareToken = new GroupAliasToken<IMiddleware>('IMiddleware');
const middleware = (...mappers: RegistrationMapper<IMiddleware>[]) => register(IMiddlewareToken, ...mappers);

interface IMediator {
  send(call: MethodCall): Promise<unknown>;
}

const IMediatorToken = new SingleToken<IMediator>('IMediator');

// No scope(...): the mediator is built in the scope that asks for it, so the
// middleware list it receives is that scope's.
@register(IMediatorToken)
class Mediator implements IMediator {
  constructor(@inject(by(IMiddlewareToken)) private readonly middlewares: IMiddleware[]) {}

  send(call: MethodCall): Promise<unknown> {
    const chain = this.middlewares.filter((m) => m.match(call)).sort((a, b) => b.priority - a.priority);
    const dispatch = async (i: number): Promise<unknown> =>
      i < chain.length ? chain[i].handle(call, () => dispatch(i + 1)) : invokeMethod(call);
    return dispatch(0);
  }
}

const invokeMethod = ({ target, method, args }: MethodCall): unknown =>
  (target as Record<string, (...a: unknown[]) => unknown>)[method](...args);

/**
 * Routes every method of the resolved instance through the scope's mediator.
 * `ProxyRegistry` keeps `unwrapProxy` and the library's metadata reads working on
 * the proxy, and one wrapper per method keeps `service.place === service.place`.
 */
const mediated = () =>
  decorate((instance: object, resolvingScope: IContainer) => {
    const wrappers = new Map<string, unknown>();
    return ProxyRegistry.getInstance().createProxy(instance, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        if (typeof prop !== 'string' || typeof value !== 'function') return value;
        if (!wrappers.has(prop)) {
          wrappers.set(prop, (...args: unknown[]) =>
            IMediatorToken.resolve(resolvingScope).send({ target, method: prop, args }),
          );
        }
        return wrappers.get(prop);
      },
    });
  });

// --- Policies, declared on methods -----------------------------------------

const requiresRole = (role: string) => addMethodMeta('requiresRole', () => role);
const cached = () => addMethodTag('cached');

// --- Middleware ------------------------------------------------------------

class ForbiddenError extends Error {}

interface ICurrentUser {
  readonly name: string;
  readonly roles: string[];
}
const ICurrentUserToken = new SingleToken<ICurrentUser>('ICurrentUser');

const IAuditLogToken = new SingleToken<AuditLog>('IAuditLog');

@register(IAuditLogToken, scope((s) => s.hasTag('application')), singleton())
class AuditLog {
  readonly entries: string[] = [];
}

@middleware()
class LoggingMiddleware implements IMiddleware {
  readonly priority = 100;

  constructor(@inject(by(IAuditLogToken)) private readonly audit: AuditLog) {}

  match(): boolean {
    return true;
  }

  async handle({ target, method }: MethodCall, next: Next): Promise<unknown> {
    const name = `${target.constructor.name}.${method}`;
    this.audit.entries.push(`-> ${name}`);
    try {
      const result = await next();
      this.audit.entries.push(`<- ${name}`);
      return result;
    } catch (e) {
      this.audit.entries.push(`x ${name}: ${(e as Error).constructor.name}`);
      throw e;
    }
  }
}

// Built in each request scope, so it sees that request's user.
@middleware()
class AuthorizationMiddleware implements IMiddleware {
  readonly priority = 50;

  constructor(@inject(by(ICurrentUserToken)) private readonly user: ICurrentUser) {}

  match({ target, method }: MethodCall): boolean {
    return getMethodMeta('requiresRole', target, method) !== undefined;
  }

  async handle({ target, method }: MethodCall, next: Next): Promise<unknown> {
    const role = getMethodMeta('requiresRole', target, method) as string;
    if (!this.user.roles.includes(role)) throw new ForbiddenError(`${this.user.name} is not ${role}`);
    return next();
  }
}

// One cache for the whole application, shared by every request.
@middleware(scope((s) => s.hasTag('application')), singleton())
class CacheMiddleware implements IMiddleware {
  readonly priority = 10;
  private readonly cache = new Map<string, unknown>();

  match({ target, method }: MethodCall): boolean {
    return getMethodTags(target, method).has('cached');
  }

  async handle({ target, method, args }: MethodCall, next: Next): Promise<unknown> {
    const key = `${target.constructor.name}.${method}(${JSON.stringify(args)})`;
    if (!this.cache.has(key)) this.cache.set(key, await next());
    return this.cache.get(key);
  }
}

/** The engine as one module: `container.useModule(new MediatorModule())`. */
class MediatorModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container
      .addRegistration(R.fromClass(AuditLog))
      .addRegistration(R.fromClass(Mediator))
      .addRegistration(R.fromClass(LoggingMiddleware))
      .addRegistration(R.fromClass(AuthorizationMiddleware))
      .addRegistration(R.fromClass(CacheMiddleware));
  }
}

// --- A service that knows nothing about any of it --------------------------

interface IOrderService {
  place(item: string): Promise<string>;
  cancel(orderId: string): Promise<void>;
  price(item: string): Promise<number>;
}
const IOrderServiceToken = new SingleToken<IOrderService>('IOrderService');

@register(IOrderServiceToken, mediated())
class OrderService implements IOrderService {
  readonly cancelled: string[] = [];
  priceLookups = 0;

  async place(item: string): Promise<string> {
    return `order:${item}`;
  }

  @requiresRole('admin')
  async cancel(orderId: string): Promise<void> {
    this.cancelled.push(orderId);
  }

  @cached()
  async price(item: string): Promise<number> {
    this.priceLookups++;
    return item.length * 10;
  }
}

describe('Mediator: proxy calls through middleware', () => {
  const createApp = () =>
    new Container({ tags: ['application'] }).useModule(new MediatorModule()).addRegistration(R.fromClass(OrderService));

  const openRequest = (app: IContainer, user: ICurrentUser) =>
    app.createScope({ tags: ['request'] }).addRegistration(R.fromValue(user).bindTo(ICurrentUserToken));

  const alice: ICurrentUser = { name: 'alice', roles: ['admin'] };
  const bob: ICurrentUser = { name: 'bob', roles: [] };

  it('routes a call through the matching middleware and returns its result', async () => {
    const app = createApp();
    const orders = IOrderServiceToken.resolve(openRequest(app, bob));

    expect(await orders.place('book')).toBe('order:book');
    expect(IAuditLogToken.resolve(app).entries).toEqual(['-> OrderService.place', '<- OrderService.place']);
  });

  it('enforces a method policy with the request-scoped user, short-circuiting the body', async () => {
    const app = createApp();
    const asBob = IOrderServiceToken.resolve(openRequest(app, bob));
    const asAlice = IOrderServiceToken.resolve(openRequest(app, alice));

    await expect(asBob.cancel('o-1')).rejects.toBeInstanceOf(ForbiddenError);
    await asAlice.cancel('o-2');

    expect((unwrapProxy(asBob) as OrderService).cancelled).toEqual([]);
    expect((unwrapProxy(asAlice) as OrderService).cancelled).toEqual(['o-2']);
    expect(IAuditLogToken.resolve(app).entries).toEqual([
      '-> OrderService.cancel',
      'x OrderService.cancel: ForbiddenError',
      '-> OrderService.cancel',
      '<- OrderService.cancel',
    ]);
  });

  it('serves a cached result from an application-wide middleware, across requests', async () => {
    const app = createApp();
    const first = IOrderServiceToken.resolve(openRequest(app, bob));
    const second = IOrderServiceToken.resolve(openRequest(app, alice));

    expect(await first.price('book')).toBe(40);
    expect(await second.price('book')).toBe(40);

    expect((unwrapProxy(first) as OrderService).priceLookups).toBe(1);
    expect((unwrapProxy(second) as OrderService).priceLookups).toBe(0);
  });

  it('lets a scope plug in its own middleware by registration alone', async () => {
    @middleware()
    class DryRunMiddleware implements IMiddleware {
      readonly priority = 0; // innermost: logging and authorization still run

      match(): boolean {
        return true;
      }

      async handle(): Promise<unknown> {
        return 'dry-run';
      }
    }

    const app = createApp();
    const dryRun = openRequest(app, alice).addRegistration(R.fromClass(DryRunMiddleware));

    expect(await IOrderServiceToken.resolve(dryRun).place('book')).toBe('dry-run');
    expect(await IOrderServiceToken.resolve(openRequest(app, alice)).place('book')).toBe('order:book');
  });

  it('keeps the proxy transparent: fields, identity of methods, and the real instance', () => {
    const orders = IOrderServiceToken.resolve(openRequest(createApp(), bob)) as OrderService;

    expect(orders.priceLookups).toBe(0); // non-function members are read straight off the target
    expect(orders.place).toBe(orders.place); // one wrapper per method
    expect(orders).toBeInstanceOf(OrderService);
    expect(unwrapProxy(orders)).not.toBe(orders);
  });
});

```

> [!NOTE]
> Routed methods always return a `Promise`, and a method that calls another
> through `this` reaches the real instance, so the inner call skips the
> middleware. Route the inner call through the injected proxy if it needs them.

### Declarative action pipeline

Guards, the body and follow-ups of a UI action as one ordered hook list on the
method — `@action(requireState(...), confirm('Retire?'), execute(), notify('Retired'))`.
Each step is a plain `HookFn` that resolves what it needs from the hook's scope;
a step that throws stops the rest. A `decorate(...)` proxy makes a plain call run
the whole list.

```typescript
import 'reflect-metadata';
import {
  by,
  Container,
  decorate,
  getHooks,
  hook,
  HookCollector,
  type HookFn,
  type HookType,
  type IContainer,
  inject,
  type InjectionToken,
  ProxyRegistry,
  register,
  Registration as R,
  runInOrder,
  sequential,
  SingleToken,
  toTask,
} from 'ts-ioc-container';

/**
 * Declarative action pipeline: guards, body, follow-ups
 *
 * A UI action is rarely just its body. Before it: is the device online, did the
 * user confirm? After it: show a toast, refresh a list. Writing those as guard
 * clauses buries the action; here they are steps in one ordered list on the
 * method, and `execute()` marks where the body runs:
 *
 *   @action(requireState(...), confirm('Retire?'), execute(), notify('Retired'))
 *
 * - `action(...steps)` is one application-defined hook key; `sequential(...)`
 *   runs the steps in order, awaiting any that go async.
 * - A step is a plain `HookFn`. It resolves what it needs from the hook's own
 *   scope (`ctx.scope`), so the controller injects none of it.
 * - A step that throws stops the list: the body and the follow-ups never run.
 * - The `actions()` registration pipe proxies the controller, so a caller just
 *   calls `controller.retire(id)` and the whole list runs. Methods without
 *   `@action` are read straight off the controller.
 *
 * Every step is a pure, separately testable function, and the action's own test
 * covers only what it does once its preconditions hold.
 */

// --- The engine ------------------------------------------------------------

const action = (...steps: HookType[]) => hook('action', sequential(...steps));
const actionHooks = new HookCollector({ key: 'action' });

/** The body's position in the list: calls the method with the caller's args. */
const execute = (): HookFn => (ctx) => {
  const result = ctx.invokeMethod({ args: ctx.getInitialArgs() });
  return result instanceof Promise ? result.then(() => undefined) : undefined;
};

/** Routes every `@action` method through its step list. */
const actions = () =>
  decorate((controller: object, s: IContainer) =>
    ProxyRegistry.getInstance().createProxy(controller, {
      get(target, prop) {
        if (typeof prop !== 'string' || !getHooks(target, 'action').has(prop)) return Reflect.get(target, prop);
        return async (...args: unknown[]) => {
          const steps = actionHooks.getActions(target, {
            scope: s,
            predicate: (method) => method === prop,
            mapExecutionContext: (ctx) => ctx.setInitialArgs(...args),
          });
          await runInOrder(steps.map(toTask));
        };
      },
    }),
  );

// --- Reusable steps --------------------------------------------------------

class ActionNotAllowedError extends Error {}
class UserRejectedError extends Error {}

interface IConnection {
  online: boolean;
}
const IConnectionToken = new SingleToken<IConnection>('IConnection');

interface IDialog {
  confirm(question: string): Promise<boolean>;
}
const IDialogToken = new SingleToken<IDialog>('IDialog');

interface INotifications {
  readonly messages: string[];
}
const INotificationsToken = new SingleToken<INotifications>('INotifications');

const requireState =
  <T>(token: InjectionToken<T>, isAllowed: (dependency: T) => boolean, reason: string): HookFn =>
  (ctx) => {
    if (!isAllowed(token.resolve(ctx.scope))) throw new ActionNotAllowedError(reason);
  };

const confirm =
  (question: string): HookFn =>
  async (ctx) => {
    if (!(await IDialogToken.resolve(ctx.scope).confirm(question))) throw new UserRejectedError(question);
  };

const notify =
  (message: string): HookFn =>
  (ctx) => {
    INotificationsToken.resolve(ctx.scope).messages.push(message);
  };

// --- A controller that reads as its behaviour ------------------------------

interface IStationService {
  retire(stationId: string): Promise<void>;
}
const IStationServiceToken = new SingleToken<IStationService>('IStationService');

const IStationsControllerToken = new SingleToken<StationsController>('IStationsController');

@register(IStationsControllerToken, actions())
class StationsController {
  constructor(@inject(by(IStationServiceToken)) private readonly stations: IStationService) {}

  @action(
    requireState(IConnectionToken, (c) => c.online, 'Station is offline.'),
    confirm('Retire the station?'),
    execute(),
    notify('Station retired'),
  )
  async retire(stationId: string): Promise<void> {
    await this.stations.retire(stationId);
  }

  title(): string {
    return 'Stations';
  }
}

describe('Declarative action pipeline', () => {
  const setup = ({ online = true, answer = true } = {}) => {
    const retired: string[] = [];
    const notifications: INotifications = { messages: [] };
    const container = new Container({ tags: ['page'] })
      .addRegistration(R.fromClass(StationsController))
      .addRegistration(R.fromValue<IConnection>({ online }).bindTo(IConnectionToken))
      .addRegistration(R.fromValue<IDialog>({ confirm: async () => answer }).bindTo(IDialogToken))
      .addRegistration(R.fromValue(notifications).bindTo(INotificationsToken))
      .addRegistration(
        R.fromValue<IStationService>({ retire: async (id) => void retired.push(id) }).bindTo(IStationServiceToken),
      );
    return { controller: IStationsControllerToken.resolve(container), retired, notifications };
  };

  it('runs guards, the body and follow-ups in declaration order', async () => {
    const { controller, retired, notifications } = setup();

    await controller.retire('st-1');

    expect(retired).toEqual(['st-1']);
    expect(notifications.messages).toEqual(['Station retired']);
  });

  it('stops at a failed guard: no body, no follow-up', async () => {
    const { controller, retired, notifications } = setup({ online: false });

    await expect(controller.retire('st-1')).rejects.toBeInstanceOf(ActionNotAllowedError);
    expect(retired).toEqual([]);
    expect(notifications.messages).toEqual([]);
  });

  it('awaits an async step, and a declined confirmation aborts the action', async () => {
    const { controller, retired } = setup({ answer: false });

    await expect(controller.retire('st-1')).rejects.toBeInstanceOf(UserRejectedError);
    expect(retired).toEqual([]);
  });

  it('leaves methods without @action untouched', () => {
    const { controller } = setup();

    expect(controller.title()).toBe('Stations');
  });
});

```

### Error bubbling through scopes

An error raised in a widget bubbles like a DOM event: widget controller, then
page, then application. A `GroupAliasToken` resolved from a scope yields the
controller of every level, innermost first — that list is the bubbling chain. A
handler that returns owns the error; one that re-throws passes it outward,
optionally translated.

```typescript
import 'reflect-metadata';
import {
  by,
  Container,
  GroupAliasToken,
  hasHooks,
  hook,
  HookCollector,
  type HookFn,
  type IContainer,
  inject,
  register,
  Registration as R,
  scope,
  select,
  singleton,
  SingleToken,
} from 'ts-ioc-container';

/**
 * Error bubbling through scopes
 *
 * A frontend opens one scope per level - application, page, widget - and gives
 * each level a controller. An error raised in a widget then bubbles like a DOM
 * event: the widget's controller gets first refusal, then the page's, then the
 * application's. A handler that returns has handled the error; one that
 * re-throws hands it outward - the same error, or a translated one.
 *
 * - `IControllerToken` is a `GroupAliasToken`: resolved from a scope, it yields
 *   the controller of that scope and of every ancestor, innermost first. That
 *   list *is* the bubbling chain - no parent pointers to maintain.
 * - `@onError(...)` is an application-defined hook key; the library only
 *   collects it, and `BubblingErrorHandler` decides how it runs.
 * - Each hook runs in the scope that owns its controller, so a handler resolves
 *   its own dependencies, not the widget's.
 *
 * The same chain works for any "innermost owner wins" rule: request handlers,
 * nested transactions, plugin hosts.
 */

const IControllerToken = new GroupAliasToken<object>('IController');

const onError = (fn: HookFn) => hook('onError', fn);
const onErrorHooks = new HookCollector({ key: 'onError' });

/** The hook body: call the decorated method with the error the chain seeded. */
const handle: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.getInitialArgs() });
};

interface IErrorHandler {
  onError(error: unknown): void;
}
const IErrorHandlerToken = new SingleToken<IErrorHandler>('IErrorHandler');

// No scope(...): built in the scope that bubbles, so it sees that scope's chain.
@register(IErrorHandlerToken)
class BubblingErrorHandler implements IErrorHandler {
  constructor(
    @inject(by(select.scope.current)) private readonly scope: IContainer,
    @inject(by(IControllerToken)) private readonly controllers: object[],
  ) {}

  onError(error: unknown): void {
    let current = error;
    for (const controller of this.controllers) {
      if (!hasHooks(controller, 'onError')) continue;
      try {
        const actions = onErrorHooks.getActions(controller, {
          scope: this.ownerOf(controller),
          mapExecutionContext: (ctx) => ctx.setInitialArgs(current),
        });
        for (const { hook: run, context } of actions) run(context);
        return; // returned: handled here
      } catch (e) {
        current = e; // re-thrown: try the next controller out
      }
    }
    throw current; // nobody owns it
  }

  private ownerOf(instance: object): IContainer {
    for (let s: IContainer | undefined = this.scope; s; s = s.getParent()) {
      if (s.hasInstance(instance)) return s;
    }
    return this.scope;
  }
}

// --- Errors and the controllers that own them ------------------------------

class ValidationError extends Error {}
class NotFoundError extends Error {}
class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}
class SessionExpiredError extends Error {}

const perLevel = (tag: string) => scope((s) => s.hasTag(tag));

@register(IControllerToken, perLevel('widget'), singleton())
class FormWidgetController {
  readonly fieldErrors: string[] = [];

  @onError(handle)
  handleError(error: unknown): void {
    if (!(error instanceof ValidationError)) throw error;
    this.fieldErrors.push(error.message);
  }
}

@register(IControllerToken, perLevel('page'), singleton())
class PageController {
  notFound = false;

  @onError(handle)
  handleError(error: unknown): void {
    if (error instanceof NotFoundError) {
      this.notFound = true;
      return;
    }
    // Translate on the way out: the page knows a 401 means the session is gone.
    if (error instanceof HttpError && error.status === 401) throw new SessionExpiredError();
    throw error;
  }
}

@register(IControllerToken, perLevel('application'), singleton())
class AppController {
  redirectedToLogin = false;
  readonly unexpected: unknown[] = [];

  // The catch-all: never re-throws.
  @onError(handle)
  handleError(error: unknown): void {
    if (error instanceof SessionExpiredError) this.redirectedToLogin = true;
    else this.unexpected.push(error);
  }
}

describe('Error bubbling through scopes', () => {
  const createTree = () => {
    const app = new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(BubblingErrorHandler))
      .addRegistration(R.fromClass(AppController))
      .addRegistration(R.fromClass(PageController))
      .addRegistration(R.fromClass(FormWidgetController));
    const page = app.createScope({ tags: ['page'] });
    const widget = page.createScope({ tags: ['widget'] });
    const [form, pageCtrl, appCtrl] = IControllerToken.resolve(widget) as [
      FormWidgetController,
      PageController,
      AppController,
    ];
    return { app, page, widget, form, pageCtrl, appCtrl };
  };

  it('collects the chain innermost first', () => {
    const { form, pageCtrl, appCtrl } = createTree();

    expect(form).toBeInstanceOf(FormWidgetController);
    expect(pageCtrl).toBeInstanceOf(PageController);
    expect(appCtrl).toBeInstanceOf(AppController);
  });

  it('stops at the innermost controller that owns the error', () => {
    const { widget, form, pageCtrl, appCtrl } = createTree();

    IErrorHandlerToken.resolve(widget).onError(new ValidationError('email is required'));

    expect(form.fieldErrors).toEqual(['email is required']);
    expect(pageCtrl.notFound).toBe(false);
    expect(appCtrl.unexpected).toEqual([]);
  });

  it('passes an error the widget does not own up to the page', () => {
    const { widget, pageCtrl, appCtrl } = createTree();

    IErrorHandlerToken.resolve(widget).onError(new NotFoundError());

    expect(pageCtrl.notFound).toBe(true);
    expect(appCtrl.unexpected).toEqual([]);
  });

  it('lets a controller translate the error before passing it on', () => {
    const { widget, appCtrl } = createTree();

    IErrorHandlerToken.resolve(widget).onError(new HttpError(401));

    expect(appCtrl.redirectedToLogin).toBe(true);
  });

  it('ends at the application catch-all', () => {
    const { widget, appCtrl } = createTree();
    const boom = new Error('boom');

    IErrorHandlerToken.resolve(widget).onError(boom);

    expect(appCtrl.unexpected).toEqual([boom]);
  });

  it('starts from the scope that raised it: a page error skips widget controllers', () => {
    const { page, form, pageCtrl } = createTree();

    IErrorHandlerToken.resolve(page).onError(new ValidationError('not mine'));

    expect(form.fieldErrors).toEqual([]);
    expect(pageCtrl.notFound).toBe(false);
  });
});

```

### Retry later

Replay a failed call — same method, same arguments — when the cause goes away
(the connection is back, the user logged in again) instead of retrying in a
loop. `@retryable()` is method metadata; a `decorate(...)` proxy files the
failure with an application-wide queue, and whatever notices the recovery
replays what its predicate selects.

```typescript
import 'reflect-metadata';
import {
  addMethodTag,
  by,
  Container,
  decorate,
  getMethodTags,
  type IContainer,
  inject,
  ProxyRegistry,
  register,
  Registration as R,
  scope,
  singleton,
  SingleToken,
} from 'ts-ioc-container';

/**
 * Retry later: replay failed calls when something recovers
 *
 * Retrying in a loop is the wrong tool when the cause is outside your control -
 * the device is offline, the session expired. The call should wait until the
 * world recovers and then run again, with the same arguments, without the user
 * repeating it.
 *
 * - `@retryable()` tags a method with method metadata.
 * - The `retrying()` registration pipe proxies the class. When a tagged method
 *   fails, the error gets a `retry` callback that calls the method again through
 *   the proxy, and is filed with the application's `RetryQueue`. The error still
 *   reaches the caller - filing it is not handling it.
 * - Whatever notices the recovery - a connection event, a successful login -
 *   calls `queue.retry(predicate)`. The predicate is the policy: by error class,
 *   by status code, by anything the error carries.
 * - Replays are one-shot: a replay that fails again is filed as a fresh error.
 */

// --- The engine ------------------------------------------------------------

interface IRetryableError extends Error {
  retry: () => Promise<unknown>;
}
const isRetryableError = (error: unknown): error is IRetryableError =>
  error instanceof Error && typeof (error as Partial<IRetryableError>).retry === 'function';

const IRetryQueueToken = new SingleToken<RetryQueue>('IRetryQueue');

@register(IRetryQueueToken, scope((s) => s.hasTag('application')), singleton())
class RetryQueue {
  private errors: IRetryableError[] = [];

  get size(): number {
    return this.errors.length;
  }

  file(error: IRetryableError): void {
    this.errors.push(error);
  }

  /** Replays and drops every filed error the predicate accepts. */
  async retry(predicate: (error: IRetryableError) => boolean): Promise<void> {
    const matched = this.errors.filter(predicate);
    // Drop before replaying, so a replay that fails again is filed fresh.
    this.errors = this.errors.filter((e) => !matched.includes(e));
    await Promise.allSettled(matched.map((e) => e.retry()));
  }
}

const retryable = () => addMethodTag('retryable');

const retrying = () =>
  decorate((instance: object, s: IContainer) => {
    const proxy: object = ProxyRegistry.getInstance().createProxy(instance, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        if (typeof prop !== 'string' || !getMethodTags(target, prop).has('retryable')) return value;
        return async (...args: unknown[]) => {
          try {
            return await (value as (...a: unknown[]) => unknown).apply(target, args);
          } catch (error) {
            if (error instanceof Error && !isRetryableError(error)) {
              const retry = () => (proxy as Record<string, (...a: unknown[]) => Promise<unknown>>)[prop](...args);
              IRetryQueueToken.resolve(s).file(Object.assign(error, { retry }));
            }
            throw error;
          }
        };
      },
    });
    return proxy;
  });

// --- The application -------------------------------------------------------

class OfflineError extends Error {}

interface IConnection {
  online: boolean;
}
const IConnectionToken = new SingleToken<IConnection>('IConnection');

const IChargingServiceToken = new SingleToken<ChargingService>('IChargingService');

@register(IChargingServiceToken, retrying())
class ChargingService {
  readonly started: string[] = [];

  constructor(@inject(by(IConnectionToken)) private readonly connection: IConnection) {}

  @retryable()
  async startCharge(stationId: string): Promise<void> {
    if (!this.connection.online) throw new OfflineError(`cannot reach ${stationId}`);
    this.started.push(stationId);
  }

  async stopCharge(stationId: string): Promise<void> {
    if (!this.connection.online) throw new OfflineError(`cannot reach ${stationId}`);
  }
}

describe('Retry later', () => {
  const setup = () => {
    const connection: IConnection = { online: false };
    const app = new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(RetryQueue))
      .addRegistration(R.fromClass(ChargingService))
      .addRegistration(R.fromValue(connection).bindTo(IConnectionToken));
    return { connection, charging: IChargingServiceToken.resolve(app), queue: IRetryQueueToken.resolve(app) };
  };

  it('files a failed call and replays it, with its arguments, once the cause is gone', async () => {
    const { connection, charging, queue } = setup();

    await expect(charging.startCharge('st-1')).rejects.toBeInstanceOf(OfflineError); // the caller still sees it
    expect(queue.size).toBe(1);

    connection.online = true;
    await queue.retry((e) => e instanceof OfflineError);

    expect(charging.started).toEqual(['st-1']);
    expect(queue.size).toBe(0);
  });

  it('files a replay that fails again as a fresh error', async () => {
    const { charging, queue } = setup();
    await expect(charging.startCharge('st-1')).rejects.toThrow();

    await queue.retry(() => true); // still offline

    expect(queue.size).toBe(1);
  });

  it('replays only what the predicate selects', async () => {
    const { connection, charging, queue } = setup();
    await expect(charging.startCharge('st-1')).rejects.toThrow();
    await expect(charging.startCharge('st-2')).rejects.toThrow();

    connection.online = true;
    await queue.retry((e) => e.message.includes('st-2'));

    expect(charging.started).toEqual(['st-2']);
    expect(queue.size).toBe(1);
  });

  it('leaves untagged methods alone', async () => {
    const { charging, queue } = setup();

    await expect(charging.stopCharge('st-1')).rejects.toBeInstanceOf(OfflineError);
    expect(queue.size).toBe(0);
  });
});

```

### Unit of work per request

A request-scoped identity map per repository, keyed by the repository token
passed as a runtime arg (`singleton(cacheKey)` + `byArgs(...)`), flushed by an
`@onCommit` hook inside one transaction once the handler has answered. Services
only change objects; a failed request writes nothing.

```typescript
import 'reflect-metadata';
import {
  by,
  byArgs,
  Container,
  findArgOrFail,
  hook,
  HookCollector,
  type HookFn,
  type IContainer,
  inject,
  type InjectionToken,
  isInjectionToken,
  register,
  Registration as R,
  runInOrder,
  scope,
  singleton,
  SingleToken,
  toTask,
} from 'ts-ioc-container';

/**
 * Unit of work per request: identity map + commit on success
 *
 * A request reads records, several services change them, and the changes are
 * written together - in one transaction, only if the request succeeded. Within
 * the request every read of one id returns the same object, so changes made in
 * different services land on it and are written once.
 *
 * - `EntityManager` is request-scoped and resolved with a repository token as a
 *   runtime arg: `IEntityManagerToken.args(IUserRepositoryToken)`. That token is
 *   both what it works over (`byArgs(...)`) and its `singleton(...)` cache key,
 *   so every service asking for the users' manager in one request meets on the
 *   same identity map.
 * - Repository tokens carry a `repository` tag, which is how the manager picks
 *   its token out of the args.
 * - `flush()` is an `@onCommit` hook - an application-defined key. The request
 *   pipeline runs every `@onCommit` hook of the request scope inside one
 *   transaction once the handler has answered; a handler that throws commits
 *   nothing. `dispose()` then drops the scope and its identity maps.
 */

// --- Persistence -----------------------------------------------------------

interface IEntity {
  id: string;
}

/** An in-memory database whose transaction rolls back on a throw. */
class Database {
  readonly tables = new Map<string, Map<string, IEntity>>();
  transactions = 0;

  table(name: string): Map<string, IEntity> {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name)!;
  }

  async transaction(work: () => Promise<void>): Promise<void> {
    const snapshot = new Map([...this.tables].map(([name, rows]) => [name, new Map(rows)]));
    try {
      await work();
      this.transactions++;
    } catch (e) {
      this.tables.clear();
      for (const [name, rows] of snapshot) this.tables.set(name, rows);
      throw e;
    }
  }
}
const IDatabaseToken = new SingleToken<Database>('IDatabase');

interface IRepository<E extends IEntity = IEntity> {
  readonly saved: string[];
  findById(id: string): Promise<E | undefined>;
  save(entity: E): Promise<void>;
}

const repositoryToken = <E extends IEntity>(key: string) =>
  new SingleToken<IRepository<E>>(key, { tags: ['repository'] });
const isRepositoryToken = (value: unknown): value is InjectionToken<IRepository> =>
  isInjectionToken(value) && value.hasTag('repository');

interface User extends IEntity {
  name: string;
  orders: number;
}

const IUserRepositoryToken = repositoryToken<User>('IUserRepository');

// Returns copies, so only `save` changes the table.
@register(IUserRepositoryToken, scope((s) => s.hasTag('application')), singleton())
class UserRepository implements IRepository<User> {
  readonly saved: string[] = [];

  constructor(@inject(by(IDatabaseToken)) private readonly db: Database) {}

  async findById(id: string): Promise<User | undefined> {
    const row = this.db.table('users').get(id);
    return row && ({ ...row } as User);
  }

  async save(user: User): Promise<void> {
    this.saved.push(user.id);
    this.db.table('users').set(user.id, { ...user });
  }
}

// --- The unit of work ------------------------------------------------------

const onCommit = (fn: HookFn) => hook('onCommit', fn);
const onCommitHooks = new HookCollector({ key: 'onCommit' });
const invoke: HookFn = (ctx) => ctx.invokeMethod() as Promise<void>;

const repositoryTokenOf = findArgOrFail<InjectionToken<IRepository>>(isRepositoryToken);

class EntityNotFoundError extends Error {}

const IEntityManagerToken = new SingleToken<EntityManager>('IEntityManager');

@register(IEntityManagerToken, scope((s) => s.hasTag('request')), singleton(repositoryTokenOf))
class EntityManager<E extends IEntity = IEntity> {
  private readonly tracked = new Map<string, E>();

  constructor(@inject(byArgs(repositoryTokenOf)) private readonly repository: IRepository<E>) {}

  async findByIdOrFail(id: string): Promise<E> {
    const known = this.tracked.get(id);
    if (known) return known;
    const entity = await this.repository.findById(id);
    if (!entity) throw new EntityNotFoundError(id);
    this.tracked.set(id, entity);
    return entity;
  }

  @onCommit(invoke)
  async flush(): Promise<void> {
    for (const entity of this.tracked.values()) await this.repository.save(entity);
  }
}

/** The manager of one repository, typed by it. */
const entityManagerOf = <E extends IEntity>(token: SingleToken<IRepository<E>>) =>
  IEntityManagerToken.args(token) as unknown as SingleToken<EntityManager<E>>;

// --- The request pipeline --------------------------------------------------

const handleRequest = async <T>(app: IContainer, handler: (request: IContainer) => Promise<T>): Promise<T> => {
  const request = app.createScope({ tags: ['request'] });
  try {
    const result = await handler(request);
    await IDatabaseToken.resolve(request).transaction(async () => {
      const commits = request.getInstances().flatMap((i) => onCommitHooks.getActions(i, { scope: request }));
      await runInOrder(commits.map(toTask));
    });
    return result;
  } finally {
    request.dispose();
  }
};

// --- Services that only change objects -------------------------------------

class RenameUser {
  constructor(@inject(by(entityManagerOf(IUserRepositoryToken))) private readonly users: EntityManager<User>) {}

  async run(id: string, name: string): Promise<void> {
    (await this.users.findByIdOrFail(id)).name = name;
  }
}

class CountOrder {
  constructor(@inject(by(entityManagerOf(IUserRepositoryToken))) private readonly users: EntityManager<User>) {}

  async run(id: string): Promise<void> {
    (await this.users.findByIdOrFail(id)).orders++;
  }
}

describe('Unit of work per request', () => {
  const createApp = () => {
    const db = new Database();
    db.table('users').set('u-1', { id: 'u-1', name: 'alice', orders: 0 } as User);
    const app = new Container({ tags: ['application'] })
      .addRegistration(R.fromValue(db).bindTo(IDatabaseToken))
      .addRegistration(R.fromClass(UserRepository))
      .addRegistration(R.fromClass(EntityManager));
    return { app, db, users: IUserRepositoryToken.resolve(app) };
  };

  it('shares one identity map per repository per request and writes each entity once', async () => {
    const { app, db, users } = createApp();

    await handleRequest(app, async (request) => {
      await request.resolve(RenameUser).run('u-1', 'Alice');
      await request.resolve(CountOrder).run('u-1');
      expect(entityManagerOf(IUserRepositoryToken).resolve(request)).toBe(
        entityManagerOf(IUserRepositoryToken).resolve(request),
      );
    });

    expect(db.table('users').get('u-1')).toEqual({ id: 'u-1', name: 'Alice', orders: 1 });
    expect(users.saved).toEqual(['u-1']); // two changes, one write
    expect(db.transactions).toBe(1);
  });

  it('commits nothing when the handler fails', async () => {
    const { app, db, users } = createApp();

    await expect(
      handleRequest(app, async (request) => {
        await request.resolve(RenameUser).run('u-1', 'Mallory');
        throw new Error('payment declined');
      }),
    ).rejects.toThrow('payment declined');

    expect(db.table('users').get('u-1')).toMatchObject({ name: 'alice' });
    expect(users.saved).toEqual([]);
  });

  it('gives every request its own identity map', async () => {
    const { app } = createApp();
    const seen: EntityManager<User>[] = [];

    await handleRequest(app, async (r) => void seen.push(entityManagerOf(IUserRepositoryToken).resolve(r)));
    await handleRequest(app, async (r) => void seen.push(entityManagerOf(IUserRepositoryToken).resolve(r)));

    expect(seen[0]).not.toBe(seen[1]);
  });
});

```

### Layer and scope decorators

Name your architecture: `@perRequest('admin')`, `@service(Token, singleton())`,
`@repository(...)`. Scope decorators wrap `scope(...)`; layer decorators add the
class to a `GroupAliasToken` of its layer, so a whole layer can be listed from
any scope; `createComposeClassDecorator` names a combination you repeat.

```typescript
import 'reflect-metadata';
import {
  by,
  Container,
  createComposeClassDecorator,
  DependencyNotFoundError,
  GroupAliasToken,
  inject,
  register,
  Registration as R,
  type RegistrationMapper,
  scope,
  singleton,
  SingleToken,
} from 'ts-ioc-container';

/**
 * Architecture vocabulary: layer and scope decorators
 *
 * Give the architecture names, and a class states where it belongs in one line:
 *
 *   @perRequest()
 *   @service(IOrderServiceToken, singleton())
 *   class OrderService {}
 *
 * - Scope decorators (`perApp`, `perRequest`) wrap `scope(...)`. An optional
 *   name narrows one further to a scope opened with that extra tag:
 *   `perRequest('admin')` exists only in requests tagged `admin`.
 * - Layer decorators (`service`, `repository`) wrap `register(...)` and add the
 *   class to a `GroupAliasToken` of its layer, so the whole layer can be listed
 *   from any scope - to reset repositories between tests, run health checks, or
 *   assert an architecture rule. Its own token and lifetime are passed in as
 *   mappers, so a class never stacks two `@register`s.
 * - `createComposeClassDecorator` names a combination the codebase repeats.
 *
 * The decorators are a vocabulary your team - and your AI coding agent - can
 * apply without knowing the registration rules behind them.
 */

// --- The vocabulary --------------------------------------------------------

const perScope =
  (tag: string) =>
  (name?: string): ClassDecorator =>
    register(scope((s) => s.hasTag(tag) && (name === undefined || s.hasTag(name))));

const perApp = perScope('application');
const perRequest = perScope('request');

interface IResettable {
  reset(): void;
}

const IServiceToken = new GroupAliasToken<object>('IService');
const IRepositoryToken = new GroupAliasToken<IResettable>('IRepository');

const service = (...mappers: RegistrationMapper[]): ClassDecorator => register(IServiceToken, ...mappers);
const repository = (...mappers: RegistrationMapper[]): ClassDecorator => register(IRepositoryToken, ...mappers);

/** One application-wide repository, in one decorator. */
const appRepository = (...mappers: RegistrationMapper[]) =>
  createComposeClassDecorator(perApp(), repository(singleton(), ...mappers));

// --- An application written in it ------------------------------------------

interface Order {
  id: string;
  total: number;
}

const IOrderRepositoryToken = new SingleToken<OrderRepository>('IOrderRepository');
const ICustomerRepositoryToken = new SingleToken<CustomerRepository>('ICustomerRepository');
const IOrderServiceToken = new SingleToken<OrderService>('IOrderService');
const IRefundServiceToken = new SingleToken<RefundService>('IRefundService');

@appRepository(IOrderRepositoryToken)
class OrderRepository implements IResettable {
  orders: Order[] = [{ id: 'o-1', total: 30 }];

  reset(): void {
    this.orders = [];
  }
}

@appRepository(ICustomerRepositoryToken)
class CustomerRepository implements IResettable {
  customers = ['alice'];

  reset(): void {
    this.customers = [];
  }
}

@perRequest()
@service(IOrderServiceToken, singleton())
class OrderService {
  constructor(@inject(by(IOrderRepositoryToken)) private readonly orders: OrderRepository) {}

  total(): number {
    return this.orders.orders.reduce((sum, o) => sum + o.total, 0);
  }
}

// Only requests opened with the `admin` tag get this one.
@perRequest('admin')
@service(IRefundServiceToken, singleton())
class RefundService {
  constructor(@inject(by(IOrderRepositoryToken)) private readonly orders: OrderRepository) {}

  refund(orderId: string): void {
    this.orders.orders = this.orders.orders.filter((o) => o.id !== orderId);
  }
}

describe('Layer and scope decorators', () => {
  const createApp = () =>
    new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(OrderRepository))
      .addRegistration(R.fromClass(CustomerRepository))
      .addRegistration(R.fromClass(OrderService))
      .addRegistration(R.fromClass(RefundService));

  it('registers each class in the scope its decorator names', () => {
    const app = createApp();
    const request = app.createScope({ tags: ['request'] });

    expect(IOrderServiceToken.resolve(request).total()).toBe(30);
    expect(() => IOrderServiceToken.resolve(app)).toThrow(DependencyNotFoundError); // not an app-level service
    expect(IOrderRepositoryToken.resolve(request)).toBe(IOrderRepositoryToken.resolve(app)); // one per app
  });

  it('narrows a scope decorator by name', () => {
    const app = createApp();
    const admin = app.createScope({ tags: ['request', 'admin'] });
    const regular = app.createScope({ tags: ['request'] });

    IRefundServiceToken.resolve(admin).refund('o-1');

    expect(IOrderServiceToken.resolve(regular).total()).toBe(0);
    expect(() => IRefundServiceToken.resolve(regular)).toThrow(DependencyNotFoundError);
  });

  it('lists a whole layer from any scope', () => {
    const app = createApp();
    const request = app.createScope({ tags: ['request'] });

    // e.g. between tests: wipe every repository, whatever the feature
    for (const repo of IRepositoryToken.resolve(request)) repo.reset();

    expect(IOrderRepositoryToken.resolve(app).orders).toEqual([]);
    expect(ICustomerRepositoryToken.resolve(app).customers).toEqual([]);
    expect(IServiceToken.resolve(request)).toHaveLength(1); // OrderService; RefundService is admin-only
  });
});

```

### Per-request scope (Express / Next.js)

```typescript
import 'reflect-metadata';
import { bindTo, Container, register, Registration as R, singleton } from 'ts-ioc-container';

/**
 * Web Framework Integration - Per-Request Scope
 *
 * In Express/Next.js applications, each HTTP request typically gets its own
 * scope. This ensures request-specific state (logger context, current user,
 * correlation IDs) is isolated between concurrent requests.
 *
 * Scope hierarchy:
 *   Application (singleton services — live for entire app lifetime)
 *     └── Request (per-request services — created and disposed per request)
 */

@register(bindTo('ILogger'), singleton())
class Logger {
  readonly messages: string[] = [];

  log(message: string) {
    this.messages.push(message);
  }
}

describe('Express/Next per-request scope', () => {
  it('should give each request its own Logger instance', () => {
    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));

    // Simulate two concurrent HTTP requests
    const request1Scope = app.createScope({ tags: ['request'] });
    const request2Scope = app.createScope({ tags: ['request'] });

    const logger1 = request1Scope.resolve<Logger>('ILogger');
    const logger2 = request2Scope.resolve<Logger>('ILogger');

    logger1.log('req 1 started');
    logger2.log('req 2 started');

    // Each request has its own Logger — logs don't leak between requests
    expect(logger1.messages).toEqual(['req 1 started']);
    expect(logger2.messages).toEqual(['req 2 started']);
    expect(logger1).not.toBe(logger2);
  });

  it('should resolve the same Logger within a single request', () => {
    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));

    const requestScope = app.createScope({ tags: ['request'] });

    const logger1 = requestScope.resolve<Logger>('ILogger');
    const logger2 = requestScope.resolve<Logger>('ILogger');

    // Within one request, singleton is maintained
    expect(logger1).toBe(logger2);
  });
});

```

### Frontend widget with a lazy page dependency

```typescript
import 'reflect-metadata';
import { bindTo, Container, inject, register, Registration as R, select, singleton, by } from 'ts-ioc-container';

/**
 * Frontend Widget - Page Scope with Lazy Dependency
 *
 * In frontend applications, feature flags are fetched once per page load
 * (singleton per page scope) but a widget may not need them on every render.
 * Lazy injection defers instantiation until the widget actually reads the flags,
 * avoiding unnecessary work for widgets that never display flag-gated content.
 *
 * Scope hierarchy:
 *   Application
 *     └── Page (singleton flags fetched once)
 *           └── Widget (lazy flag access)
 */

@register(bindTo('FeatureFlags'), singleton())
class FeatureFlags {
  load(): Record<string, boolean> {
    return { newDashboard: true };
  }
}

class Widget {
  constructor(
    @inject(by(select.token('FeatureFlags').lazy()))
    public flags: FeatureFlags,
  ) {}
}

describe('Frontend widget/page scope with lazy dependency', () => {
  function createPage() {
    return new Container({ tags: ['page'] })
      .addRegistration(R.fromClass(FeatureFlags))
      .addRegistration(R.fromClass(Widget));
  }

  it('should not instantiate FeatureFlags until the widget actually accesses it', () => {
    const page = createPage();

    const widget = page.resolve(Widget);

    // Widget is resolved, but FeatureFlags has not been instantiated yet
    let instances = Array.from(page.getInstances()).filter((x) => x instanceof FeatureFlags);
    expect(instances).toHaveLength(0);

    // Accessing any property on the lazy proxy triggers instantiation
    const _load = widget.flags.load;
    expect(_load).toBeDefined();

    instances = Array.from(page.getInstances()).filter((x) => x instanceof FeatureFlags);
    expect(instances).toHaveLength(1);
  });

  it('should share the same FeatureFlags singleton across widgets on the same page', () => {
    const page = createPage();

    const widget1 = page.resolve(Widget);
    const widget2 = page.resolve(Widget);

    // Trigger instantiation through both widgets
    const _load1 = widget1.flags.load;
    const _load2 = widget2.flags.load;
    expect(_load1).toBeDefined();
    expect(_load2).toBeDefined();

    // Only one FeatureFlags instance was created across the whole page scope
    const instances = Array.from(page.getInstances()).filter((x) => x instanceof FeatureFlags);
    expect(instances).toHaveLength(1);
  });
});

```

### Background worker

```typescript
import 'reflect-metadata';
import { Container, inject, register, Registration as R, singleton, by } from 'ts-ioc-container';

/**
 * Background Worker - Singleton Client, Transient Jobs
 *
 * A queue worker typically needs:
 * - A single shared QueueClient (expensive to create, holds connections)
 * - A new JobHandler per job (stateful — holds job-specific data)
 *
 * singleton() on QueueClient ensures one shared connection pool.
 * No singleton on JobHandler gives a fresh instance per resolve.
 */

@register(singleton())
class QueueClient {
  readonly connected = true;

  dequeue(): string {
    return 'job-payload';
  }
}

class JobHandler {
  readonly result: string;

  constructor(@inject(by('QueueClient')) private queue: QueueClient) {
    this.result = this.queue.dequeue();
  }
}

describe('Background worker', () => {
  function createWorker() {
    return new Container({ tags: ['worker'] })
      .addRegistration(R.fromClass(QueueClient))
      .addRegistration(R.fromClass(JobHandler));
  }

  it('should share a single QueueClient across all job handlers', () => {
    const worker = createWorker();

    const handler1 = worker.resolve(JobHandler);
    const handler2 = worker.resolve(JobHandler);

    const client1 = worker.resolve<QueueClient>('QueueClient');
    const client2 = worker.resolve<QueueClient>('QueueClient');

    // QueueClient is a singleton — same connection shared everywhere
    expect(client1).toBe(client2);
    expect(client1.connected).toBe(true);

    // JobHandler is transient — fresh instance per job
    expect(handler1).not.toBe(handler2);
  });

  it('should inject the shared QueueClient into each JobHandler', () => {
    const worker = createWorker();

    const handler = worker.resolve(JobHandler);

    expect(handler.result).toBe('job-payload');
  });
});

```

## Error

The product-facing error contract is described in
`specs/epics/errors-and-boundaries.md` and executed by
`__tests__/specs/errors-and-boundaries.spec.ts`.

- [DependencyNotFoundError.ts](..%2F..%2Flib%2Ferrors%2FDependencyNotFoundError.ts)
- [MethodNotImplementedError.ts](..%2F..%2Flib%2Ferrors%2FMethodNotImplementedError.ts)
- [DependencyMissingKeyError.ts](..%2F..%2Flib%2Ferrors%2FDependencyMissingKeyError.ts)
- [ContainerDisposedError.ts](..%2F..%2Flib%2Ferrors%2FContainerDisposedError.ts)
- [ArgumentNotFoundError.ts](..%2F..%2Flib%2Ferrors%2FArgumentNotFoundError.ts)
