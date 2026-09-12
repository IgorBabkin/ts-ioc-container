import 'reflect-metadata';
import {
  arg,
  bindTo,
  Container,
  GroupAliasToken,
  hasHooks,
  hook,
  type HookClass,
  HookContext,
  type HookFn,
  inject,
  oncePerInstance,
  parallel,
  HookCollector,
  ProxyRegistry,
  register,
  Registration as R,
  sequential,
} from '../../lib';
import { perform, runSequential, runSync } from './runners';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const execute: HookFn = (ctx) => {
  ctx.invokeMethod();
};
const invokeMethod = execute;

const executeAsync: HookFn = async (ctx) => {
  await ctx.invokeMethod();
};

describe('hooks', () => {
  it('should return the same context from setInitialArgs', () => {
    const root = new Container({ tags: ['root'] });
    const context = new HookContext({}, root, 'constructor');

    expect(context.setInitialArgs('arg1')).toBe(context);
  });

  it('should return the args passed to setInitialArgs from getInitialArgs', () => {
    const root = new Container({ tags: ['root'] });
    const context = new HookContext({}, root, 'constructor');

    context.setInitialArgs('arg1', 'arg2');

    expect(context.getInitialArgs()).toEqual(['arg1', 'arg2']);
  });

  it('should return an empty array from getInitialArgs when no initial args were set', () => {
    const root = new Container({ tags: ['root'] });
    const context = new HookContext({}, root, 'constructor');

    expect(context.getInitialArgs()).toEqual([]);
  });

  it('should prepend initial args when resolving hook method arguments', () => {
    const runBefore = perform(runSync(), new HookCollector({ key: 'syncBefore' }));

    class MyClass {
      receivedArgs: unknown[] = [];

      @hook('syncBefore', (ctx) => {
        ctx.invokeMethod();
      })
      start(@inject(arg(0)) firstArg: string, @inject('suffix') suffix: string, runtimeArg: string) {
        this.receivedArgs = [firstArg, suffix, runtimeArg];
      }
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromValue('injected').bindTo('suffix'));
    const instance = root.resolve(MyClass);

    runBefore(instance, {
      scope: root,
      createExecutionContext: (Target, scope, methodName) =>
        new HookContext(Target, scope, methodName).setInitialArgs('initial'),
    });

    expect(instance.receivedArgs).toEqual(['initial', 'injected', undefined]);
  });

  it('should map the hook context with mapExecutionContext when running execute', () => {
    const runBefore = perform(runSync(), new HookCollector({ key: 'syncBefore' }));

    class MyClass {
      receivedArgs: unknown[] = [];

      @hook('syncBefore', (ctx) => {
        ctx.invokeMethod();
      })
      start(@inject(arg(0)) firstArg: string, @inject('suffix') suffix: string) {
        this.receivedArgs = [firstArg, suffix];
      }
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromValue('injected').bindTo('suffix'));
    const instance = root.resolve(MyClass);

    runBefore(instance, {
      scope: root,
      mapExecutionContext: (context) => context.setInitialArgs('mapped'),
    });

    expect(instance.receivedArgs).toEqual(['mapped', 'injected']);
  });

  it('should map the hook context with mapExecutionContext when running async hooks', async () => {
    const runOnStart = perform(runSequential(), new HookCollector({ key: 'onStart' }));

    class MyClass {
      receivedArgs: unknown[] = [];

      @hook('onStart', async (ctx) => {
        await ctx.invokeMethod();
      })
      async start(@inject(arg(0)) firstArg: string) {
        this.receivedArgs = [firstArg];
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(MyClass);

    runOnStart(instance, {
      scope: root,
      mapExecutionContext: (context) => context.setInitialArgs('mapped'),
    });

    await vi.waitFor(() => expect(instance.receivedArgs).toEqual(['mapped']));
  });

  it('should run async hooks to completion', async () => {
    const runOnStart = perform(runSequential(), new HookCollector({ key: 'onStart' }));

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

    runOnStart(instance, {
      scope: root,
      predicate: (methodName) => methodName === 'initialize',
    });

    await vi.waitFor(() => expect(instance.isStarted).toBe(true));
    expect(hasHooks(instance, 'onStart')).toBe(true);
  });

  it('should finish sync hooks before returning', () => {
    const runOnStart = perform(runSync(), new HookCollector({ key: 'onStart' }));

    class MyClass {
      isStarted = false;

      @hook('onStart', execute)
      start() {
        this.isStarted = true;
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(MyClass);

    expect(runOnStart(instance, { scope: root })).toBeUndefined();
    expect(instance.isStarted).toBe(true);
  });

  it('should keep a chain sync up to its first async hook and await the rest', async () => {
    const runOnStart = perform(runSequential(), new HookCollector({ key: 'onStart' }));
    const invoked: string[] = [];

    class MyClass {
      @hook(
        'onStart',
        sequential(
          () => {
            invoked.push('first');
          },
          async () => {
            await sleep(1);
            invoked.push('second');
          },
          () => {
            invoked.push('third');
          },
        ),
      )
      start() {}
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(MyClass);

    runOnStart(instance, { scope: root });

    // the hooks ahead of the first async one have already run
    expect(invoked).toEqual(['first']);

    await vi.waitFor(() => expect(invoked).toEqual(['first', 'second', 'third']));
  });

  it('should run a mix of sync and async members through one call', async () => {
    const runOnStart = perform(runSequential(), new HookCollector({ key: 'onStart' }));
    const invoked: string[] = [];

    class MyClass {
      @hook('onStart', () => {
        invoked.push('sync');
      })
      start() {}

      @hook('onStart', async () => {
        await sleep(1);
        invoked.push('async');
      })
      warmUp() {}
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(MyClass);

    runOnStart(instance, { scope: root });

    await vi.waitFor(() => expect(invoked.sort()).toEqual(['async', 'sync']));
  });

  it('should report whether a target has hooks for a hook key', () => {
    class WithHooks {
      @hook('onStart', execute)
      start() {}
    }

    class WithoutHooks {
      start() {}
    }

    const root = new Container({ tags: ['root'] });

    expect(hasHooks(root.resolve(WithHooks), 'onStart')).toBe(true);
    expect(hasHooks(root.resolve(WithoutHooks), 'onStart')).toBe(false);
  });

  it('should report no hooks when the target has hooks under a different key only', () => {
    class MyClass {
      @hook('onDispose', execute)
      stop() {}
    }

    const root = new Container({ tags: ['root'] });

    expect(hasHooks(root.resolve(MyClass), 'onStart')).toBe(false);
  });

  // Hook metadata lives on the real class, so the hook API unwraps proxies itself -
  // a caller passes whatever the container handed it, wrapped or not.
  it('should find and run hooks through a proxy, wrapped or unwrapped', () => {
    const runOnStart = perform(runSync(), new HookCollector({ key: 'onStart' }));

    class MyClass {
      isStarted = false;

      @hook('onStart', execute)
      start() {
        this.isStarted = true;
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(MyClass);
    const proxy = ProxyRegistry.getInstance().createProxy(instance, {});

    expect(hasHooks(proxy, 'onStart')).toBe(true);
    expect(hasHooks(ProxyRegistry.getInstance().unwrap(proxy), 'onStart')).toBe(true);

    runOnStart(proxy, { scope: root });

    expect(instance.isStarted).toBe(true);
  });

  it('should run hooks on the real instance behind a lazy proxy', () => {
    const runOnStart = perform(runSync(), new HookCollector({ key: 'onStart' }));

    class MyClass {
      isStarted = false;

      @hook('onStart', execute)
      start() {
        this.isStarted = true;
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(MyClass);
    const lazy = ProxyRegistry.getInstance().createLazyProxy(() => instance);

    expect(hasHooks(lazy, 'onStart')).toBe(true);

    // The collector does not unwrap: the metadata lookup normalizes the target itself,
    // and the hook reaches the real object through the proxy.
    runOnStart(lazy, { scope: root });

    expect(instance.isStarted).toBe(true);
  });

  it('should run async hooks on the real instance behind a lazy proxy', async () => {
    const runOnStart = perform(runSequential(), new HookCollector({ key: 'onStart' }));

    class MyClass {
      isStarted = false;

      @hook('onStart', executeAsync)
      async start() {
        await sleep(1);
        this.isStarted = true;
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(MyClass);
    const lazy = ProxyRegistry.getInstance().createLazyProxy(() => instance);

    runOnStart(lazy, { scope: root });

    await vi.waitFor(() => expect(instance.isStarted).toBe(true));
  });

  it('should run hooks declared on a parent (extended-from) class', () => {
    const runOnStart = perform(runSync(), new HookCollector({ key: 'onStart' }));

    class Base {
      baseStarted = false;

      @hook('onStart', execute)
      startBase() {
        this.baseStarted = true;
      }
    }

    class Derived extends Base {
      derivedStarted = false;

      @hook('onStart', execute)
      startDerived() {
        this.derivedStarted = true;
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(Derived);

    runOnStart(instance, { scope: root });

    expect(instance.baseStarted).toBe(true);
    expect(instance.derivedStarted).toBe(true);
  });

  it('should run parent hooks before child hooks', () => {
    const runOnStart = perform(runSync(), new HookCollector({ key: 'onStart' }));
    const invoked: string[] = [];

    class Base {
      @hook('onStart', (ctx) => {
        invoked.push('startBase');
        ctx.invokeMethod();
      })
      startBase() {}
    }

    class Derived extends Base {
      @hook('onStart', (ctx) => {
        invoked.push('startDerived');
        ctx.invokeMethod();
      })
      startDerived() {}
    }

    const root = new Container({ tags: ['root'] });

    runOnStart(root.resolve(Derived), { scope: root });

    expect(invoked).toEqual(['startBase', 'startDerived']);
  });

  it('should not leak child hooks into parent instances', () => {
    const runOnStart = perform(runSync(), new HookCollector({ key: 'onStart' }));
    const invoked: string[] = [];

    class Base {
      @hook('onStart', (ctx) => {
        invoked.push('startBase');
        ctx.invokeMethod();
      })
      startBase() {}
    }

    class Derived extends Base {
      @hook('onStart', (ctx) => {
        invoked.push('startDerived');
        ctx.invokeMethod();
      })
      startDerived() {}
    }

    const root = new Container({ tags: ['root'] });

    runOnStart(root.resolve(Base), { scope: root });

    expect(invoked).toEqual(['startBase']);
    expect(Derived).toBeDefined();
  });

  it('should execute plugin hooks for lazily injected plugins', () => {
    const runOnPluginStart = perform(runSync(), new HookCollector({ key: 'onPluginStart' }));
    const PluginToken = new GroupAliasToken<Plugin>('Plugin');

    interface Plugin {
      isStarted: boolean;
    }

    @register(bindTo(PluginToken))
    class FirstPlugin implements Plugin {
      isStarted = false;

      @hook('onPluginStart', execute)
      start() {
        this.isStarted = true;
      }
    }

    @register(bindTo(PluginToken))
    class SecondPlugin implements Plugin {
      isStarted = false;

      @hook('onPluginStart', execute)
      start() {
        this.isStarted = true;
      }
    }

    class App {
      constructor(@inject(PluginToken.lazy()) private readonly plugins: Plugin[]) {}

      runPlugins(scope: Container) {
        this.plugins.forEach((plugin) => runOnPluginStart(plugin, { scope }));
      }

      getPlugins() {
        return this.plugins;
      }
    }

    const container = new Container()
      .addRegistration(R.fromClass(FirstPlugin))
      .addRegistration(R.fromClass(SecondPlugin));

    const app = container.resolve(App);

    app.runPlugins(container);

    expect(app.getPlugins().every((plugin) => plugin.isStarted)).toBe(true);
  });

  it('should run hooks combined with sequential in declaration order', () => {
    const runOnStart = perform(runSync(), new HookCollector({ key: 'onStart' }));
    const invoked: string[] = [];

    class MyClass {
      @hook(
        'onStart',
        sequential(
          () => {
            invoked.push('first');
          },
          () => {
            invoked.push('second');
          },
        ),
      )
      start() {}
    }

    const root = new Container({ tags: ['root'] });
    runOnStart(root.resolve(MyClass), { scope: root });

    expect(invoked).toEqual(['first', 'second']);
  });

  it('should await each hook of a sequential combination before the next one', async () => {
    const runOnStart = perform(runSequential(), new HookCollector({ key: 'onStart' }));
    const invoked: string[] = [];

    class MyClass {
      @hook(
        'onStart',
        sequential(
          async () => {
            await sleep(10);
            invoked.push('slow');
          },
          () => {
            invoked.push('fast');
          },
        ),
      )
      start() {}
    }

    const root = new Container({ tags: ['root'] });
    runOnStart(root.resolve(MyClass), { scope: root });

    await sleep(30);

    expect(invoked).toEqual(['slow', 'fast']);
  });

  it('should start every hook of a parallel combination at once', async () => {
    const runOnStart = perform(runSequential(), new HookCollector({ key: 'onStart' }));
    const invoked: string[] = [];

    class MyClass {
      @hook(
        'onStart',
        parallel(
          async () => {
            await sleep(10);
            invoked.push('slow');
          },
          () => {
            invoked.push('fast');
          },
        ),
      )
      start() {}
    }

    const root = new Container({ tags: ['root'] });
    runOnStart(root.resolve(MyClass), { scope: root });

    await sleep(30);

    expect(invoked).toEqual(['fast', 'slow']);
  });

  it('should run a combination nested in another combination', async () => {
    const runOnStart = perform(runSequential(), new HookCollector({ key: 'onStart' }));
    const invoked: string[] = [];
    const record = (name: string) => () => {
      invoked.push(name);
    };

    class MyClass {
      @hook('onStart', sequential(record('first'), parallel(record('second'), record('third')), record('fourth')))
      start() {}
    }

    const root = new Container({ tags: ['root'] });
    runOnStart(root.resolve(MyClass), { scope: root });

    await sleep(10);

    expect(invoked).toEqual(['first', 'second', 'third', 'fourth']);
  });

  it('should resolve a hook class passed to a combination', () => {
    const runOnStart = perform(runSync(), new HookCollector({ key: 'onStart' }));
    const invoked: string[] = [];

    class RecordHook implements HookClass {
      execute() {
        invoked.push('class');
      }
    }

    class MyClass {
      @hook(
        'onStart',
        sequential(RecordHook, () => {
          invoked.push('fn');
        }),
      )
      start() {}
    }

    const root = new Container({ tags: ['root'] });
    runOnStart(root.resolve(MyClass), { scope: root });

    expect(invoked).toEqual(['class', 'fn']);
  });

  it('should keep the last declared hook when a member is decorated twice under one key', () => {
    const runOnStart = perform(runSync(), new HookCollector({ key: 'onStart' }));
    const invoked: string[] = [];

    class MyClass {
      // A member carries one hook per key, and decorators are applied bottom-up,
      // so the topmost decorator is the one which stays.
      @hook('onStart', () => {
        invoked.push('outer');
      })
      @hook('onStart', () => {
        invoked.push('inner');
      })
      start() {}
    }

    const root = new Container({ tags: ['root'] });
    runOnStart(root.resolve(MyClass), { scope: root });

    expect(invoked).toEqual(['outer']);
  });

  it('should run a hook wrapped in oncePerInstance a single time per instance under any hook key', () => {
    const runOnStart = perform(runSync(), new HookCollector({ key: 'onStart' }));
    const invoked: string[] = [];

    class MyClass {
      @hook('onStart', oncePerInstance(invokeMethod))
      start() {
        invoked.push('start');
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(MyClass);

    runOnStart(instance, { scope: root });
    runOnStart(instance, { scope: root });

    expect(invoked).toEqual(['start']);
  });

  it('should run a whole sequence a single time per instance when wrapped in oncePerInstance', () => {
    const runOnStart = perform(runSync(), new HookCollector({ key: 'onStart' }));
    const invoked: string[] = [];
    const record = (name: string) => () => {
      invoked.push(name);
    };

    class MyClass {
      @hook('onStart', oncePerInstance(sequential(record('connect'), record('warmUp'))))
      start() {}
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(MyClass);

    runOnStart(instance, { scope: root });
    runOnStart(instance, { scope: root });

    expect(invoked).toEqual(['connect', 'warmUp']);
  });

  it('should run oncePerInstance hooks independently for each instance', () => {
    const runOnStart = perform(runSync(), new HookCollector({ key: 'onStart' }));

    class MyClass {
      startedTimes = 0;

      @hook('onStart', oncePerInstance(invokeMethod))
      start() {
        this.startedTimes += 1;
      }
    }

    const root = new Container({ tags: ['root'] });
    const first = root.resolve(MyClass);
    const second = root.resolve(MyClass);

    runOnStart(first, { scope: root });
    runOnStart(first, { scope: root });
    runOnStart(second, { scope: root });

    expect([first.startedTimes, second.startedTimes]).toEqual([1, 1]);
  });

  it('should resolve a hook class declared directly on a member', () => {
    const runOnStart = perform(runSync(), new HookCollector({ key: 'onStart' }));
    const invoked: string[] = [];

    class StartHook implements HookClass {
      execute() {
        invoked.push('started');
      }
    }

    class MyClass {
      @hook('onStart', StartHook)
      start() {}
    }

    const root = new Container({ tags: ['root'] });
    runOnStart(root.resolve(MyClass), { scope: root });

    expect(invoked).toEqual(['started']);
  });
});
