import express, { type NextFunction, type Request, type Response } from 'express';
import type { Server } from 'http';
import type { OpenAPIV3 } from 'openapi-types';
import {
  by,
  hook,
  HookCollector,
  type HookFn,
  type HookType,
  type IContainer,
  type IContainerModule,
  inject,
  register,
  runInOrder,
  scope,
  select,
  singleton,
  SingleToken,
  toTask,
} from 'ts-ioc-container';
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
// ts-ioc-container ships no lifecycle hooks: declare `onConstruct` and run it after every construction.
export const onConstruct = (fn: HookType) => hook('onConstruct', fn);
export const execute = (): HookFn => (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() }); // `@inject` parameters of the method are resolved
};

const onConstructHooks = new HookCollector({ key: 'onConstruct' });
export const OnConstructModule: IContainerModule = {
  applyTo: (container) =>
    container.getInjector().onConstructed((instance, scope) => {
      void runInOrder(onConstructHooks.getActions(instance, { scope }).map(toTask));
    }),
};

export interface ILogger {
  log(message: string): void;
}
export const ILoggerToken = new SingleToken<ILogger>('ILogger');

export interface IAppService {
  applyRoutes(doc: OpenAPIV3.Document, payloadValidators: Record<string, ZodType>): void;
  start(port: number): Server;
}
export const IAppServiceToken = new SingleToken<IAppService>('IAppService');

@register(IAppServiceToken, scope((s) => s.hasTag('application')), singleton())
export class AppService implements IAppService {
  private readonly app = express();
  private readonly router = express.Router(); // filled by applyRoutes

  constructor(@inject(by(select.scope.current)) private readonly appScope: IContainer) {}

  // Modules: each runs once, in declaration order, right after construction.
  @onConstruct(execute())
  addJsonParsing(): void {
    this.app.use(express.json());
  }

  @onConstruct(execute())
  addRequestLogging(@inject(by(ILoggerToken)) logger: ILogger): void {
    this.app.use((req, res, next) => {
      logger.log(`${req.method} ${req.path}`);
      next();
    });
  }

  @onConstruct(execute())
  addHealthCheck(): void {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  }

  @onConstruct(execute())
  addRouting(): void {
    this.app.use(this.router);
  }

  // Must stay last: Express hands an error only to error handlers registered after the failing middleware.
  @onConstruct(execute())
  addErrorHandling(): void {
    this.app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
      res.status(error instanceof ZodError ? 400 : 500).json({ error: error.message });
    });
  }

  applyRoutes(doc: OpenAPIV3.Document, payloadValidators: Record<string, ZodType>): void {
    for (const route of extractRoutes(doc)) {
      if (!this.appScope.hasRegistration(route.operationId)) continue; // not implemented yet
      const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
      const path = convertOpenAPIPathToExpress(route.path);
      const validator = payloadValidators[route.operationId];
      this.router[method](path, containerMiddleware(this.appScope, route.tags), (req, res, next) =>
        this.handle(route, validator, req, res, next),
      );
    }
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
