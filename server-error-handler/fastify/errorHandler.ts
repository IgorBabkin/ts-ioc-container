import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import type { IContainer } from 'ts-ioc-container';
import { toGroupAlias } from 'ts-ioc-container';
import type { IErrorHandler, FastifyContext } from './types';

/**
 * Options for the error handler plugin.
 */
export interface ErrorHandlerOptions {
  /**
   * Custom alias to use for resolving error handlers.
   * Defaults to 'IErrorHandler'.
   */
  alias?: string;
}

/**
 * Creates a Fastify plugin that provides error handling using IoC container
 * to resolve and execute registered error handlers.
 *
 * Error handlers are resolved from the container using the 'IErrorHandler' alias,
 * sorted by priority (highest first), and the first matching handler is used.
 *
 * @param container - The IoC container to resolve error handlers from
 * @param options - Optional configuration
 * @returns Fastify plugin function
 *
 * @example
 * ```typescript
 * import fastify from 'fastify';
 * import { Container, R, register, bindTo, singleton, toGroupAlias } from 'ts-ioc-container';
 * import { errorHandler, IErrorHandler, FastifyContext } from '@ts-ioc-container/server-error-handler-fastify';
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
 *   handle(error: EntityNotFoundError, { reply }: FastifyContext) {
 *     reply.status(404).send({ message: error.message });
 *   }
 * }
 *
 * const container = new Container();
 * container.addRegistration(R.fromClass(EntityNotFoundErrorHandler));
 *
 * const app = fastify();
 * await app.register(errorHandler(container));
 * ```
 */
export function errorHandler(
  container: IContainer,
  { alias = 'IErrorHandler' }: ErrorHandlerOptions = {},
): (fastify: FastifyInstance, opts: FastifyPluginOptions) => Promise<void> {
  const handlers = [...toGroupAlias<IErrorHandler>(alias).resolve(container)].sort((a, b) => b.priority - a.priority);

  return async (fastify: FastifyInstance): Promise<void> => {
    fastify.setErrorHandler(
      async (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        // Find the first handler that matches
        const context: FastifyContext = { req: request, reply };
        for (const handler of handlers) {
          if (handler.match(error)) {
            await handler.handle(error, context);
            return;
          }
        }

        // No handler matched, rethrow
        throw error;
      },
    );
  };
}
