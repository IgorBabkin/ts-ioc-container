import { by, inject, register, SingleToken } from 'ts-ioc-container';
import { type CliIo, CliIoKey } from '../domain/CliIo';

/**
 * Diagnostics, kept off stdout so a command's output stays machine-readable.
 * Every line is prefixed with `tic:`.
 */
export interface ILogger {
  /** A non-fatal problem: `tic: warning: <message>`. */
  warn(message: string): void;
  /** A fatal problem: `tic: <message>`. */
  error(message: string): void;
}

export const ILoggerKey = new SingleToken<ILogger>('ILogger');

@register(ILoggerKey)
export class ConsoleLogger implements ILogger {
  constructor(@inject(by(CliIoKey)) private readonly io: CliIo) {}

  warn(message: string): void {
    this.io.stderr(`tic: warning: ${message}`);
  }

  error(message: string): void {
    this.io.stderr(`tic: ${message}`);
  }
}
