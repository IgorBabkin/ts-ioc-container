import express, { type NextFunction, type Request, type Response } from 'express';
import type { Server } from 'http';
import type { OpenAPIV3 } from 'openapi-types';
import { by, type IContainer, inject, register, scope, select, singleton, SingleToken } from 'ts-ioc-container';
import { ZodError, type ZodType } from 'zod';
import {
  containerMiddleware,
  convertOpenAPIPathToExpress,
  extractRoutes,
  getContainerOrFail,
  type HttpRouteInstance,
  type RouteMetadata,
} from '../../lib';

// Verbatim copy of the "Wire every operation" recipe in AGENTS.md; agentGuides.spec.ts keeps them identical.
// region recipe
export interface IAppService {
  applyRoutes(doc: OpenAPIV3.Document, payloadValidators: Record<string, ZodType>): void;
  start(port: number): Server;
}
export const IAppServiceToken = new SingleToken<IAppService>('IAppService');

@register(IAppServiceToken, scope((s) => s.hasTag('application')), singleton())
export class AppService implements IAppService {
  private readonly app = express().use(express.json());

  constructor(@inject(by(select.scope.current)) private readonly appScope: IContainer) {}

  applyRoutes(doc: OpenAPIV3.Document, payloadValidators: Record<string, ZodType>): void {
    for (const route of extractRoutes(doc)) {
      if (!this.appScope.hasRegistration(route.operationId)) continue; // not implemented yet
      const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
      const path = convertOpenAPIPathToExpress(route.path);
      const validator = payloadValidators[route.operationId];
      this.app[method](path, containerMiddleware(this.appScope, route.tags), (req, res, next) =>
        this.handle(route, validator, req, res, next),
      );
    }
    // Express recognises an error handler by its four parameters, so it must come after the routes.
    this.app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
      res.status(error instanceof ZodError ? 400 : 500).json({ error: error.message });
    });
  }

  start(port: number): Server {
    return this.app.listen(port);
  }

  private async handle(
    route: RouteMetadata,
    validator: ZodType,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const requestScope = getContainerOrFail(req);
      const useCase = requestScope.resolve<HttpRouteInstance>(route.operationId);
      const payload = validator.parse(req);
      const { status = 200, headers = {}, body } = await useCase.handle(payload, requestScope);
      res.status(status).set(headers);
      if (body === undefined) res.end();
      else res.json(body);
    } catch (error) {
      next(error);
    }
  }
}
// endregion recipe
