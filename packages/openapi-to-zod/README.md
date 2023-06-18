## Description
Generates validators for operation payloads from OpenAPI 3.0 specification using Zod.

## Usage

- supported version of OpenAPI: 3.0.0
- supports `yaml-import`

```bash
openapi-to-zod --input ./swagger.yaml --output ./validators.ts
```

```typescript
import { renderDocument } from '@ibabkin/openapi-to-zod';
fs.writeFileSync('.generated/output.ts', renderDocument(api as OpenAPIV3.Document));
```

Input example:

```yaml
openapi: 3.0.0
info:
  title: Simple Inventory API
  description: This is a simple API
  contact:
    email: you@your-company.com
  license:
    name: Apache 2.0
    url: http://www.apache.org/licenses/LICENSE-2.0.html
  version: 1.0.0
servers:
  - url: https://virtserver.swaggerhub.com/DOSAKANTIVENKATESH/smp/1.0.0
    description: SwaggerHub API Auto Mocking
tags:
  - name: admins
    description: Secured Admin-only calls
  - name: developers
    description: Operations available to regular developers
paths:
  !!import/merge
    - routes.yaml

components:
  schemas:
    !!import/merge
      - components.yaml
```

Output example:

```typescript
import { z } from "zod";

const zNumber = z.string().regex(/^\d+$/).transform(Number);

const zDate = z.preprocess((arg) => {
  if (typeof arg === "string" || typeof arg === "number") {
    return new Date(arg);
  }

  return arg;
}, z.date());

export const PAYLOADS = {
  searchInventory: z.object({
    query: z.object({
      searchString: z.string().optional(),
      skip: zNumber,
      limit: zNumber
    })
  }),
  addInventory: z.object({
    body: z.object({
      id: z.string(),
      name: z.string(),
      releaseDate: zDate
    })
  })
};
```
