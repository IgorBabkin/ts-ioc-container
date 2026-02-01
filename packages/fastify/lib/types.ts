import type { FastifyRequest } from 'fastify';
import type { IContainer } from 'ts-ioc-container';

/**
 * Extends Fastify Request interface to include container property.
 * This uses TypeScript declaration merging to add the container to the Request type.
 *
 * @example
 * ```typescript
 * import '@ts-ioc-container/fastify';
 *
 * fastify.get('/users', async (request, reply) => {
 *   const userService = request.container.resolve('IUserService');
 *   // ...
 * });
 * ```
 */
declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Request-scoped container created from the root container.
     * This container is automatically disposed when the request completes.
     */
    container: IContainer;
  }
}

export type { FastifyRequest };
