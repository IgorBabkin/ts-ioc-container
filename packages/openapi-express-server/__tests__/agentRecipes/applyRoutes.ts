import { type Express } from 'express';
import type { OpenAPIV3 } from 'openapi-types';
import { type IContainer } from 'ts-ioc-container';
import { type ZodType } from 'zod';
import {
  containerMiddleware,
  convertOpenAPIPathToExpress,
  extractRoutes,
  getContainerOrFail,
  type HttpRouteInstance,
} from '../../lib';

// Verbatim copy of the "Wire every operation" recipe in AGENTS.md; agentGuides.spec.ts keeps them identical.
// region recipe
export function applyRoutes(
  app: Express,
  container: IContainer,
  doc: OpenAPIV3.Document,
  validators: Record<string, ZodType>,
) {
  for (const route of extractRoutes(doc)) {
    if (!container.hasRegistration(route.operationId)) continue; // not implemented yet
    const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
    const requestScope = containerMiddleware(container, route.tags);
    app[method](convertOpenAPIPathToExpress(route.path), requestScope, async (req, res, next) => {
      try {
        const scope = getContainerOrFail(req);
        const useCase = scope.resolve<HttpRouteInstance>(route.operationId);
        const payload = validators[route.operationId].parse(req);
        const { status = 200, headers = {}, body } = await useCase.handle(payload, scope);
        res.status(status).set(headers);
        if (body === undefined) res.end();
        else res.json(body);
      } catch (error) {
        next(error);
      }
    });
  }
}
// endregion recipe
