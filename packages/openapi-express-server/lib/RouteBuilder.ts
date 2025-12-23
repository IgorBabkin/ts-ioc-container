import { Express, NextFunction, Request, Response } from 'express';
import { OpenAPIV3 } from 'openapi-types';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { RouteMetadata } from './types';
import { convertOpenAPIPathToExpress, extractRoutes } from './utils/routeExtractor';
import { getContainerOrFail } from './containerMiddleware';
import { PayloadValidator } from './PayloadValidator';
import { ZodObject } from 'zod';

export interface RouteBuilderConfig {
  specPath: string;
  server: Record<string, any>;
  payloadValidators: Record<string, ZodObject>;
}

export class RouteBuilder {
  private readonly spec: OpenAPIV3.Document;
  private readonly controllers: Map<string, any>;
  private readonly payloadValidator: PayloadValidator;

  constructor(config: RouteBuilderConfig) {
    this.spec = this.loadSpec(config.specPath);
    this.controllers = new Map();
    this.payloadValidator = new PayloadValidator(config.payloadValidators);

    for (const [name, ControllerClass] of Object.entries(config.server)) {
      this.controllers.set(name, ControllerClass);
    }
  }

  private loadSpec(specPath: string): OpenAPIV3.Document {
    const content = fs.readFileSync(specPath, 'utf8');
    return yaml.load(content) as OpenAPIV3.Document;
  }

  applyTo(app: Express): void {
    const routes = extractRoutes(this.spec);

    for (const route of routes) {
      this.registerRoute(app, route);
    }
  }

  private registerRoute(app: Express, route: RouteMetadata): void {
    const ControllerClass = this.controllers.get(route.controllerName);

    if (!ControllerClass) {
      console.warn(`Controller "${route.controllerName}" not found for operation "${route.operationId}"`);
      return;
    }

    const expressPath = convertOpenAPIPathToExpress(route.path);
    const httpMethod = route.method.toLowerCase() as keyof Express;

    app[httpMethod](expressPath, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const container = getContainerOrFail(req);
        const controller = container.resolve(route.controllerName);
        const payload = this.payloadValidator.parseByOperationId(route.operationId, req);
        const result = await controller[route.methodName](payload);
        this.sendResponse(result, res);
      } catch (error) {
        next(error);
      }
    });

    console.log(`Registered route: ${route.method} ${expressPath} -> ${route.controllerName}.${route.methodName}`);
  }

  private sendResponse(result: any, res: Response): void {
    if (!result || typeof result !== 'object') {
      throw new Error(`Result is not object`);
    }

    if ('status' in result) {
      res.status(result.status);
    }

    if ('headers' in result && typeof result.headers === 'object') {
      for (const [key, value] of Object.entries(result.headers)) {
        if (value !== undefined && value !== null) {
          res.setHeader(key, String(value));
        }
      }
    }

    if ('body' in result) {
      res.json(result.body);
      return;
    }

    res.end();
  }
}
