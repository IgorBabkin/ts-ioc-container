import { RequestHandler, Request } from 'express-serve-static-core';
import { IContainer } from 'ts-ioc-container';

export function containerMiddleware(appContainer: IContainer): RequestHandler {
  return (req, res, next) => {
    // Create request-scoped container
    const requestScope = appContainer.createScope({ tags: ['request'] });

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
