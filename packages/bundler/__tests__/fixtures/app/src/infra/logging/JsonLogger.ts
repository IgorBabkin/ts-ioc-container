import { register, singleton } from 'ts-ioc-container';
import { type ILogger, ILoggerToken } from './ILogger';

/** Production logger: one JSON line per message. dev.bundle.yml drops it with `excludeClasses`. */
@register(ILoggerToken, singleton())
export class JsonLogger implements ILogger {
  readonly messages: string[] = [];

  log(message: string): void {
    this.messages.push(JSON.stringify({ message }));
  }
}
