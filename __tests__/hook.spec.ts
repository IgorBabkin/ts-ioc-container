import {
  Container,
  hasHooks,
  hook,
  type HookFn,
  HooksRunner,
  inject,
  onConstruct,
  onConstructHooksRunner,
  onDispose,
  onDisposeHooksRunner,
  Registration as R,
  UnexpectedHookResultError,
} from '../lib';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

const executeAsync: HookFn = async (ctx) => {
  await ctx.invokeMethod({ args: ctx.resolveArgs() });
};

const beforeHooksRunner = new HooksRunner('syncBefore');
describe('hooks', () => {
  it('should run runHooks only for sync hooks', () => {
    class MyClass {
      isStarted = false;

      @hook('syncBefore', execute)
      start() {
        this.isStarted = true;
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(MyClass);

    beforeHooksRunner.execute(instance, { scope: root });

    expect(instance.isStarted).toBe(true);
  });

  it('should throw an error if runHooks is used for async hooks', async () => {
    class MyClass {
      instanciated = false;

      @hook('syncBefore', executeAsync)
      start() {
        this.instanciated = true;
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(MyClass);

    expect(() => beforeHooksRunner.execute(instance, { scope: root })).toThrowError(UnexpectedHookResultError);
  });

  it('should test hooks', () => {
    class Logger {
      isStarted = false;
      isDisposed = false;

      @onConstruct(execute)
      initialize(): void {
        this.isStarted = true;
      }

      @onDispose(execute)
      destroy(): void {
        this.isDisposed = true;
      }
    }

    const root = new Container({ tags: ['root'] })
      .addOnConstructHook((instance, scope) => {
        onConstructHooksRunner.execute(instance, { scope });
      })
      .addOnDisposeHook((scope) => {
        for (const i of scope.getInstances()) {
          onDisposeHooksRunner.execute(i, { scope });
        }
      });

    const instance = root.resolve(Logger);
    root.dispose();

    expect(instance.isStarted).toBe(true);
    expect(instance.isDisposed).toBe(true);
  });

  const onStartHooksRunner = new HooksRunner('onStart');
  it('should test runHooksAsync', async () => {
    class Logger {
      isStarted = false;

      @hook('onStart', executeAsync)
      async initialize(@inject('TimeToSleep') timeToSleep: number) {
        await sleep(timeToSleep);
        this.isStarted = true;
      }

      @hook('onStart', executeAsync)
      async dispose(@inject('TimeToSleep') timeToSleep: number) {
        await sleep(timeToSleep);
        this.isStarted = false;
      }
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromValue(100).bindTo('TimeToSleep'));
    const instance = root.resolve(Logger);

    await onStartHooksRunner.executeAsync(instance, {
      scope: root,
      predicate: (methodName) => methodName === 'initialize',
    });

    expect(instance.isStarted).toBe(true);
    expect(hasHooks(instance, 'onStart')).toBe(true);
  });
});
