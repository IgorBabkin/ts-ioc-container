# @ibabkin/openapi-to-server-interface

Generates TypeScript server interfaces from OpenAPI 3.0 specifications. This package converts OpenAPI/Swagger specs into type-safe TypeScript interfaces for server implementations, including component types, controller interfaces, and server contracts.

## Features

- ✅ Generate TypeScript interfaces from OpenAPI 3.0 specifications
- ✅ Support for both YAML and JSON OpenAPI files
- ✅ Type-safe component schemas, routes, and operations
- ✅ Controller interfaces grouped by tags
- ✅ Server interface with dependency injection support
- ✅ Request payload types (params, query, body)
- ✅ Response types with HTTP status codes and headers
- ✅ YAML import support for modular specs

## Installation

```bash
pnpm add @ibabkin/openapi-to-server-interface
# or
npm install @ibabkin/openapi-to-server-interface
```

## Quick Start

### 1. Define your OpenAPI specification

```yaml
# swagger.yaml
openapi: 3.0.3
info:
  title: Todo API
  version: 1.0.0

paths:
  /todos:
    get:
      operationId: getTodos
      tags:
        - Todos
      responses:
        '200':
          description: List of todos
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Todo'

    post:
      operationId: createTodo
      tags:
        - Todos
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTodoPayload'
      responses:
        '201':
          description: Todo created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Todo'

components:
  schemas:
    Todo:
      type: object
      required:
        - id
        - title
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string

    CreateTodoPayload:
      type: object
      required:
        - title
      properties:
        title:
          type: string
```

### 2. Generate TypeScript interfaces

Load your OpenAPI specification and generate interfaces:

```typescript
import { renderComponents, renderControllers, renderServer } from '@ibabkin/openapi-to-server-interface';
import { OpenAPIV3 } from 'openapi-types';
import { read } from 'yaml-import'; // or use js-yaml, json-loader, etc.
import fs from 'fs';
import path from 'path';

// Load your OpenAPI spec (using yaml-import for example)
const doc: OpenAPIV3.Document = read(path.resolve(__dirname, './swagger.yaml'));

// Generate interface code
const components = renderComponents(doc);
const controllers = renderControllers(doc);
const server = renderServer(doc);

// Combine and write to file
const output = components + '\n\n' + controllers + '\n\n' + server;
fs.writeFileSync(path.resolve(__dirname, './server-interfaces.ts'), output);
```

### 3. Use the generated interfaces

The generated file will contain:

**Components** - Type definitions from your schemas:
```typescript
export type Todo = {
  id: string;
  title: string;
};

export type CreateTodoPayload = {
  title: string;
};
```

**Route Types** - Type-safe route handlers:
```typescript
export interface GetTodosRoute extends Route<GetTodosPayload, GetTodosResponse> {}

export interface CreateTodoRoute extends Route<CreateTodoPayload, CreateTodoResponse> {}
```

**Controller Interfaces** - Grouped by tags:
```typescript
export interface TodosController {
  getTodos(payload: GetTodosPayload): Promise<GetTodosResponse>;
  createTodo(payload: CreateTodoPayload): Promise<CreateTodoResponse>;
}
```

**Server Interface** - For dependency injection:
```typescript
export interface IServer {
  Todos: constructor<TodosController>;
}
```

## API Reference

### Render Functions

The package provides three render functions to generate TypeScript interfaces:

#### `renderComponents(doc)`

Generates TypeScript type definitions from `components.schemas` and route-related types.

**Parameters:**
- `doc: OpenAPIV3.Document` - OpenAPI 3.0 document object

**Returns:** `string` - TypeScript code containing component types and route types

#### `renderControllers(doc)`

Generates controller interfaces grouped by OpenAPI tags.

**Parameters:**
- `doc: OpenAPIV3.Document` - OpenAPI 3.0 document object

**Returns:** `string` - TypeScript code containing controller interfaces

#### `renderServer(doc)`

Generates the `IServer` interface for dependency injection.

**Parameters:**
- `doc: OpenAPIV3.Document` - OpenAPI 3.0 document object

**Returns:** `string` - TypeScript code containing the IServer interface

#### Example

```typescript
import { 
  renderComponents, 
  renderControllers, 
  renderServer 
} from '@ibabkin/openapi-to-server-interface';
import { OpenAPIV3 } from 'openapi-types';
import { read } from 'yaml-import';
import fs from 'fs';

const doc: OpenAPIV3.Document = read('./swagger.yaml');

const components = renderComponents(doc);
const controllers = renderControllers(doc);
const server = renderServer(doc);

// Combine and write to file
const output = components + '\n\n' + controllers + '\n\n' + server;
fs.writeFileSync('./server-interfaces.ts', output);
```

### Exported Types

The package exports several utility types:

```typescript
import { 
  Route, 
  HttpResponse, 
  HttpStatus, 
  RouteOptions,
  constructor 
} from '@ibabkin/openapi-to-server-interface';
```

- **`Route<Payload, Response>`**: Interface for route handlers
- **`HttpResponse`**: Response interface with status, headers, and body
- **`HttpStatus`**: Enum of HTTP status codes (OK, Created, NoContent, Found)
- **`RouteOptions`**: Options for routes (tags)
- **`constructor<T>`**: Type helper for class constructors

## Generated Output Structure

The generated file contains three main sections:

1. **Components Section**:
   - Type definitions from `components.schemas`
   - Route type interfaces
   - Operations type mapping
   - RoutesPayloads type mapping
   - RequestContext interface

2. **Controllers Section**:
   - Controller interfaces grouped by OpenAPI tags
   - Each controller has methods corresponding to operations with that tag

3. **Server Section**:
   - `IServer` interface mapping tags to controller constructors
   - Designed for use with dependency injection containers

## YAML Import Support

The package supports `yaml-import` syntax for modular OpenAPI specifications:

```yaml
paths:
  !!import/merge
    - paths.yaml
components:
  schemas:
    !!import/merge
      - components.yaml
```

## Usage with Dependency Injection

The generated `IServer` interface is designed to work with dependency injection:

```typescript
import { IServer, constructor } from './server-interfaces';

class TodosController implements TodosController {
  async getTodos(payload: GetTodosPayload): Promise<GetTodosResponse> {
    // Implementation
  }
  
  async createTodo(payload: CreateTodoPayload): Promise<CreateTodoResponse> {
    // Implementation
  }
}

// Register with DI container
const server: IServer = {
  Todos: TodosController
};
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Watching for Changes

```bash
npm run watch
```

## Related Packages

- [`@ibabkin/openapi-to-request-validator`](../openapi-to-zod-payloads): Generate Zod validation schemas from OpenAPI specs
- [`@ibabkin/openapi-express-server`](../openapi-express-server): Express.js server implementation using generated interfaces

## License

ISC

