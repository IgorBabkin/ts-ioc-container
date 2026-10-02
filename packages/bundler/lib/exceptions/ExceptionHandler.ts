import { by, inject, register, singleton } from 'ts-ioc-container';
import { type IErrorHandler, IErrorHandlerKey } from '../cli/IErrorHandler';
import { type ILogger, ILoggerKey } from '../services/ConsoleLogger';
import { TicError } from './DomainException';

/**
 * Turns a failed command into exit code 1. A {@link TicError} is an expected failure
 * and is reported by its message alone; anything else is a bug, reported with its stack.
 */
@register(IErrorHandlerKey, singleton())
export class ExceptionHandler implements IErrorHandler {
  constructor(@inject(by(ILoggerKey)) private readonly logger: ILogger) {}

  handleError(error: unknown): number {
    if (error instanceof TicError) this.logger.error(error.message);
    else this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    return 1;
  }
}
