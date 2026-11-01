import { by, inject, register, SingleToken } from 'ts-ioc-container';
import { type CliIo, CliIoKey } from '../domain/CliIo';

/**
 * Diagnostics, kept off stdout so a command's output stays machine-readable.
 * Warnings and errors are prefixed with `tic:`.
 */
export interface ILogger {
  /** Progress, printed as is: `<message>`. */
  info(message: string): void;
  /** A non-fatal problem: `tic: warning: <message>`. */
  warn(message: string): void;
  /** A fatal problem: `tic: <message>`. */
  error(message: string): void;
}

export const ILoggerKey = new SingleToken<ILogger>('ILogger');

@register(ILoggerKey)
export class ConsoleLogger implements ILogger {
  constructor(@inject(by(CliIoKey)) private readonly io: CliIo) {}

  info(message: string): void {
    this.io.stderr(message);
  }

  warn(message: string): void {
    this.io.stderr(`tic: warning: ${message}`);
  }

  error(message: string): void {
    this.io.stderr(`tic: ${message}`);
  }
}
