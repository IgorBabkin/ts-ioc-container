import { Express } from 'express';
import { OpenAPIV3 } from 'openapi-types';
import { ExpressOpenAPIServer } from './ExpressOpenAPIServer';
import { OpenAPIServerConfig } from './types';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

export interface CreateServerOptions {
  specPath?: string;
  spec?: OpenAPIV3.Document;
  server: Record<string, any>;
  basePath?: string;
  errorHandler?: OpenAPIServerConfig['errorHandler'];
}

function loadYAML(filePath: string): OpenAPIV3.Document {
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.load(content) as OpenAPIV3.Document;
}

export function createServer(options: CreateServerOptions): Express {
  if (!options.spec && !options.specPath) {
    throw new Error('Either spec or specPath must be provided');
  }

  const spec = options.spec || (options.specPath ? loadYAML(options.specPath) : undefined);

  if (!spec) {
    throw new Error('Failed to load OpenAPI specification');
  }

  const serverInstance = new ExpressOpenAPIServer({
    spec,
    controllers: options.server,
    basePath: options.basePath,
    errorHandler: options.errorHandler,
  });

  return serverInstance.getApp();
}
