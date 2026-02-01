import type { Request } from 'express';
import type { IContainer } from 'ts-ioc-container';

/**
 * Extends Express Request interface to include container property.
 * This uses TypeScript declaration merging to add the container to the Request type.
 *
 * @example
 * ```typescript
 * import '@ts-ioc-container/express';
 *
 * app.get('/users', (req, res) => {
 *   const userService = req.container.resolve('IUserService');
 *   // ...
 * });
 * ```
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * Request-scoped container created from the root container.
       * This container is automatically disposed when the request completes.
       */
      container: IContainer;
    }
  }
}

export type { Request };
