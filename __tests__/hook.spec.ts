import { Container, hook, HookFn, MetadataInjector, runHooks, runHooksAsync, UnexpectedHookResultError } from '../lib';

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

    const root = new Container(new MetadataInjector(), { tags: ['root'] });
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

    const root = new Container(new MetadataInjector(), { tags: ['root'] });
    const instance = root.resolve(MyClass);

    expect(() => runHooks(instance, 'syncBefore', { scope: root })).toThrowError(UnexpectedHookResultError);
  });
});
