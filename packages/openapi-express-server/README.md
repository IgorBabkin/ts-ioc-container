# @ibabkin/openapi-express-server

Express.js server implementation for OpenAPI-generated interfaces from `@ibabkin/openapi-framework`.

## Features

- Automatically wire up Express routes from OpenAPI specifications
- Type-safe controller interfaces generated from OpenAPI spec
- Seamless integration with `@ibabkin/openapi-framework`
- Built-in request payload building (params, query, body, headers)
- Automatic response handling (status codes, headers, body)
- Error handling support

## Installation

```bash
npm install @ibabkin/openapi-express-server @ibabkin/openapi-framework express
# or
yarn add @ibabkin/openapi-express-server @ibabkin/openapi-framework express
```

## Quick Start

### 1. Define your OpenAPI spec (swagger.yaml)

```yaml
openapi: 3.0.0
info:
  title: Todo API
  version: 1.0.0
paths:
  /todos:
    get:
      tags:
        - todos
      operationId: getTodos
      responses:
        '200':
          description: List of todos
```

### 2. Generate TypeScript types (optional, for type safety)

```bash
npx @ibabkin/openapi-framework generate --input swagger.yaml --output types.d.ts
```

### 3. Implement controllers

```typescript
import { createServer } from '@ibabkin/openapi-express-server';
import { HttpStatus } from '@ibabkin/openapi-framework';

class TodosController {
  async getTodos(payload: any) {
    return {
      status: HttpStatus.OK,
      headers: {},
      body: [{ id: '1', title: 'Example todo' }],
    };
  }
}

const app = createServer({
  specPath: './swagger.yaml',
  server: {
    Todos: TodosController,
  },
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## API Reference

### `createServer(options)`

Creates an Express application with routes automatically registered from OpenAPI spec.

**Options:**
- `specPath?: string` - Path to OpenAPI YAML file
- `spec?: OpenAPIV3.Document` - OpenAPI document object (use if already loaded)
- `server: Record<string, any>` - Controller classes mapped by tag name
- `basePath?: string` - Base path for all routes (default: '')
- `errorHandler?: ErrorHandler` - Custom error handler

**Returns:** Express application instance

### Controller Methods

Controllers are classes with methods matching the `operationId` from your OpenAPI spec. Each method receives a `payload` object and returns a response object.

**Payload structure:**
```typescript
{
  params?: Record<string, any>;   // Path parameters
  query?: Record<string, any>;    // Query parameters
  body?: any;                     // Request body
  headers?: Record<string, any>;  // Request headers
}
```

**Response structure:**
```typescript
{
  status: HttpStatus;             // HTTP status code
  headers?: Record<string, any>;  // Response headers
  body?: any;                     // Response body (auto-serialized to JSON)
}
```

## How It Works

1. **Tag-based routing**: Operations are grouped by their first OpenAPI tag
2. **Controller mapping**: Each tag maps to a controller class (capitalized)
3. **Operation mapping**: Each `operationId` maps to a controller method
4. **Automatic payload extraction**: Request data is extracted into a typed payload
5. **Response handling**: Controller responses are automatically sent with correct status/headers

## Example

See the [example directory](./example) for a complete working example with a Todo API.

To run the example:

```bash
cd example
npx ts-node server.ts
```

Then test with curl:

```bash
# Get all todos
curl http://localhost:3000/todos

# Create a todo
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"New todo"}'

# Get specific todo
curl http://localhost:3000/todos/1

# Update todo
curl -X PUT http://localhost:3000/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# Delete todo
curl -X DELETE http://localhost:3000/todos/1
```

## Advanced Usage

### Custom Error Handler

```typescript
const app = createServer({
  specPath: './swagger.yaml',
  server: { Todos: TodosController },
  errorHandler: (error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: error.message });
  },
});
```

### Using with Generated Types

```typescript
import { ITodosController, GetTodosPayload, GetTodosResponse } from './types';

class TodosController implements ITodosController {
  async getTodos(payload: GetTodosPayload): Promise<GetTodosResponse> {
    // Fully type-safe implementation
    return {
      status: HttpStatus.OK,
      headers: {},
      body: [],
    };
  }
}
```

## License

ISC
