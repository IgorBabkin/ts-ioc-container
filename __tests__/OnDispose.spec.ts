import {
  bindTo,
  Container,
  hook,
  type HookFn,
  HooksRunner,
  inject,
  register,
  Registration as R,
  select,
  singleton,
} from '../lib';

const onDisposeHookRunner = new HooksRunner('onDispose');
const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

@register(bindTo('logsRepo'), singleton())
class LogsRepo {
  savedLogs: string[] = [];

  saveLogs(messages: string[]) {
    this.savedLogs.push(...messages);
  }
}

@register(bindTo('logger'))
class Logger {
  @hook('onDispose', ({ instance, methodName }) => {
    // @ts-ignore
    instance[methodName].push('world');
  }) // <--- or extract it to @onDispose
  private messages: string[] = [];

  constructor(@inject('logsRepo') private logsRepo: LogsRepo) {}

  log(message: string): void {
    this.messages.push(message);
  }

  @hook('onDispose', execute) // <--- or extract it to @onDispose
  save() {
    this.logsRepo.saveLogs(this.messages);
  }
}

describe('onDispose', function () {
  it('should invoke hooks on all instances', function () {
    const container = new Container().addRegistration(R.fromClass(Logger)).addRegistration(R.fromClass(LogsRepo));

    const logger = container.resolve<Logger>('logger');
    logger.log('Hello');

    for (const instance of select.instances().resolve(container)) {
      onDisposeHookRunner.execute(instance, { scope: container });
    }

    expect(container.resolve<LogsRepo>('logsRepo').savedLogs.join(',')).toBe('Hello,world');
  });
});
