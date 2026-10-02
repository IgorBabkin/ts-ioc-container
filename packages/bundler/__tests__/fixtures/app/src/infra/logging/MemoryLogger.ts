import { bindTo, register, singleton } from 'ts-ioc-container';
import { type ILogger, ILoggerToken } from './ILogger';

@register(bindTo(ILoggerToken), singleton())
export class MemoryLogger implements ILogger {
  readonly messages: string[] = [];

  log(message: string): void {
    this.messages.push(message);
  }
}
