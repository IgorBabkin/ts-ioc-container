import { SingleToken } from 'ts-ioc-container';

export interface IErrorHandler {
  /** Reports `error` and returns the exit code the CLI ends with. */
  handleError(error: unknown): number;
}

export const IErrorHandlerKey = new SingleToken<IErrorHandler>('IErrorHandler');
