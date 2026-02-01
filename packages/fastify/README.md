# @ts-ioc-container/fastify

Fastify plugin for [ts-ioc-container](https://github.com/IgorBabkin/ts-ioc-container) with automatic request-scoped container management.

## Installation

```bash
npm install @ts-ioc-container/fastify ts-ioc-container fastify
# or
pnpm add @ts-ioc-container/fastify ts-ioc-container fastify
# or
yarn add @ts-ioc-container/fastify ts-ioc-container fastify
```

## Quick Start

```typescript
import 'reflect-metadata';
import fastify from 'fastify';
import { Container } from 'ts-ioc-container';
import { containerPlugin } from '@ts-ioc-container/fastify';

// Create root container
const rootContainer = new Container();

// Setup Fastify app
const app = fastify();

// Register container plugin
await app.register(containerPlugin(rootContainer));

// Use container in routes
app.get('/users', async (request, reply) => {
  const userService = request.container.resolve('IUserService');
  // ...
});
```

## Features

- **Automatic request-scoped containers**: Each request gets its own isolated container
- **Automatic disposal**: Containers are automatically disposed when requests complete
- **TypeScript support**: Full type safety with Fastify Request extension
- **Zero runtime dependencies**: Only peer dependencies required
- **Error-safe**: Handles both successful responses and error scenarios

## Usage

### Basic Setup

```typescript
import 'reflect-metadata';
import fastify from 'fastify';
import { Container, Registration as R } from 'ts-ioc-container';
import { containerPlugin } from '@ts-ioc-container/fastify';

// Create root container with application-scoped services
const rootContainer = new Container({ tags: ['application'] })
  .addRegistration(
    R.fromClass(DatabasePool).bindTo('IDatabasePool').pipe(R.singleton()),
    R.fromClass(Logger).bindTo('ILogger').pipe(R.singleton()),
  );

const app = fastify();

// Register container plugin
await app.register(containerPlugin(rootContainer));

await app.listen({ port: 3000 });
```

### Using in Route Handlers

```typescript
app.get('/users', async (request, reply) => {
  // Access request-scoped container
  const userRepo = request.container.resolve<IUserRepository>('IUserRepository');
  const users = await userRepo.findAll();
  return users;
});
```

### Request-Scoped Services

Register services that should be created per-request:

```typescript
import { Container, Registration as R, scope } from 'ts-ioc-container';

const rootContainer = new Container()
  .addRegistration(
    // Application-scoped (singleton)
    R.fromClass(DatabasePool)
      .bindTo('IDatabasePool')
      .pipe(R.singleton()),

    // Request-scoped (new instance per request)
    R.fromClass(UserRepository)
      .bindTo('IUserRepository')
      .pipe(R.scope((c) => c.hasTag('request')))
      .pipe(R.singleton()),
  );
```

### Custom Tags

You can customize the tags applied to request containers:

```typescript
await app.register(
  containerPlugin(rootContainer, {
    tags: ['request', 'http'],
  }),
);
```

## API Reference

### `containerPlugin(rootContainer, options?)`

Creates a Fastify plugin that injects a request-scoped container for every request.

**Parameters:**

- `rootContainer: IContainer` - The root container to create request scopes from
- `options?: ContainerPluginOptions` - Optional configuration

**Returns:**

Fastify plugin function that can be registered with `app.register()`

**Options:**

```typescript
interface ContainerPluginOptions {
  /**
   * Tags to apply to the request-scoped container.
   * Defaults to ['request'].
   */
  tags?: Tag[];
}
```

### Type Extensions

The package automatically extends the Fastify `FastifyRequest` interface:

```typescript
declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Request-scoped container created from the root container.
     * This container is automatically disposed when the request completes.
     */
    container: IContainer;
  }
}
```

## How It Works

1. **Request arrives**: Plugin creates a new request-scoped container from the root container via `onRequest` hook
2. **Container attached**: The container is attached to `request.container`
3. **Request processing**: Your route handlers can use `request.container` to resolve dependencies
4. **Automatic cleanup**: When the response is sent (`onResponse` hook) or an error occurs (`onError` hook), the container is automatically disposed

The plugin handles:
- ✅ Successful responses (`onResponse` hook)
- ✅ Error scenarios (`onError` hook)
- ✅ Double-disposal prevention
- ✅ Container isolation between requests

## Best Practices

### Scope Naming Convention

| Scope | Tag | Use Case |
|-------|-----|----------|
| Application | `application` | Global singletons (pools, config, loggers) |
| Request | `request` | Per-request services (context, repos) |
| Transaction | `transaction` | Database transaction boundaries |

### Memory Management

- The plugin automatically disposes containers on request completion
- No manual cleanup required
- Containers are isolated per request, preventing memory leaks

### Testing

Test your routes with mock containers:

```typescript
import { fastify } from 'fastify';
import { Container, Registration as R } from 'ts-ioc-container';
import { containerPlugin } from '@ts-ioc-container/fastify';

describe('Users API', () => {
  let app: FastifyInstance;
  let mockContainer: IContainer;

  beforeEach(async () => {
    const mockUserRepo = {
      findAll: jest.fn().mockResolvedValue([]),
    };

    mockContainer = new Container().addRegistration(
      R.fromValue(mockUserRepo).bindTo('IUserRepository'),
    );

    app = fastify();
    await app.register(containerPlugin(mockContainer));
    app.get('/api/users', usersHandler);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return users', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users',
    });
    expect(response.statusCode).toBe(200);
  });
});
```

## License

ISC

## Related

- [ts-ioc-container](https://github.com/IgorBabkin/ts-ioc-container) - The core IoC container library
- [Documentation](https://igorbabkin.github.io/ts-ioc-container) - Full documentation and examples
