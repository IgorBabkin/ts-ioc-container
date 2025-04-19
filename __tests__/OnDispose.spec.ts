import { asKey, by, Container, hook, inject, register, Registration as R, runHooks, singleton } from '../lib';

@register(asKey('logsRepo'), singleton())
class LogsRepo {
  savedLogs: string[] = [];

  saveLogs(messages: string[]) {
    this.savedLogs.push(...messages);
  }
}

@register(asKey('logger'))
class Logger {
  @hook('onDispose', ({ instance, methodName }) => {
    // @ts-ignore
    instance[methodName].push('world');
  }) // <--- or extract it to @onDispose
  private messages: string[] = [];

  constructor(@inject('logsRepo') private logsRepo: LogsRepo) {}

  log(@inject('logsRepo') message: string): void {
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

    const logger = container.resolveOne<Logger>('logger');
    logger.log('Hello');

    for (const instance of by.instances().resolve(container)) {
      runHooks(instance as object, 'onDispose', { scope: container });
    }

    expect(container.resolveOne<LogsRepo>('logsRepo').savedLogs.join(',')).toBe('Hello,world');
  });
});
