import { Request, Response, NextFunction } from 'express';
import { OpenAPIV3 } from 'openapi-types';
import { IContainer } from 'ts-ioc-container';

export interface OpenAPIServerConfig {
  spec: OpenAPIV3.Document;
  /** One use case per operation, keyed by `operationId`. */
  useCases: Record<string, any>;
  basePath?: string;
  errorHandler?: ErrorHandler;
}

/** One operation of the document. `operationId` is the DI key of its use case (SPEC-007 UC-4). */
export interface RouteMetadata {
  path: string;
  method: string;
  operationId: string;
  tags: string[];
}

export type ErrorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => void;

export interface HttpRouteInstance {
  handle(payload: any, context: IContainer): Promise<any>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      container: IContainer;
    }
  }
}
