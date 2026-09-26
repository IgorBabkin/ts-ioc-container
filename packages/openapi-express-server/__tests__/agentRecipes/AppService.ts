import { type Express, type NextFunction, type Request, type Response } from 'express';
import type { OpenAPIV3 } from 'openapi-types';
import { by, type IContainer, inject, register, scope, select, singleton, SingleToken } from 'ts-ioc-container';
import { type ZodType } from 'zod';
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
export const IExpressAppToken = new SingleToken<Express>('IExpressApp');
export const IPayloadsToken = new SingleToken<Record<string, ZodType>>('IPayloads');

export interface IAppService {
  applyRoutes(doc: OpenAPIV3.Document): void;
}
export const IAppServiceToken = new SingleToken<IAppService>('IAppService');

@register(IAppServiceToken, scope((s) => s.hasTag('application')), singleton())
export class AppService implements IAppService {
  constructor(
    @inject(by(select.scope.current)) private readonly appScope: IContainer,
    @inject(by(IExpressAppToken)) private readonly app: Express,
    @inject(by(IPayloadsToken)) private readonly payloads: Record<string, ZodType>,
  ) {}

  applyRoutes(doc: OpenAPIV3.Document): void {
    for (const route of extractRoutes(doc)) {
      if (!this.appScope.hasRegistration(route.operationId)) continue; // not implemented yet
      const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
      const path = convertOpenAPIPathToExpress(route.path);
      this.app[method](path, containerMiddleware(this.appScope, route.tags), (req, res, next) =>
        this.handle(route, req, res, next),
      );
    }
  }

  private async handle(route: RouteMetadata, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestScope = getContainerOrFail(req);
      const useCase = requestScope.resolve<HttpRouteInstance>(route.operationId);
      const payload = this.payloads[route.operationId].parse(req);
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
