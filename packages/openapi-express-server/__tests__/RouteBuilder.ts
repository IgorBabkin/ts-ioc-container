import { Express, NextFunction, Request, Response } from 'express';
import { OpenAPIV3 } from 'openapi-types';
import { type IContainer, inject, select } from 'ts-ioc-container';
import { convertOpenAPIPathToExpress, extractRoutes, getContainerOrFail, RouteMetadata } from '../lib';
import { ZodObject } from 'zod';

export class RouteBuilder {
  constructor(
    @inject(select.scope.current) private readonly currentScope: IContainer,
    private readonly spec: OpenAPIV3.Document,
    private readonly validators: Record<string, ZodObject>,
  ) {}

  applyTo(app: Express): void {
    const routes = extractRoutes(this.spec);

    for (const route of routes) {
      this.registerRoute(app, route);
    }
  }

  private registerRoute(app: Express, route: RouteMetadata): void {
    if (!this.currentScope.hasRegistration(route.controllerName)) {
      console.warn(`Controller "${route.controllerName}" not found for operation "${route.operationId}"`);
      return;
    }

    const expressPath = convertOpenAPIPathToExpress(route.path);
    const httpMethod = route.method.toLowerCase() as keyof Express;

    app[httpMethod](expressPath, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const container = getContainerOrFail(req);
        const controller = container.resolve(route.controllerName);
        const payload = this.findValidatorOrFail(route.operationId).parse(req);
        const result = await controller[route.methodName](payload);
        this.sendResponse(result, res);
      } catch (error) {
        next(error);
      }
    });

    console.log(`Registered route: ${route.method} ${expressPath} -> ${route.controllerName}.${route.methodName}`);
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
