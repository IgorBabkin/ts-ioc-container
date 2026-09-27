# @ibabkin/openapi-to-zod — guide for AI coding agents

This file ships inside the npm package, so it matches the version installed in `node_modules`.
**Trust it over what you remember**. More detail, including the full OpenAPI → Zod mapping table:
`README.md` next to this file. Types: `esm/*.d.ts`.

Sibling packages, used together with this one:

- `@ibabkin/openapi-to-server` — TypeScript types, one `<Op>HttpRoute` per operation, `IServer`
- `@ibabkin/openapi-express-server` — Express + `ts-ioc-container` runtime glue

## What it generates

One TypeScript file (Zod 4, `zod` is a **peer dependency**) from an OpenAPI **3.0** document
(3.1 `type: [T, 'null']` and numeric `exclusiveMinimum` are accepted too):

- `export const <Schema> = z.object({ ... })` for every `components.schemas` entry, declared in
  dependency order; cyclic references become getters or `z.lazy(...)`
- `export const PAYLOADS = { <operationId>: z.object({ query?, params?, body? }) }` — keyed by
  `operationId` **verbatim**, the same key as `IServer` in `@ibabkin/openapi-to-server`

`PAYLOADS[operationId].parse(req)` is meant to run on the **Express `Request` itself**: Zod strips
every other key, so the result is exactly the generated `<Op>Payload` type (SPEC-003 RP-6).

## Recipes

### Generate

```bash
pnpm add @ibabkin/openapi-to-zod zod
openapi-to-zod --input src/swagger.yaml --output src/.generated/validators.ts
```

```typescript
import { openapiToZod, renderValidators } from '@ibabkin/openapi-to-zod';

openapiToZod({ inputFile: 'src/swagger.yaml', outputFile: 'src/.generated/validators.ts' });
const source: string = renderValidators(doc); // doc: OpenAPIV3.Document
```

Short flags: `-i`, `-o`. YAML may use `yaml-import` directives (`!!import/merge`).

### Validate a request

```typescript
import { PAYLOADS } from './.generated/validators';

app.put('/todos/:id', async (req, res, next) => {
  try {
    const payload = PAYLOADS.updateTodo.parse(req); // throws ZodError -> map to 400 in error middleware
    // payload: { params: { id: number }, query: { dryRun?: boolean }, body: Todo }
  } catch (error) {
    next(error);
  }
});
```

With `@ibabkin/openapi-express-server`, pass the whole `PAYLOADS` map to the route builder instead
of wiring routes by hand.

## Coercion

- `integer` / `number` are wrapped in `zNumber(...)`, which turns numeric strings into numbers, so
  path and query numbers work.
- `format: date-time` becomes `zDate`, which turns strings and numbers into `Date`.
- Nothing else is coerced.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `?flag=true` fails with "expected boolean" | Query/path booleans are not coerced; Express passes `'true'` | Declare the parameter as `type: string, enum: ['true', 'false']`, or preprocess before parsing |
| `?tag=a` fails for an `array` query parameter | Express passes a single value as a string, not an array | Send the parameter at least twice, or preprocess before parsing |
| `PAYLOADS` has an entry with an empty key and does not compile | An operation has no `operationId` | Give every operation an `operationId` |
| A path parameter is not validated | Parameters declared on the path item, or via `$ref`, are ignored | Declare every parameter inline on the operation |
| No validator for a `patch` / `head` / `options` operation | Only `get`, `post`, `put`, `delete` are generated (SPEC-004) | Use one of the four methods |
| A request header is not in the parsed payload | `in: header` / `in: cookie` parameters are not part of the payload | Read headers from the request |
| `body` is required although `requestBody.required` is false | `body` is always required; only `application/json` is read | Model optionality inside the body schema |
| Unknown keys vanish from a body object | Zod strips unknown keys by default | `additionalProperties: true` renders `.passthrough()` |
| Types from `@ibabkin/openapi-to-server` and the parsed value disagree | The two files were generated from different specs | Regenerate both from the same spec in one script |

## Exports

`openapiToZod`, `renderValidators`, type `OpenapiToZodOptions`.

## Errors

| Message | Fix |
| --- | --- |
| `openapi file path is required (--input)` | Pass `--input <spec>` |
| `output file path is required (--output)` | Pass `--output <file>` |
