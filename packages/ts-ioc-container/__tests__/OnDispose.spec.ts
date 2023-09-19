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
  Registration,
  ReflectionInjector,
} from '../lib';

@key('logsRepo')
@provider(singleton())
class LogsRepo {
  savedLogs: string[] = [];

  saveLogs(messages: string[]) {
    this.savedLogs.push(...messages);
  }
}

@key('logger')
class Logger {
  private messages: string[] = [];

  constructor(@inject(by('logsRepo')) private logsRepo: LogsRepo) {}

  log(message: string): void {
    this.messages.push(message);
  }

  @hook('onDispose')
  async save(): Promise<void> {
    this.logsRepo.saveLogs(this.messages);
    this.messages = [];
  }
}

describe('onDispose', function () {
  it('should invoke hooks on all instances', async function () {
    const container = new Container(new ReflectionInjector())
      .use(Registration.fromClass(Logger))
      .use(Registration.fromClass(LogsRepo));

    const logger = container.resolve<Logger>('logger');
    logger.log('Hello');

    for (const instance of container.getInstances()) {
      // eslint-disable-next-line @typescript-eslint/ban-types
      for (const h of getHooks(instance as object, 'onDispose')) {
        // @ts-ignore
        await instance[h]();
      }
    }

    expect(container.resolve<LogsRepo>('logsRepo').savedLogs).toContain('Hello');
  });
});