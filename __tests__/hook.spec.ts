import {
  Container,
  hook,
  HookFn,
  MetadataInjector,
  runHooks,
  onConstruct,
  onDispose,
  UnexpectedHookResultError,
  runOnConstructHooks,
  runOnDisposeHooks,
  runHooksAsync,
  hasHooks,
} from '../lib';

const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const executeAsync: HookFn = async (ctx) => {
  await sleep(100);
  await ctx.invokeMethod({ args: ctx.resolveArgs() });
};

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

    runHooks(instance, 'syncBefore', { scope: root });

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

    expect(() => runHooks(instance, 'syncBefore', { scope: root })).toThrowError(UnexpectedHookResultError);
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

    runOnConstructHooks(instance, root);
    runOnDisposeHooks(instance, root);

    expect(instance.isStarted).toBe(true);
    expect(instance.isDisposed).toBe(true);
  });

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

    await runHooksAsync(instance, 'onStart', {
      scope: root,
      predicate: (methodName) => methodName === 'initialize',
    });

    expect(instance.isStarted).toBe(true);
    expect(hasHooks(instance, 'onStart')).toBe(true);
  });
});
