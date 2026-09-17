import { Express, NextFunction, Request, Response } from 'express';
import { OpenAPIV3 } from 'openapi-types';
import { arg, type IContainer, inject, select } from 'ts-ioc-container';
import {
  containerMiddleware,
  convertOpenAPIPathToExpress,
  extractRoutes,
  getContainerOrFail,
  RouteMetadata,
  UseCaseInstance,
} from '../lib';
import { ZodObject } from 'zod';

export class RouteBuilder {
  constructor(
    @inject(select.scope.current) private readonly currentScope: IContainer,
    @inject(arg(0)) private readonly spec: OpenAPIV3.Document,
    @inject(arg(1)) private readonly validators: Record<string, ZodObject>,
  ) {}

  applyTo(app: Express): void {
    const routes = extractRoutes(this.spec);

    for (const route of routes) {
      this.registerRoute(app, route);
    }
  }

  private registerRoute(app: Express, route: RouteMetadata): void {
    // The use case is registered under the operationId verbatim (SPEC-007 UC-4).
    if (!this.currentScope.hasRegistration(route.operationId)) {
      console.warn(`Use case "${route.operationId}" not found`);
      return;
    }

    const expressPath = convertOpenAPIPathToExpress(route.path);
    const httpMethod = route.method.toLowerCase() as keyof Express;

    // The request scope carries the operation's tags (SPEC-007 UC-6).
    const requestScope = containerMiddleware(this.currentScope, route.tags);

    app[httpMethod](expressPath, requestScope, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const container = getContainerOrFail(req);
        const useCase = container.resolve<UseCaseInstance>(route.operationId);
        const payload = this.findValidatorOrFail(route.operationId).parse(req);
        const result = await useCase.handle(payload, container);
        this.sendResponse(result, res);
      } catch (error) {
        next(error);
      }
    });

    console.log(`Registered route: ${route.method} ${expressPath} -> ${route.operationId}`);
  }

  private findValidatorOrFail(operationId: string) {
    if (!this.validators[operationId]) {
      throw new Error(`Validator for operation "${operationId}" not found`);
    }

    return this.validators[operationId];
  }

  private sendResponse(result: any, res: Response): void {
    if (!result || typeof result !== 'object') {
      throw new Error(`Result is not object`);
    }

    const status = 'status' in result ? result.status : 200;
    res.status(status);

    if ('headers' in result && typeof result.headers === 'object') {
      for (const [key, value] of Object.entries(result.headers)) {
        if (value !== undefined && value !== null) {
          res.setHeader(key, String(value));
        }
      }
    }

    if ('body' in result) {
      res.json(result.body);
    } else {
      res.end();
    }
  }
}
