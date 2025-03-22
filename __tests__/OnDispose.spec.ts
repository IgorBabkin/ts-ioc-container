import 'reflect-metadata';
import { by, Container, hook, inject, key, provider, register, Registration as R, runHooks, singleton } from '../lib';

@register('logsRepo', provider(singleton()))
class LogsRepo {
  savedLogs: string[] = [];

  saveLogs(messages: string[]) {
    this.savedLogs.push(...messages);
  }
}

@register('logger')
class Logger {
  @hook('onDispose', ({ instance, methodName }) => {
    // @ts-ignore
    instance[methodName].push('world');
  }) // <--- or extract it to @onDispose
  private messages: string[] = [];

  constructor(@inject(by.one('logsRepo')) private logsRepo: LogsRepo) {}

  log(@inject(by.one('logsRepo')) message: string): void {
    this.messages.push(message);
  }

  size(): number {
    return this.messages.length;
  }

  @hook('onDispose', (c) => {
    c.invokeMethod({ args: [] });
  }) // <--- or extract it to @onDispose
  async save(): Promise<void> {
    this.logsRepo.saveLogs(this.messages);
  }
}

describe('onDispose', function () {
  it('should invoke hooks on all instances', async function () {
    const container = new Container().addRegistration(R.fromClass(Logger)).addRegistration(R.fromClass(LogsRepo));

    const logger = container.resolve<Logger>('logger');
    logger.log('Hello');

    for (const instance of by.instances().resolve(container)) {
      runHooks(instance as object, 'onDispose', { scope: container });
    }

    expect(container.resolve<LogsRepo>('logsRepo').savedLogs.join(',')).toBe('Hello,world');
  });
});
