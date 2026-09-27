import { renderComponents, renderServer } from '@ibabkin/openapi-to-server';
import { read } from 'yaml-import';
import { OpenAPIV3 } from 'openapi-types';
import fs from 'fs';

const doc = read('./swagger.yaml') as OpenAPIV3.Document;

// Generate TypeScript types
const components = renderComponents(doc);
const server = renderServer(doc);
fs.writeFileSync('./operations.d.ts', components + '\n\n' + server);
