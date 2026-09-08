import 'reflect-metadata';
import {
  OnDisposeModule,
  bindTo,
  Container,
  type HookFn,
  inject,
  onScopeDisposed,
  register,
  Registration as R,
  singleton,
} from '../../lib';

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
  private messages: string[] = [];

  constructor(@inject('logsRepo') private logsRepo: LogsRepo) {}

  log(message: string): void {
    this.messages.push(message);
  }

  @onScopeDisposed(execute)
  save() {
    this.logsRepo.saveLogs(this.messages);
  }
}

describe('onScopeDisposed', function () {
  it('should invoke hooks on all instances when container is disposed', function () {
    const container = new Container()
      .useModule(new OnDisposeModule())
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromClass(LogsRepo));

    const logger = container.resolve<Logger>('logger');
    logger.log('Hello');
    const logsRepo = container.resolve<LogsRepo>('logsRepo');

    container.dispose();

    expect(logsRepo.savedLogs).toEqual(['Hello']);
  });
});
