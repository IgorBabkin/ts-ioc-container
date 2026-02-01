import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import type { IContainer, Tag } from 'ts-ioc-container';

/**
 * Options for container plugin.
 */
export interface ContainerPluginOptions {
  /**
   * Tags to apply to the request-scoped container.
   * Defaults to ['request'].
   */
  tags?: Tag[];
}

/**
 * Creates a Fastify plugin that injects a request-scoped container for every request
 * and automatically disposes it when the request completes.
 *
 * The plugin:
 * 1. Creates a new request-scoped container from the root container on each request
 * 2. Attaches it to `request.container`
 * 3. Disposes the container when the response finishes or the connection closes
 *
 * @param rootContainer - The root container to create request scopes from
 * @param options - Optional configuration for the plugin
 * @returns Fastify plugin function
 *
 * @example
 * ```typescript
 * import fastify from 'fastify';
 * import { Container } from 'ts-ioc-container';
 * import { containerPlugin } from '@ts-ioc-container/fastify';
 *
 * const app = fastify();
 * const rootContainer = new Container();
 *
 * await app.register(containerPlugin(rootContainer));
 *
 * app.get('/users', async (request, reply) => {
 *   const userService = request.container.resolve('IUserService');
 *   // ...
 * });
 * ```
 */
export function containerPlugin(rootContainer: IContainer, { tags = ['request'] }: ContainerPluginOptions = {}) {
  return fp(
    async (fastify: FastifyInstance): Promise<void> => {
      // Create request-scoped container on each request
      fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
        // Create request-scoped container
        const requestContainer = rootContainer.createScope({ tags });

        // Attach to request
        request.container = requestContainer;

        const disposeContainer = (): void => {
          if (!requestContainer.isDisposed) {
            requestContainer.dispose();
          }
        };

        // Dispose on response finish (successful completion)
        reply.raw.on('finish', disposeContainer);

        // Dispose on response close (error or client disconnect)
        reply.raw.on('close', () => {
          disposeContainer();
        });
      });
    },
    {
      name: '@ts-ioc-container/fastify',
      fastify: '>=4.0.0',
    },
  );
}
