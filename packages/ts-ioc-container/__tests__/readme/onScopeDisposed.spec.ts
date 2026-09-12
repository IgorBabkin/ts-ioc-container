import 'reflect-metadata';
import {
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
  type ExecutionContext,
  type HookAction,
  type IContainerModule,
} from '../../lib';

const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

// The library ships no dispose decorator: the key, the decorator which writes it
// and the collector which reads it are all ours.
const onScopeDisposed = (fn: HookType) => hook('onScopeDisposed', fn);
const onScopeDisposedHooks = new HookCollector({ key: 'onScopeDisposed' });

// Naming the shape which performs collected actions is ours: the library
// neither calls a runner nor is handed one.
type HookRunner = (actions: HookAction[], context: ExecutionContext) => void;

// This runner performs the collected hooks in order and never awaits.
const run: HookRunner = (actions) => {
  for (const { hook, context } of actions) {
    hook(context);
  }
};

// Disposal is a scope event, and hanging the collection off it is ours: the
// library ships no module for that, and a module is just an `applyTo`. Every
// instance of the scope is collected into one list, so the runner orders the
// instances as well as the members.
const onScopeDisposedModule = (run: HookRunner): IContainerModule => ({
  applyTo: (container) =>
    container.scopeDisposed.subscribe((scope) => {
      run(
        scope.getInstances().flatMap((instance) => onScopeDisposedHooks.getActions(instance, { scope })),
        { scope },
      );
    }),
});

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
      .useModule(onScopeDisposedModule(run))
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromClass(LogsRepo));

    const logger = container.resolve<Logger>('logger');
    logger.log('Hello');
    const logsRepo = container.resolve<LogsRepo>('logsRepo');

    container.dispose();

    expect(logsRepo.savedLogs).toEqual(['Hello']);
  });
});
