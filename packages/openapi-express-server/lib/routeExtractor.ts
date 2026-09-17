import { OpenAPIV3 } from 'openapi-types';
import { RouteMetadata } from './types.js';

export function extractRoutes(spec: OpenAPIV3.Document): RouteMetadata[] {
  const routes: RouteMetadata[] = [];

  if (!spec.paths) {
    return routes;
  }

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem) continue;

    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

    for (const method of methods) {
      const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;

      if (!operation || !operation.operationId) {
        continue;
      }

      routes.push({
        path,
        method: method.toUpperCase(),
        operationId: operation.operationId,
        // Tags name nothing; they are attached to the request scope verbatim (SPEC-007 UC-5/UC-6).
        tags: operation.tags ?? [],
      });
    }
  }

  return routes;
}

export function convertOpenAPIPathToExpress(openApiPath: string): string {
  return openApiPath.replace(/{([^}]+)}/g, ':$1');
}
