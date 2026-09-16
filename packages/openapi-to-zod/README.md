# @ibabkin/openapi-to-zod

Generates Zod validation schemas from OpenAPI 3.0 specifications. Automatically creates type-safe request validators for path parameters, query parameters, and request bodies based on your OpenAPI spec.

## Features

- 🔍 **Automatic Schema Generation**: Generates Zod schemas from OpenAPI `components.schemas`
- 📦 **Payload Validators**: Creates validators for each API operation with params, query, and body validation
- 🎯 **Type Safety**: Works seamlessly with TypeScript for end-to-end type safety
- 📝 **OpenAPI 3.0 Support**: Full support for OpenAPI 3.0 specification
- 🔄 **JSON & YAML**: Supports both JSON and YAML OpenAPI specifications
- 🛠️ **Special Type Handling**: Automatic handling for numbers, dates, and optional fields

## Installation

```bash
pnpm add @ibabkin/openapi-to-zod zod
# or
npm install @ibabkin/openapi-to-zod zod
```

**Note:** `zod` is a peer dependency and must be installed separately.

## Quick Start

### 1. Define your OpenAPI spec (swagger.yaml)

```yaml
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: page
          in: query
          schema:
            type: integer
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: List of users
  /users/{id}:
    get:
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: User details
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: string
```

### 2. Generate Validators

Load your OpenAPI specification and generate validators:

```typescript
import { renderValidators } from '@ibabkin/openapi-to-zod';
import { OpenAPIV3 } from 'openapi-types';
import { read } from 'yaml-import'; // or use js-yaml, json-loader, etc.
import fs from 'fs';
import path from 'path';

// Load your OpenAPI spec (using yaml-import for example)
const doc: OpenAPIV3.Document = read(path.resolve(__dirname, './swagger.yaml'));

// Generate validators code
const validatorsCode = renderValidators(doc);

// Write to file
fs.writeFileSync(path.resolve(__dirname, './validators.ts'), validatorsCode);
```

### 3. Use Generated Validators

The generated file will contain:

```typescript
import { z } from 'zod';

// Schema validators from components.schemas
export const User = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

// Operation payload validators
export const PAYLOADS = {
  getUsers: z.object({
    query: z
      .object({
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
      })
      .optional(),
  }),
  getUser: z.object({
    params: z.object({
      id: z.string(),
    }),
  }),
};
```

Use them in your application:

```typescript
import { PAYLOADS } from './validators';

// Validate request payload
const result = PAYLOADS.getUsers.safeParse({
  query: { page: '1', limit: '10' },
});

if (result.success) {
  // result.data.query.page is a number (automatically transformed)
  // result.data.query.limit is a number (automatically transformed)
  console.log(result.data);
} else {
  console.error(result.error);
}
```

## API Reference

### `renderValidators(doc)`

Generates Zod validators code as a string from an OpenAPI document object.

**Parameters:**

- `doc: OpenAPIV3.Document` - OpenAPI 3.0 document object

**Returns:** `string` - TypeScript code containing Zod validators

**Example:**

```typescript
import { renderValidators } from '@ibabkin/openapi-to-zod';
import { OpenAPIV3 } from 'openapi-types';

const doc: OpenAPIV3.Document = {
  /* ... */
};
const code = renderValidators(doc);
```

## Generated Output Structure

The generated validators file includes:

1. **Schema Exports**: Each schema defined in `components.schemas` is exported as a Zod schema

   ```typescript
   export const User = z.object({
     /* ... */
   });
   export const CreateUserRequest = z.object({
     /* ... */
   });
   ```

2. **PAYLOADS Object**: A single export containing validators for all operations, keyed by `operationId`
   ```typescript
   export const PAYLOADS = {
     operationId1: z.object({
       params: z.object({
         /* path params */
       }),
       query: z.object({
         /* query params */
       }),
       body: z.object({
         /* request body */
       }),
     }),
     // ...
   };
   ```

## Type Handling

### Numbers

Query parameters and path parameters are automatically converted from strings to numbers using a regex transformation:

```typescript
const zNumber = z.string().regex(/^\d+$/).transform(Number);
```

### Dates

Date strings are automatically converted to Date objects:

```typescript
const zDate = z.preprocess((arg) => {
  if (typeof arg === 'string' || typeof arg === 'number') {
    return new Date(arg);
  }
  return arg;
}, z.date());
```

### Optional Fields

Object properties not listed in `required`, and parameters without `required: true`, are marked optional with `.optional()`.

### String Constraints

`enum` becomes `z.enum([...])`, `format: email` adds `.email()`, and `minLength`/`maxLength` add `.min()`/`.max()`.

## Integration with Express

This package works seamlessly with `@ibabkin/openapi-express-server`. The generated `PAYLOADS` map is keyed by
`operationId`, so it can be handed straight to a route builder:

```typescript
import { PAYLOADS } from './validators';

const routeBuilder = container.resolve(RouteBuilder, { args: [spec, PAYLOADS] });
routeBuilder.applyTo(app);
```

See `packages/openapi-express-server/__tests__/RouteBuilder.ts` for a reference implementation.

## Building from Source

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Watch mode for development
pnpm watch
```

## License

ISC
