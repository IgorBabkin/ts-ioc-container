import { renderComponents, renderServer } from '@ibabkin/openapi-to-server';
import { renderValidators } from '@ibabkin/openapi-to-zod';
import { OpenAPIV3 } from 'openapi-types';
import { read } from 'yaml-import';
import * as path from 'path';
import * as fs from 'fs';

const swaggerPath = path.resolve(import.meta.dirname, './swagger.yaml');
const doc = read(swaggerPath) as OpenAPIV3.Document;

// Generate TypeScript types
const components = renderComponents(doc);
const server = renderServer(doc);
fs.writeFileSync(path.resolve(import.meta.dirname, './operations.ts'), components + '\n\n' + server);

// Generate Zod validators
const validators = renderValidators(doc);
fs.writeFileSync(path.resolve(import.meta.dirname, './validators.ts'), validators);
