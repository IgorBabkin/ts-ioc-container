import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import type { IContainer } from 'ts-ioc-container';
import { toGroupAlias } from 'ts-ioc-container';
import type { IErrorHandler, ExpressContext } from './types';

/**
 * Options for the error handler middleware.
 */
export interface ErrorHandlerOptions {
  /**
   * Custom alias to use for resolving error handlers.
   * Defaults to 'IErrorHandler'.
   */
  alias?: string;
}

/**
 * Creates Express error handling middleware that uses IoC container
 * to resolve and execute registered error handlers.
 *
 * Error handlers are resolved from the container using the 'IErrorHandler' alias,
 * sorted by priority (highest first), and the first matching handler is used.
 *
 * @param container - The IoC container to resolve error handlers from
 * @param options - Optional configuration
 * @returns Express error handling middleware
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { Container, R, register, bindTo, singleton, toGroupAlias } from 'ts-ioc-container';
 * import { errorHandler, IErrorHandler, ExpressContext } from '@ts-ioc-container/server-error-handler-express';
 *
 * class EntityNotFoundError extends Error {
 *   constructor(public entity: string) {
 *     super(`Entity not found: ${entity}`);
 *   }
 * }
 *
 * @register(bindTo(toGroupAlias('IErrorHandler')), singleton())
 * class EntityNotFoundErrorHandler implements IErrorHandler<EntityNotFoundError> {
 *   priority = 1;
 *
 *   match(error: unknown): boolean {
 *     return error instanceof EntityNotFoundError;
 *   }
 *
 *   handle(error: EntityNotFoundError, { reply }: ExpressContext) {
 *     reply.status(404).send({ message: error.message });
 *   }
 * }
 *
 * const container = new Container();
 * container.addRegistration(R.fromClass(EntityNotFoundErrorHandler));
 *
 * const app = express();
 * app.use(errorHandler(container));
 * ```
 */
export function errorHandler(
  container: IContainer,
  {alias = 'IErrorHandler'}: ErrorHandlerOptions = {},
): ErrorRequestHandler {
  const handlers = [...toGroupAlias<IErrorHandler>(alias).resolve(container)].sort((a, b) => b.priority - a.priority);

  return (err: unknown, req: Request, res: Response, next: NextFunction): void => {
    // Find the first handler that matches
    const context: ExpressContext = { req, reply: res };
    for (const handler of handlers) {
      if (handler.match(err)) {
        try {
          const result = handler.handle(err, context);
          if (result instanceof Promise) {
            result.catch(next);
          }
        } catch (handlerError) {
          next(handlerError);
        }
        return;
      }
    }

    next(err);
  };
}
