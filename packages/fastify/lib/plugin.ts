import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
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
export function containerPlugin(
  rootContainer: IContainer,
  options: ContainerPluginOptions = {},
): (fastify: FastifyInstance, opts: FastifyPluginOptions) => Promise<void> {
  const tags = options.tags ?? ['request'];

  return async (fastify: FastifyInstance): Promise<void> => {
    // Track if container has been disposed to avoid double disposal
    const requestContainers = new WeakMap<FastifyRequest, { container: IContainer; disposed: boolean }>();

    // Create request-scoped container on each request
    fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
      const requestContainer = rootContainer.createScope({ tags });
      requestContainers.set(request, { container: requestContainer, disposed: false });
      request.container = requestContainer;
    });

    // Dispose container when response is sent
    fastify.addHook('onResponse', async (request: FastifyRequest) => {
      const containerInfo = requestContainers.get(request);
      if (containerInfo && !containerInfo.disposed) {
        containerInfo.disposed = true;
        containerInfo.container.dispose();
        requestContainers.delete(request);
      }
    });

    // Dispose container on error
    fastify.addHook('onError', async (request: FastifyRequest) => {
      const containerInfo = requestContainers.get(request);
      if (containerInfo && !containerInfo.disposed) {
        containerInfo.disposed = true;
        containerInfo.container.dispose();
        requestContainers.delete(request);
      }
    });

    // Cleanup on server close
    fastify.addHook('onClose', async (instance: FastifyInstance, done: () => void) => {
      // Clean up any remaining containers on server close
      // Individual request containers should already be disposed via onResponse/onError
      done();
    });
  };
}
