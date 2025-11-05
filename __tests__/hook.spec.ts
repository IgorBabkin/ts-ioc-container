import {
  AsyncHooksRunner,
  Container,
  hasHooks,
  hook,
  type HookFn,
  onConstruct,
  onConstructHooksRunner,
  onDispose,
  onDisposeHooksRunner,
  SyncHooksRunner,
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

const syncBeforeHooksRunner = new SyncHooksRunner('syncBefore');
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

    syncBeforeHooksRunner.execute(instance, { scope: root });

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

    expect(() => syncBeforeHooksRunner.execute(instance, { scope: root })).toThrowError(UnexpectedHookResultError);
  });

  it('should test hooks', () => {
    class Logger {
      isStarted = false;
      isDisposed = false;

      @onConstruct(execute)
      initialize(): void {
        this.isStarted = true;
      }

      @onDispose
      destroy(): void {
        this.isDisposed = true;
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(Logger);

    onConstructHooksRunner.execute(instance, { scope: root });
    onDisposeHooksRunner.execute(instance, { scope: root });

    expect(instance.isStarted).toBe(true);
    expect(instance.isDisposed).toBe(true);
  });

  const onStartHooksRunner = new AsyncHooksRunner('onStart');
  it('should test runHooksAsync', async () => {
    class Logger {
      isStarted = false;

      @hook('onStart', async (c) => {
        await sleep(100);
        c.invokeMethod({ args: c.resolveArgs() });
      })
      initialize(): void {
        this.isStarted = true;
      }

      @hook('onStart', async (c) => {
        await sleep(100);
        c.invokeMethod({ args: c.resolveArgs() });
      })
      dispose(): void {
        this.isStarted = false;
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(Logger);

    await onStartHooksRunner.execute(instance, {
      scope: root,
      predicate: (methodName) => methodName === 'initialize',
    });

    expect(instance.isStarted).toBe(true);
    expect(hasHooks(instance, 'onStart')).toBe(true);
  });
});
