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

      const tags = operation.tags || [];
      const firstTag = tags[0];

      if (!firstTag) {
        console.warn(`Operation ${operation.operationId} has no tags, skipping`);
        continue;
      }

      const controllerName = capitalizeFirst(firstTag);
      const methodName = operation.operationId;

      routes.push({
        path,
        method: method.toUpperCase(),
        operationId: operation.operationId,
        tags,
        controllerName,
        methodName,
      });
    }
  }

  return routes;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function convertOpenAPIPathToExpress(openApiPath: string): string {
  return openApiPath.replace(/{([^}]+)}/g, ':$1');
}
