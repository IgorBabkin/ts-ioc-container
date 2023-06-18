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
