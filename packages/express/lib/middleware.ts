import type { Request, Response, NextFunction } from 'express';
import type { IContainer, Tag } from 'ts-ioc-container';

/**
 * Options for container middleware.
 */
export interface ContainerMiddlewareOptions {
  /**
   * Tags to apply to the request-scoped container.
   * Defaults to ['request'].
   */
  tags?: Tag[];
}

/**
 * Creates Express middleware that injects a request-scoped container for every request
 * and automatically disposes it when the request completes.
 *
 * The middleware:
 * 1. Creates a new request-scoped container from the root container
 * 2. Attaches it to `req.container`
 * 3. Disposes the container when the response finishes or closes
 *
 * @param rootContainer - The root container to create request scopes from
 * @param options - Optional configuration for the middleware
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { Container } from 'ts-ioc-container';
 * import { containerMiddleware } from '@ts-ioc-container/express';
 *
 * const app = express();
 * const rootContainer = new Container();
 *
 * app.use(containerMiddleware(rootContainer));
 *
 * app.get('/users', (req, res) => {
 *   const userService = req.container.resolve('IUserService');
 *   // ...
 * });
 * ```
 */
export function containerMiddleware(
  rootContainer: IContainer,
  options: ContainerMiddlewareOptions = {},
): (req: Request, res: Response, next: NextFunction) => void {
  const tags = options.tags ?? ['request'];

  return (req: Request, res: Response, next: NextFunction): void => {
    // Create request-scoped container
    const requestContainer = rootContainer.createScope({ tags });

    // Attach to request
    req.container = requestContainer;

    // Track if container has been disposed to avoid double disposal
    let disposed = false;

    const disposeContainer = (): void => {
      if (!disposed) {
        disposed = true;
        requestContainer.dispose();
      }
    };

    // Dispose on response finish (successful completion)
    res.on('finish', disposeContainer);

    // Dispose on response close (error or client disconnect)
    res.on('close', () => {
      if (!res.writableEnded) {
        disposeContainer();
      }
    });

    next();
  };
}
