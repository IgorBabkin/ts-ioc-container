import { SingleToken } from 'ts-ioc-container';

export interface ILogger {
  readonly messages: string[];
  log(message: string): void;
}

export const ILoggerToken = new SingleToken<ILogger>('ILogger');
