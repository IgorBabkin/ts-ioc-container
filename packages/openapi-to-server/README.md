![NPM version:latest](https://img.shields.io/npm/v/@ibabkin/openapi-to-server/latest.svg?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/@ibabkin/openapi-to-server.svg?style=flat-square)
[![Coverage Status](https://coveralls.io/repos/github/IgorBabkin/ts-ioc-container/badge.svg?branch=master)](https://coveralls.io/github/IgorBabkin/ts-ioc-container?branch=master)
![License](https://img.shields.io/npm/l/@ibabkin/openapi-to-server)

## Description
Generates typescript interfaces for operations from OpenAPI 3.0 specification. Recommended to use with [@ibabkin/openapi-to-zod](https://www.npmjs.com/package/@ibabkin/openapi-to-zod)

## Usage

- supported version of OpenAPI: 3.0.0
- supports `yaml-import`
- `--json` - emit json file alongside with typescript file

```bash
openapi-to-server --input ./swagger.yaml --output ./operations.d.ts --json
```

```typescript

```typescript
import api from './swagger.json';
import { OpenAPIV3 } from 'openapi-types';
import { renderDocument } from '../lib';
import fs from 'fs';

fs.writeFileSync('./operations.d.ts', renderDocument(api as OpenAPIV3.Document));
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
    - paths.yaml

components:
  schemas:
    !!import/merge
      - components.yaml
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
