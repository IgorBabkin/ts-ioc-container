import { register, singleton } from 'ts-ioc-container';
import { type ILogger, ILoggerToken } from '@app/infra/logging/ILogger';

/** Test double: keeps messages verbatim. Only test.bundle.yml includes `src/testing`. */
@register(ILoggerToken, singleton())
export class MemoryLogger implements ILogger {
  readonly messages: string[] = [];

  log(message: string): void {
    this.messages.push(message);
  }
}
