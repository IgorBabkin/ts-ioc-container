import {
  Container,
  hasHooks,
  hook,
  type HookFn,
  HooksRunner,
  onConstruct,
  onConstructHooksRunner,
  onDispose,
  onDisposeHooksRunner,
  UnexpectedHookResultError,
} from '../lib';

const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const executeAsync: HookFn = async (ctx) => {
  await sleep(100);
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
      async initialize() {
        await sleep(100);
        this.isStarted = true;
      }

      @hook('onStart', executeAsync)
      async dispose() {
        await sleep(100);
        this.isStarted = false;
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(Logger);

    await onStartHooksRunner.executeAsync(instance, {
      scope: root,
      predicate: (methodName) => methodName === 'initialize',
    });

    expect(instance.isStarted).toBe(true);
    expect(hasHooks(instance, 'onStart')).toBe(true);
  });
});
