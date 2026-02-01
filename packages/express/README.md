# @ts-ioc-container/express

Express middleware for [ts-ioc-container](https://github.com/IgorBabkin/ts-ioc-container) with automatic request-scoped container management.

## Installation

```bash
npm install @ts-ioc-container/express ts-ioc-container express
# or
pnpm add @ts-ioc-container/express ts-ioc-container express
# or
yarn add @ts-ioc-container/express ts-ioc-container express
```

## Quick Start

```typescript
import 'reflect-metadata';
import express from 'express';
import { Container } from 'ts-ioc-container';
import { containerMiddleware } from '@ts-ioc-container/express';

// Create root container
const rootContainer = new Container();

// Setup Express app
const app = express();

// Add container middleware
app.use(containerMiddleware(rootContainer));

// Use container in routes
app.get('/users', (req, res) => {
  const userService = req.container.resolve('IUserService');
  // ...
});
```

## Features

- **Automatic request-scoped containers**: Each request gets its own isolated container
- **Automatic disposal**: Containers are automatically disposed when requests complete
- **TypeScript support**: Full type safety with Express Request extension
- **Zero runtime dependencies**: Only peer dependencies required
- **Error-safe**: Handles both successful responses and error scenarios

## Usage

### Basic Setup

```typescript
import 'reflect-metadata';
import express from 'express';
import { Container, Registration as R } from 'ts-ioc-container';
import { containerMiddleware } from '@ts-ioc-container/express';

// Create root container with application-scoped services
const rootContainer = new Container({ tags: ['application'] })
  .addRegistration(
    R.fromClass(DatabasePool).bindTo('IDatabasePool').pipe(R.singleton()),
    R.fromClass(Logger).bindTo('ILogger').pipe(R.singleton()),
  );

const app = express();
app.use(express.json());

// Add container middleware
app.use(containerMiddleware(rootContainer));

app.listen(3000);
```

### Using in Route Handlers

```typescript
import type { Request, Response } from 'express';

app.get('/users', async (req: Request, res: Response) => {
  // Access request-scoped container
  const userRepo = req.container.resolve<IUserRepository>('IUserRepository');
  const users = await userRepo.findAll();
  res.json(users);
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
app.use(
  containerMiddleware(rootContainer, {
    tags: ['request', 'http'],
  }),
);
```

## API Reference

### `containerMiddleware(rootContainer, options?)`

Creates Express middleware that injects a request-scoped container for every request.

**Parameters:**

- `rootContainer: IContainer` - The root container to create request scopes from
- `options?: ContainerMiddlewareOptions` - Optional configuration

**Returns:**

Express middleware function `(req, res, next) => void`

**Options:**

```typescript
interface ContainerMiddlewareOptions {
  /**
   * Tags to apply to the request-scoped container.
   * Defaults to ['request'].
   */
  tags?: Tag[];
}
```

### Type Extensions

The package automatically extends the Express `Request` interface:

```typescript
declare global {
  namespace Express {
    interface Request {
      /**
       * Request-scoped container created from the root container.
       * This container is automatically disposed when the request completes.
       */
      container: IContainer;
    }
  }
}
```

## How It Works

1. **Request arrives**: Middleware creates a new request-scoped container from the root container
2. **Container attached**: The container is attached to `req.container`
3. **Request processing**: Your route handlers can use `req.container` to resolve dependencies
4. **Automatic cleanup**: When the response finishes or closes, the container is automatically disposed

The middleware handles:
- ✅ Successful responses (`res.on('finish')`)
- ✅ Error scenarios (`res.on('close')`)
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

- The middleware automatically disposes containers on request completion
- No manual cleanup required
- Containers are isolated per request, preventing memory leaks

### Testing

Test your routes with mock containers:

```typescript
import request from 'supertest';
import express from 'express';
import { Container, Registration as R } from 'ts-ioc-container';
import { containerMiddleware } from '@ts-ioc-container/express';

describe('Users API', () => {
  let app: express.Express;
  let mockContainer: IContainer;

  beforeEach(() => {
    const mockUserRepo = {
      findAll: jest.fn().mockResolvedValue([]),
    };

    mockContainer = new Container().addRegistration(
      R.fromValue(mockUserRepo).bindTo('IUserRepository'),
    );

    app = express();
    app.use(express.json());
    app.use(containerMiddleware(mockContainer));
    app.use('/api/users', usersRouter);
  });

  it('should return users', async () => {
    const response = await request(app).get('/api/users');
    expect(response.status).toBe(200);
  });
});
```

## License

ISC

## Related

- [ts-ioc-container](https://github.com/IgorBabkin/ts-ioc-container) - The core IoC container library
- [Documentation](https://igorbabkin.github.io/ts-ioc-container) - Full documentation and examples
