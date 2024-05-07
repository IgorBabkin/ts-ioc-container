import 'reflect-metadata';
import {
  singleton,
  by,
  Container,
  key,
  getHooks,
  hook,
  inject,
  provider,
  Registration as R,
  MetadataInjector,
  register,
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
  private messages: string[] = [];

  constructor(@inject(by.key('logsRepo')) private logsRepo: LogsRepo) {}

  log(@inject(by.key('logsRepo')) message: string): void {
    this.messages.push(message);
  }

  @hook('onDispose') // <--- or extract it to @onDispose
  async save(): Promise<void> {
    this.logsRepo.saveLogs(this.messages);
    this.messages = [];
  }
}

describe('onDispose', function () {
  it('should invoke hooks on all instances', async function () {
    const container = new Container(new MetadataInjector()).add(R.fromClass(Logger)).add(R.fromClass(LogsRepo));

    const logger = container.resolve<Logger>('logger');
    logger.log('Hello');

    for (const instance of container.getInstances()) {
      // eslint-disable-next-line @typescript-eslint/ban-types
      for (const [h] of getHooks(instance as object, 'onDispose')) {
        // @ts-ignore
        await instance[h]();
      }
    }

    expect(container.resolve<LogsRepo>('logsRepo').savedLogs).toContain('Hello');
  });
});
