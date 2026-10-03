import { register, singleton } from 'ts-ioc-container';
import { type ILogger, ILoggerToken } from './ILogger';

/** Development logger, by the `*.dev.ts` convention prod.bundle.yml excludes. */
@register(ILoggerToken, singleton())
export class PrettyLogger implements ILogger {
  readonly messages: string[] = [];

  log(message: string): void {
    this.messages.push(`[dev] ${message}`);
  }
}
