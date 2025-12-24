import { renderComponents, renderControllers, renderServer } from '@ibabkin/openapi-to-server-interface';
import { read } from 'yaml-import';
import { OpenAPIV3 } from 'openapi-types';
import fs from 'fs';

const doc = read('./swagger.yaml') as OpenAPIV3.Document;

// Generate TypeScript types
const components = renderComponents(doc);
const controllers = renderControllers(doc);
const server = renderServer(doc);
const output = components + '\n\n' + controllers + '\n\n' + server;
fs.writeFileSync('./controller-interfaces.d.ts', output);
