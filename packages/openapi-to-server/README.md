## Description
Generates typescript interfaces for operations from OpenAPI 3.0 specification.

## Usage

- supported version of OpenAPI: 3.0.0

```bash
openapi-to-server --input ./swagger.json --output ./operations.d.ts
```

```typescript
import api from './swagger.json';
import { OpenAPIV3 } from 'openapi-types';
import { renderDocument } from '../lib';
import fs from 'fs';

fs.writeFileSync('./operations.d.ts', renderDocument(api as OpenAPIV3.Document));
```

Output example:

```typescript
export type SearchInventoryPayload = {
  query: {
    searchString?: string,
    skip: number,
    limit: number,
  }
};

export type SearchInventoryResponse = InventoryItem[]

export type Operations = {
  searchInventory: IRoute<SearchInventoryPayload, Ok<SearchInventoryResponse>>;
}
```
