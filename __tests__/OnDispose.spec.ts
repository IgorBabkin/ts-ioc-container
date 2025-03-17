import 'reflect-metadata';
import {
  by,
  Container,
  hook,
  inject,
  key,
  MetadataInjector,
  provider,
  register,
  Registration as R,
  runHooks,
  singleton,
} from '../lib';

@register(key('logsRepo'))
@provider(singleton())
class LogsRepo {
  savedLogs: string[] = [];

  saveLogs(messages: string[]) {
    this.savedLogs.push(...messages);
  }
}

@register(key('logger'))
class Logger {
  @hook('onDispose', ({ instance, methodName }) => {
    // @ts-ignore
    instance[methodName].push('world');
  }) // <--- or extract it to @onDispose
  private messages: string[] = [];

  constructor(@inject(by.key('logsRepo')) private logsRepo: LogsRepo) {}

  log(@inject(by.key('logsRepo')) message: string): void {
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
    const container = new Container().add(R.toClass(Logger)).add(R.toClass(LogsRepo));

    const logger = container.resolve<Logger>('logger');
    logger.log('Hello');

    for (const instance of by.instances()(container)) {
      runHooks(instance as object, 'onDispose', { scope: container });
    }

    expect(container.resolve<LogsRepo>('logsRepo').savedLogs.join(',')).toBe('Hello,world');
  });
});
