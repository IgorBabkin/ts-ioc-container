import {
  AddOnConstructHookModule,
  AddOnDisposeHookModule,
  args,
  bindTo,
  Container,
  GroupAliasToken,
  hasHooks,
  hook,
  HookContext,
  type HookFn,
  HooksRunner,
  inject,
  onConstruct,
  onDispose,
  register,
  Registration as R,
  UnexpectedHookResultError,
} from '../../lib';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const execute: HookFn = (ctx) => {
  ctx.invokeMethod();
};

const executeAsync: HookFn = async (ctx) => {
  await ctx.invokeMethod();
};

const beforeHooksRunner = new HooksRunner('syncBefore');
describe('hooks', () => {
  it('should return the same context from setInitialArgs', () => {
    const root = new Container({ tags: ['root'] });
    const context = new HookContext({}, root, 'constructor');

    expect(context.setInitialArgs('arg1')).toBe(context);
  });

  it('should prepend initial args when resolving hook method arguments', () => {
    class MyClass {
      receivedArgs: unknown[] = [];

      @hook('syncBefore', (ctx) => {
        ctx.invokeMethod();
      })
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
      .useModule(new AddOnConstructHookModule())
      .useModule(new AddOnDisposeHookModule());

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

  it('should execute plugin hooks for lazily injected plugins', () => {
    const onPluginStartHooksRunner = new HooksRunner('onPluginStart');
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
});
