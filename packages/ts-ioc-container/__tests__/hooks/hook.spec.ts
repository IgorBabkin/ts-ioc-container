import 'reflect-metadata';
import {
  append,
  appendHooks,
  args,
  bindTo,
  Container,
  GroupAliasToken,
  hasHooks,
  hook,
  type HookClass,
  HookContext,
  type HookFn,
  HooksRunner,
  inject,
  prepend,
  prependHooks,
  register,
  Registration as R,
} from '../../lib';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const execute: HookFn = (ctx) => {
  ctx.invokeMethod();
};

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
    const beforeHooksRunner = new HooksRunner('syncBefore');

    class MyClass {
      receivedArgs: unknown[] = [];

      @hook(
        'syncBefore',
        append((ctx) => {
          ctx.invokeMethod();
        }),
      )
      start(@inject(args(0)) firstArg: string, @inject('suffix') suffix: string, runtimeArg: string) {
        this.receivedArgs = [firstArg, suffix, runtimeArg];
      }
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromValue('injected').bindTo('suffix'));
    const instance = root.resolve(MyClass);

    beforeHooksRunner.execute(instance, {
      scope: root,
      createContext: (Target, scope, methodName) =>
        new HookContext(Target, scope, methodName).setInitialArgs('initial'),
    });

    expect(instance.receivedArgs).toEqual(['initial', 'injected', undefined]);
  });

  it('should map the hook context with mapContext when running execute', () => {
    const beforeHooksRunner = new HooksRunner('syncBefore');

    class MyClass {
      receivedArgs: unknown[] = [];

      @hook(
        'syncBefore',
        append((ctx) => {
          ctx.invokeMethod();
        }),
      )
      start(@inject(args(0)) firstArg: string, @inject('suffix') suffix: string) {
        this.receivedArgs = [firstArg, suffix];
      }
    }

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromValue('injected').bindTo('suffix'));
    const instance = root.resolve(MyClass);

    beforeHooksRunner.execute(instance, {
      scope: root,
      mapContext: (context) => context.setInitialArgs('mapped'),
    });

    expect(instance.receivedArgs).toEqual(['mapped', 'injected']);
  });

  it('should map the hook context with mapContext when running executeAsync', async () => {
    const onStartHooksRunner = new HooksRunner('onStart');

    class MyClass {
      receivedArgs: unknown[] = [];

      @hook(
        'onStart',
        append(async (ctx) => {
          await ctx.invokeMethod();
        }),
      )
      async start(@inject(args(0)) firstArg: string) {
        this.receivedArgs = [firstArg];
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(MyClass);

    await onStartHooksRunner.executeAsync(instance, {
      scope: root,
      mapContext: (context) => context.setInitialArgs('mapped'),
    });

    expect(instance.receivedArgs).toEqual(['mapped']);
  });

  it('should run executeAsync for async hooks', async () => {
    const onStartHooksRunner = new HooksRunner('onStart');

    class Logger {
      isStarted = false;

      @hook('onStart', append(executeAsync))
      async initialize(@inject('TimeToSleep') timeToSleep: number) {
        await sleep(timeToSleep);
        this.isStarted = true;
      }

      @hook('onStart', append(executeAsync))
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

  it('should report whether a target has hooks for the runner key', () => {
    const onStartHooksRunner = new HooksRunner('onStart');

    class WithHooks {
      @hook('onStart', append(execute))
      start() {}
    }

    class WithoutHooks {
      start() {}
    }

    const root = new Container({ tags: ['root'] });

    expect(onStartHooksRunner.hasHooks(root.resolve(WithHooks))).toBe(true);
    expect(onStartHooksRunner.hasHooks(root.resolve(WithoutHooks))).toBe(false);
  });

  it('should report no hooks when the target has hooks under a different key only', () => {
    const onStartHooksRunner = new HooksRunner('onStart');

    class MyClass {
      @hook('onDispose', append(execute))
      stop() {}
    }

    const root = new Container({ tags: ['root'] });

    expect(onStartHooksRunner.hasHooks(root.resolve(MyClass))).toBe(false);
  });

  it('should run hooks declared on a parent (extended-from) class', () => {
    const onStartHooksRunner = new HooksRunner('onStart');

    class Base {
      baseStarted = false;

      @hook('onStart', append(execute))
      startBase() {
        this.baseStarted = true;
      }
    }

    class Derived extends Base {
      derivedStarted = false;

      @hook('onStart', append(execute))
      startDerived() {
        this.derivedStarted = true;
      }
    }

    const root = new Container({ tags: ['root'] });
    const instance = root.resolve(Derived);

    onStartHooksRunner.execute(instance, { scope: root });

    expect(instance.baseStarted).toBe(true);
    expect(instance.derivedStarted).toBe(true);
  });

  it('should run parent hooks before child hooks', () => {
    const onStartHooksRunner = new HooksRunner('onStart');
    const invoked: string[] = [];

    class Base {
      @hook(
        'onStart',
        append((ctx) => {
          invoked.push('startBase');
          ctx.invokeMethod();
        }),
      )
      startBase() {}
    }

    class Derived extends Base {
      @hook(
        'onStart',
        append((ctx) => {
          invoked.push('startDerived');
          ctx.invokeMethod();
        }),
      )
      startDerived() {}
    }

    const root = new Container({ tags: ['root'] });

    onStartHooksRunner.execute(root.resolve(Derived), { scope: root });

    expect(invoked).toEqual(['startBase', 'startDerived']);
  });

  it('should not leak child hooks into parent instances', () => {
    const onStartHooksRunner = new HooksRunner('onStart');
    const invoked: string[] = [];

    class Base {
      @hook(
        'onStart',
        append((ctx) => {
          invoked.push('startBase');
          ctx.invokeMethod();
        }),
      )
      startBase() {}
    }

    class Derived extends Base {
      @hook(
        'onStart',
        append((ctx) => {
          invoked.push('startDerived');
          ctx.invokeMethod();
        }),
      )
      startDerived() {}
    }

    const root = new Container({ tags: ['root'] });

    onStartHooksRunner.execute(root.resolve(Base), { scope: root });

    expect(invoked).toEqual(['startBase']);
    expect(Derived).toBeDefined();
  });

  it('should execute plugin hooks for lazily injected plugins', () => {
    const onPluginStartHooksRunner = new HooksRunner('onPluginStart');
    const PluginToken = new GroupAliasToken<Plugin>('Plugin');

    interface Plugin {
      isStarted: boolean;
    }

    @register(bindTo(PluginToken))
    class FirstPlugin implements Plugin {
      isStarted = false;

      @hook('onPluginStart', append(execute))
      start() {
        this.isStarted = true;
      }
    }

    @register(bindTo(PluginToken))
    class SecondPlugin implements Plugin {
      isStarted = false;

      @hook('onPluginStart', append(execute))
      start() {
        this.isStarted = true;
      }
    }

    class App {
      constructor(@inject(PluginToken.lazy()) private readonly plugins: Plugin[]) {}

      runPlugins(scope: Container) {
        this.plugins.forEach((plugin) => onPluginStartHooksRunner.execute(plugin, { scope }));
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

  it('should run hooks passed to appendHooks in declaration order', () => {
    const onStartHooksRunner = new HooksRunner('onStart');
    const invoked: string[] = [];

    class MyClass {
      @hook(
        'onStart',
        appendHooks(
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
    onStartHooksRunner.execute(root.resolve(MyClass), { scope: root });

    expect(invoked).toEqual(['first', 'second']);
  });

  it('should add hooks after the already registered ones with appendHooks', () => {
    const onStartHooksRunner = new HooksRunner('onStart');
    const invoked: string[] = [];

    class MyClass {
      // Decorators are applied bottom-up, so 'declared' is registered first
      @hook(
        'onStart',
        appendHooks(() => {
          invoked.push('appended');
        }),
      )
      @hook(
        'onStart',
        appendHooks(() => {
          invoked.push('declared');
        }),
      )
      start() {}
    }

    const root = new Container({ tags: ['root'] });
    onStartHooksRunner.execute(root.resolve(MyClass), { scope: root });

    expect(invoked).toEqual(['declared', 'appended']);
  });

  it('should add hooks before the already registered ones with prependHooks', () => {
    const onStartHooksRunner = new HooksRunner('onStart');
    const invoked: string[] = [];

    class MyClass {
      @hook(
        'onStart',
        prependHooks(() => {
          invoked.push('prepended');
        }),
      )
      @hook(
        'onStart',
        appendHooks(() => {
          invoked.push('declared');
        }),
      )
      start() {}
    }

    const root = new Container({ tags: ['root'] });
    onStartHooksRunner.execute(root.resolve(MyClass), { scope: root });

    expect(invoked).toEqual(['prepended', 'declared']);
  });

  it('should expose append and prepend as aliases of appendHooks and prependHooks', () => {
    expect(append).toBe(appendHooks);
    expect(prepend).toBe(prependHooks);
  });

  it('should let a custom mapFn reorder the already registered hooks', () => {
    const onStartHooksRunner = new HooksRunner('onStart');
    const invoked: string[] = [];

    class MyClass {
      @hook('onStart', (...prev) => [...prev].reverse())
      @hook(
        'onStart',
        appendHooks(
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
    onStartHooksRunner.execute(root.resolve(MyClass), { scope: root });

    expect(invoked).toEqual(['second', 'first']);
  });

  it('should replace the already registered hooks when mapFn ignores them', () => {
    const onStartHooksRunner = new HooksRunner('onStart');
    const invoked: string[] = [];

    class MyClass {
      @hook('onStart', () => [
        () => {
          invoked.push('replacement');
        },
      ])
      @hook(
        'onStart',
        appendHooks(() => {
          invoked.push('replaced');
        }),
      )
      start() {}
    }

    const root = new Container({ tags: ['root'] });
    onStartHooksRunner.execute(root.resolve(MyClass), { scope: root });

    expect(invoked).toEqual(['replacement']);
  });

  it('should accept hook classes in appendHooks and prependHooks', () => {
    const onStartHooksRunner = new HooksRunner('onStart');
    const invoked: string[] = [];

    class AppendedHook implements HookClass {
      execute() {
        invoked.push('appended');
      }
    }

    class PrependedHook implements HookClass {
      execute() {
        invoked.push('prepended');
      }
    }

    class MyClass {
      @hook('onStart', prependHooks(PrependedHook))
      @hook('onStart', appendHooks(AppendedHook))
      start() {}
    }

    const root = new Container({ tags: ['root'] });
    onStartHooksRunner.execute(root.resolve(MyClass), { scope: root });

    expect(invoked).toEqual(['prepended', 'appended']);
  });
});
