import * as express from 'express';
import { Express, NextFunction, Request, Response } from 'express';
import { RouteBuilder } from './RouteBuilder';
import { ZodObject } from 'zod';

const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', error);

  if (res.headersSent) {
    return next(error);
  }
};

export interface CreateServerOptions {
  specPath: string;
  server: Record<string, any>;
  payloadValidators: Record<string, ZodObject>;
}

export function createServer(options: CreateServerOptions): Express {
  if (!options.specPath) {
    throw new Error('specPath must be provided');
  }

  const routeBuilder = new RouteBuilder({
    specPath: options.specPath,
    server: options.server,
    payloadValidators: options.payloadValidators,
  });

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  routeBuilder.applyTo(app);
  app.use(errorHandler);

  return app;
}
