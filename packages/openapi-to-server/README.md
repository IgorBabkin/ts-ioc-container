# @ibabkin/openapi-to-server

Generates TypeScript server interfaces from OpenAPI 3.0 specifications. This package converts OpenAPI/Swagger specs into type-safe TypeScript interfaces for server implementations, including component types, controller interfaces, and server contracts.

## Features

- ✅ Generate TypeScript interfaces from OpenAPI 3.0 specifications
- ✅ Support for both YAML and JSON OpenAPI files
- ✅ Type-safe component schemas, routes, and operations
- ✅ Controller interfaces grouped by tags
- ✅ Server interface with dependency injection support
- ✅ Request payload types (params, query, body)
- ✅ Response types with HTTP status codes and headers
- ✅ Axios-based `ApiClient` generation for the browser/Node
- ✅ `openapi-to-server` and `openapi-to-client` CLIs
- ✅ YAML import support for modular specs

## Installation

```bash
pnpm add @ibabkin/openapi-to-server
# or
npm install @ibabkin/openapi-to-server
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

The quickest way is the CLI. `--json` additionally writes the parsed spec as `swagger.json` next to the output, handy for
registering routes at runtime:

```bash
openapi-to-server --input src/swagger.yaml --output src/.generated/operations.d.ts --json
openapi-to-client --input src/swagger.yaml --output src/.generated/client.ts
```

The same is available programmatically:

```typescript
import { openapiToServer, openapiToClient } from '@ibabkin/openapi-to-server';

openapiToServer({ inputFile: 'src/swagger.yaml', outputFile: 'src/.generated/operations.d.ts', emitJSON: true });
openapiToClient({ inputFile: 'src/swagger.yaml', outputFile: 'src/.generated/client.ts' });
```

Or render the individual parts yourself:

```typescript
import { renderComponents, renderControllers, renderServer } from '@ibabkin/openapi-to-server';
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

### CLI

| Command | Flags | Output |
| --- | --- | --- |
| `openapi-to-server` | `--input <spec>` `--output <file>` `[--json]` | Components, controller interfaces and `IServer` in one file; with `--json`, the parsed spec as `<spec-name>.json` beside it |
| `openapi-to-client` | `--input <spec>` `--output <file>` | Component types, payload/response types and an Axios `ApiClient` class |

`--input` accepts `.yaml`/`.yml` (with `yaml-import` directives) or `.json`. Short flags `-i`, `-o`, `-j` work too.

### File Functions

#### `openapiToServer({ inputFile, outputFile, emitJSON? })`

Reads the spec, renders components + controllers + server and writes them to `outputFile` (directories are created).
With `emitJSON: true` and a YAML input, also writes the parsed document as JSON next to `outputFile`.

#### `openapiToClient({ inputFile, outputFile })`

Reads the spec and writes the generated `ApiClient` to `outputFile`.

### Render Functions

The package provides four render functions that return TypeScript source as a string:

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

#### `renderClient(doc)`

Generates component types, payload/response types and an Axios-based `ApiClient` class. The generated file imports
`createUrl` from this package at runtime, so `@ibabkin/openapi-to-server` must be a regular dependency of the consumer.

**Parameters:**
- `doc: OpenAPIV3.Document` - OpenAPI 3.0 document object

**Returns:** `string` - TypeScript code containing the client

```typescript
import axios from 'axios';
import { ApiClient } from './.generated/client';

const api = new ApiClient(axios.create({ baseURL: 'https://api.example.com' }));
const todos = await api.getTodos({ query: { limit: 10 } });
```

#### Example

```typescript
import { 
  renderComponents, 
  renderControllers, 
  renderServer 
} from '@ibabkin/openapi-to-server';
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
} from '@ibabkin/openapi-to-server';
```

- **`Route<Payload, Response>`**: Interface for route handlers
- **`HttpResponse`**: Response interface with status, headers, and body
- **`HttpStatus`**: Enum of HTTP status codes (OK, Created, NoContent, Found)
- **`RouteOptions`**: Options for routes (tags)
- **`constructor<T>`**: Type helper for class constructors

### Runtime Helpers

Used by the generated client, but useful on their own:

```typescript
import { createUrl, addPathParams, addQueryParams, Payload } from '@ibabkin/openapi-to-server';

createUrl('/users/{id}', { params: { id: 1 }, query: { expand: 'posts' } }); // '/users/1?expand=posts'
```

`null`/`undefined` values are skipped; keys and values are URL-encoded.

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

## Controller Naming

An operation belongs to the controller derived from its **first** tag; the remaining tags do not
affect naming. Tags are free text in OpenAPI, so they are normalised into a TypeScript identifier
before being used as an interface name or an object key — the tag is cut at the first character
that is illegal in an identifier, and only that first word names the controller:

| Tag | Controller interface | `IServer` key |
| --- | --- | --- |
| `items` | `IItemsController` | `Items` |
| `Network Health` | `INetworkController` | `Network` |
| `station-groups` | `IStationController` | `Station` |
| `v1/admin` | `IV1Controller` | `V1` |

Because truncation is lossy, two tags sharing a first word share one controller — `Network Health`
and `network-status` both land on `INetworkController`. Rename the tag on the contract side when
they should be separate. The same helper is exported as `toIdentifier`, and
`@ibabkin/openapi-express-server` uses it to build the DI lookup key, so the key you register a
controller under always matches the generated `IServer` key.

See [SPEC-001](../../specs/SPEC-001-controller-naming.md) for the full rules.

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

- [`@ibabkin/openapi-to-zod`](../openapi-to-request-validator): Generate Zod validation schemas from OpenAPI specs
- [`@ibabkin/openapi-express-server`](../openapi-express-server): Express.js server implementation using generated interfaces

## License

ISC

