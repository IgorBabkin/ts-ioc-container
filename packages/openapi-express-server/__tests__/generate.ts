import { renderComponents, renderControllers, renderServer } from '@ibabkin/openapi-to-server-interface';
import { renderValidators } from '@ibabkin/openapi-to-request-validator';
import { OpenAPIV3 } from 'openapi-types';
import { read } from 'yaml-import';
import * as path from 'path';
import * as fs from 'fs';

const swaggerPath = path.resolve(__dirname, './swagger.yaml');
const doc = read(swaggerPath) as OpenAPIV3.Document;

// Generate TypeScript types
const components = renderComponents(doc);
const controllers = renderControllers(doc);
const server = renderServer(doc);
const typesOutput = components + '\n\n' + controllers + '\n\n' + server;
fs.writeFileSync(path.resolve(__dirname, './controller-interfaces.ts'), typesOutput);

// Generate Zod validators
const validators = renderValidators(doc);
fs.writeFileSync(path.resolve(__dirname, './validators.ts'), validators);
