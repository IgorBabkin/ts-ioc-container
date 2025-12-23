import { Request, Response, NextFunction } from 'express';
import { OpenAPIV3 } from 'openapi-types';
import { IContainer } from 'ts-ioc-container';

export interface OpenAPIServerConfig {
  spec: OpenAPIV3.Document;
  controllers: Record<string, any>;
  basePath?: string;
  errorHandler?: ErrorHandler;
}

export interface RouteMetadata {
  path: string;
  method: string;
  operationId: string;
  tags: string[];
  controllerName: string;
  methodName: string;
}

export type ErrorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => void;

export interface ControllerInstance {
  [methodName: string]: (payload: any) => Promise<any>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      container: IContainer;
    }
  }
}
