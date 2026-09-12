import 'reflect-metadata';
import {
  OnDisposeModule,
  bindTo,
  Container,
  type HookFn,
  hook,
  HookCollector,
  type HookType,
  inject,
  register,
  Registration as R,
  singleton,
  type HookRunner,
} from '../../lib';

const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

// The library ships no dispose decorator: the key, the decorator which writes it
// and the collector which reads it are all ours.
const onScopeDisposed = (fn: HookType) => hook('onScopeDisposed', fn);
const onScopeDisposedHooks = new HookCollector({ key: 'onScopeDisposed' });

// The module collects the hooks of every instance of the disposed scope into one
// list; this runner performs them in order and never awaits.
const run: HookRunner = (actions) => {
  for (const { hook, context } of actions) {
    hook(context);
  }
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
      .useModule(new OnDisposeModule(run, onScopeDisposedHooks))
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromClass(LogsRepo));

    const logger = container.resolve<Logger>('logger');
    logger.log('Hello');
    const logsRepo = container.resolve<LogsRepo>('logsRepo');

    container.dispose();

    expect(logsRepo.savedLogs).toEqual(['Hello']);
  });
});
