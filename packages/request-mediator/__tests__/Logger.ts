import { Scope } from '../lib';
import { provider, register, scope, singleton } from 'ts-ioc-container';
import { key } from 'ts-ioc-container/lib';

export const ILoggerKey = Symbol('ILogger');

@register(key(ILoggerKey), scope((s) => s.hasTag(Scope.Application)))
@provider(singleton())
export class Logger {
  private logs: string[] = [];

  addLog(...logs: string[]): void {
    this.logs.push(...logs);
  }

  getLogs(): string[] {
    return this.logs;
  }
}
