import express, { Express, Request, Response, NextFunction } from 'express';
import { OpenAPIV3 } from 'openapi-types';
import { OpenAPIServerConfig, RouteMetadata, ControllerInstance } from './types';
import { extractRoutes, convertOpenAPIPathToExpress } from './utils/routeExtractor';
import { buildPayload } from './utils/payloadBuilder';

export class ExpressOpenAPIServer {
  private app: Express;
  private spec: OpenAPIV3.Document;
  private controllers: Map<string, ControllerInstance>;
  private basePath: string;

  constructor(config: OpenAPIServerConfig) {
    this.app = express();
    this.spec = config.spec;
    this.controllers = new Map();
    this.basePath = config.basePath || '';

    this.initializeControllers(config.controllers);
    this.setupMiddleware();
    this.registerRoutes();
    this.setupErrorHandler(config.errorHandler);
  }

  private initializeControllers(controllers: Record<string, any>): void {
    for (const [name, ControllerClass] of Object.entries(controllers)) {
      const instance = new ControllerClass();
      this.controllers.set(name, instance);
    }
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private registerRoutes(): void {
    const routes = extractRoutes(this.spec);

    for (const route of routes) {
      this.registerRoute(route);
    }
  }

  private registerRoute(route: RouteMetadata): void {
    const controller = this.controllers.get(route.controllerName);

    if (!controller) {
      console.warn(
        `Controller "${route.controllerName}" not found for operation "${route.operationId}"`
      );
      return;
    }

    const method = controller[route.methodName];

    if (typeof method !== 'function') {
      console.warn(
        `Method "${route.methodName}" not found on controller "${route.controllerName}"`
      );
      return;
    }

    const expressPath = this.basePath + convertOpenAPIPathToExpress(route.path);
    const httpMethod = route.method.toLowerCase() as keyof Express;

    const handler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const payload = buildPayload(req);
        const result = await method.call(controller, payload);

        if (result && typeof result === 'object') {
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
        }

        res.end();
      } catch (error) {
        next(error);
      }
    };

    this.app[httpMethod](expressPath, handler);

    console.log(
      `Registered route: ${route.method} ${expressPath} -> ${route.controllerName}.${route.methodName}`
    );
  }

  private setupErrorHandler(customHandler?: (error: Error, req: Request, res: Response, next: NextFunction) => void): void {
    const errorHandler = customHandler || this.defaultErrorHandler;
    this.app.use(errorHandler);
  }

  private defaultErrorHandler(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    console.error('Error:', error);

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      error: {
        message: error.message,
        name: error.name,
      },
    });
  }

  public getApp(): Express {
    return this.app;
  }

  public listen(port: number, callback?: () => void): void {
    this.app.listen(port, callback);
  }
}
