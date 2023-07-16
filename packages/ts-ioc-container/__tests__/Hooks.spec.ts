import 'reflect-metadata';
import {
  asSingleton,
  by,
  constructor,
  Container,
  forKey,
  getHooks,
  hook,
  IContainer,
  IInjector,
  inject,
  provider,
  ReflectionInjector,
  Registration,
} from '../lib';

class MyInjector implements IInjector {
  private injector = new ReflectionInjector();

  resolve<T>(container: IContainer, value: constructor<T>, ...deps: unknown[]): T {
    const instance = this.injector.resolve(container, value, ...deps);
    for (const h of getHooks(instance, 'onConstruct')) {
      // @ts-ignore
      instance[h]();
    }
    return instance;
  }
}

@forKey('logsRepo')
@provider(asSingleton())
class LogsRepo {
  savedLogs: string[] = [];

  saveLogs(messages: string[]) {
    this.savedLogs.push(...messages);
  }
}

@forKey('logger')
class Logger {
  isReady = false;
  private messages: string[] = [];

  constructor(@inject(by('logsRepo')) private logsRepo: LogsRepo) {}

  @hook('onConstruct')
  initialize() {
    this.isReady = true;
  }

  log(message: string): void {
    this.messages.push(message);
  }

  @hook('onDispose')
  async save(): Promise<void> {
    this.logsRepo.saveLogs(this.messages);
    this.messages = [];
  }
}

describe('Hooks', function () {
  function createContainer() {
    return new Container(new MyInjector());
  }

  it('should invoke hooks on all instances', async function () {
    const container = createContainer().add(Registration.fromClass(Logger)).add(Registration.fromClass(LogsRepo));

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

  it('should make logger be ready on resolve', function () {
    const container = createContainer().add(Registration.fromClass(Logger)).add(Registration.fromClass(LogsRepo));

    const logger = container.resolve<Logger>('logger');

    expect(logger.isReady).toBe(true);
  });
});
