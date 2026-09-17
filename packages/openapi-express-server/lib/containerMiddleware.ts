import { RequestHandler, Request } from 'express-serve-static-core';
import { IContainer } from 'ts-ioc-container';

export const REQUEST_SCOPE_TAG = 'request';

/**
 * Creates a request-scoped container for every request that reaches it and disposes it when the
 * response ends. Mounted per route with the route's `tags`, so registrations bound to a tag
 * (`scope((s) => s.hasTag('admins'))`) apply to exactly the operations carrying it (SPEC-007 UC-6).
 */
export function containerMiddleware(appContainer: IContainer, tags: string[] = []): RequestHandler {
  return (req, res, next) => {
    const requestScope = appContainer.createScope({ tags: [REQUEST_SCOPE_TAG, ...tags] });

    // Attach to request
    req.container = requestScope;

    // Cleanup on response finish
    res.on('finish', () => {
      requestScope.dispose();
    });

    // Cleanup on error
    res.on('close', () => {
      if (!res.writableEnded) {
        requestScope.dispose();
      }
    });

    next();
  };
}

export function getContainerOrFail(req: Request) {
  if (!req.container) {
    throw new Error(`Container is not provided`);
  }
  return req.container;
}
