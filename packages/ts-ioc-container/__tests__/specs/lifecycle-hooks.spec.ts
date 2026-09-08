import 'reflect-metadata';
import {
  MetadataInjector,
  OnConstructModule,
  OnDisposeModule,
  OnResolvedModule,
  append,
  Container,
  hasHooks,
  hook,
  HookContext,
  type HookFn,
  HooksRunner,
  inject,
  injectProp,
  onConstruct,
  onScopeDisposed,
  onResolved,
  onceResolved,
  onResolve,
  Registration as R,
} from '../../lib';

const invoke: HookFn = (context) => {
  context.invokeMethod();
};

describe('Spec: lifecycle hooks', () => {
  it('runs construct and dispose hooks through opt-in modules', () => {
    class Resource {
      initialized = false;
      disposed = false;

      @onConstruct(invoke)
      initialize(): void {
        this.initialized = true;
      }

      @onScopeDisposed(invoke)
      destroy(): void {
        this.disposed = true;
      }
    }

    const container = new Container({ injector: new MetadataInjector().useModule(new OnConstructModule()) })
      .useModule(new OnDisposeModule())
      .addRegistration(R.fromClass(Resource));

    const resource = container.resolve<Resource>('Resource');

    expect(resource.initialized).toBe(true);

    container.dispose();

    expect(resource.disposed).toBe(true);
  });

  it('runs resolve hooks on every resolve, and once-resolve hooks a single time per object', () => {
    class Connection {
      usedTimes = 0;
      openedTimes = 0;

      @onResolved()
      use(): void {
        this.usedTimes += 1;
      }

      @onceResolved()
      open(): void {
        this.openedTimes += 1;
      }
    }

    const connection = new Connection();
    const container = new Container()
      .useModule(new OnResolvedModule())
      .addRegistration(R.fromValue(connection).bindToKey('Connection'))
      .addRegistration(R.fromValue(connection).bindToKey('ReadOnlyConnection'));

    container.resolve('Connection');
    container.createScope().resolve('ReadOnlyConnection');

    expect([connection.usedTimes, connection.openedTimes]).toEqual([2, 1]);
  });

  it('runs stacked @onConstruct decorators in declaration order', () => {
    const invoked: string[] = [];
    const h1: HookFn = () => {
      invoked.push('h1');
    };
    const h2: HookFn = () => {
      invoked.push('h2');
    };

    class Resource {
      @onConstruct(h1)
      @onConstruct(h2)
      initialize(): void {}
    }

    const container = new Container({
      injector: new MetadataInjector().useModule(new OnConstructModule()),
    }).addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');

    expect(invoked).toEqual(['h1', 'h2']);
  });

  it('runs hooks of a single @onConstruct decorator in argument order', () => {
    const invoked: string[] = [];

    class Resource {
      @onConstruct(
        () => {
          invoked.push('h1');
        },
        () => {
          invoked.push('h2');
        },
      )
      initialize(): void {}
    }

    const container = new Container({
      injector: new MetadataInjector().useModule(new OnConstructModule()),
    }).addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');

    expect(invoked).toEqual(['h1', 'h2']);
  });

  it('keeps declaration order when stacked @onConstruct decorators carry several hooks each', () => {
    const invoked: string[] = [];
    const push =
      (label: string): HookFn =>
      () => {
        invoked.push(label);
      };

    class Resource {
      @onConstruct(push('h1'), push('h2'))
      @onConstruct(push('h3'), push('h4'))
      initialize(): void {}
    }

    const container = new Container({
      injector: new MetadataInjector().useModule(new OnConstructModule()),
    }).addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');

    expect(invoked).toEqual(['h1', 'h2', 'h3', 'h4']);
  });

  it('runs stacked @onScopeDisposed decorators in declaration order', () => {
    const invoked: string[] = [];

    class Resource {
      @onScopeDisposed(() => {
        invoked.push('h1');
      })
      @onScopeDisposed(() => {
        invoked.push('h2');
      })
      destroy(): void {}
    }

    const container = new Container().useModule(new OnDisposeModule()).addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');
    container.dispose();

    expect(invoked).toEqual(['h1', 'h2']);
  });

  it('runs stacked async @onConstruct decorators in declaration order', async () => {
    const invoked: string[] = [];

    class Resource {
      @onConstruct(async () => {
        invoked.push('h1');
      })
      @onConstruct(async () => {
        invoked.push('h2');
      })
      async initialize(): Promise<void> {}
    }

    const container = new Container({
      injector: new MetadataInjector().useModule(new OnConstructModule()),
    }).addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');

    await vi.waitFor(() => expect(invoked).toEqual(['h1', 'h2']));
  });

  it('runs async construct hooks without blocking resolution', async () => {
    class Resource {
      initialized = false;

      @onConstruct(async (context) => {
        await context.invokeMethod();
      })
      async initialize(): Promise<void> {
        await Promise.resolve();
        this.initialized = true;
      }
    }

    const container = new Container({
      injector: new MetadataInjector().useModule(new OnConstructModule()),
    }).addRegistration(R.fromClass(Resource));

    const resource = container.resolve<Resource>('Resource');

    expect(resource.initialized).toBe(false);

    await vi.waitFor(() => expect(resource.initialized).toBe(true));
  });

  it('reports rejected async construct hooks to the module exception handler', async () => {
    const failure = new Error('boom');

    class BrokenResource {
      @onConstruct(() => Promise.reject(failure))
      initialize(): void {}
    }

    let captured: unknown;
    const container = new Container({
      injector: new MetadataInjector().useModule(new OnConstructModule((ex) => (captured = ex))),
    }).addRegistration(R.fromClass(BrokenResource));

    container.resolve<BrokenResource>('BrokenResource');

    await vi.waitFor(() => expect(captured).toBe(failure));
  });

  it('injects properties through hook context scope', () => {
    class Logger {
      readonly name = 'logger';
    }

    class Service {
      @onConstruct(injectProp('Logger'))
      logger!: Logger;
    }

    const container = new Container({ injector: new MetadataInjector().useModule(new OnConstructModule()) })
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromClass(Service));

    expect(container.resolve<Service>('Service').logger).toBeInstanceOf(Logger);
  });

  it('executes custom hooks with predicates and hook classes', () => {
    class AuditHook {
      execute(context: Omit<HookContext, 'scope'>): void {
        context.invokeMethod();
      }
    }

    class Worker {
      calls: string[] = [];

      @hook('workflow', append(AuditHook))
      start(): void {
        this.calls.push('start');
      }

      @hook('workflow', append(invoke))
      stop(): void {
        this.calls.push('stop');
      }
    }

    const runner = new HooksRunner('workflow');
    const container = new Container().addRegistration(R.fromClass(AuditHook)).addRegistration(R.fromClass(Worker));
    const worker = container.resolve<Worker>('Worker');

    runner.execute(worker, {
      scope: container,
      predicate: (methodName) => methodName === 'start',
    });

    expect(hasHooks(worker, 'workflow')).toBe(true);
    expect(worker.calls).toEqual(['start']);
  });

  it('runs direct disposal callbacks registered with onScopeDisposed', () => {
    const disposed: string[] = [];

    const container = new Container({ tags: ['app'] }).onScopeDisposed((c) => {
      if (c.hasTag('app')) disposed.push('app');
    });

    container.dispose();

    expect(disposed).toEqual(['app']);
  });

  it('registers each hook with the domain which raises it', () => {
    const log: string[] = [];

    class Service {}

    // Injector domain — construction. Configured before the container owns it.
    const injector = new MetadataInjector().onConstructed((instance) =>
      log.push(`constructed:${instance.constructor.name}`),
    );

    const container = new Container({ injector, tags: ['app'] })
      // Scope domain — the container's own events.
      .onScopeCreated((scope) => log.push(`scopeCreated:${scope.hasTag('request')}`))
      .onScopeDisposed(() => log.push('scopeDisposed'))
      .onRegistered((_provider, key) => log.push(`registered:${String(key)}`));

    container.addRegistration(
      // Provider domain — resolution.
      R.fromClass(Service).pipe(
        onResolve((dependency) => log.push(`resolved:${(dependency as object).constructor.name}`)),
      ),
    );

    const scope = container.createScope({ tags: ['request'] });
    scope.resolve<Service>('Service');
    scope.dispose();

    expect(log).toEqual([
      'registered:Service',
      'registered:Service',
      'scopeCreated:true',
      'constructed:Service',
      'resolved:Service',
      'scopeDisposed',
    ]);
  });

  it('shares injector hooks with every scope built on the same injector', () => {
    const constructed: string[] = [];

    class Service {}

    const injector = new MetadataInjector();
    const container = new Container({ injector, tags: ['app'] }).addRegistration(R.fromClass(Service));
    const scope = container.createScope({ tags: ['request'] });

    // Registered after both scopes exist: one injector backs the whole tree, so
    // the hook covers every scope in it, whenever it was added.
    injector.onConstructed((_instance, s) => constructed.push(s.hasTag('request') ? 'request' : 'app'));

    container.resolve<Service>('Service');
    scope.resolve<Service>('Service');

    expect(constructed).toEqual(['app', 'request']);
  });

  it('resolves hook method arguments and takes sync and async hooks through one runner', async () => {
    class Worker {
      calls: string[] = [];

      @hook('sync', append(invoke))
      start(@inject('prefix') prefix: string): void {
        this.calls.push(`${prefix}:sync`);
      }

      @hook(
        'async',
        append(async (context) => {
          context.invokeMethod();
        }),
      )
      stop(@inject('prefix') prefix: string): void {
        this.calls.push(`${prefix}:async`);
      }
    }

    const container = new Container()
      .addRegistration(R.fromValue('job').bindToKey('prefix'))
      .addRegistration(R.fromClass(Worker));
    const worker = container.resolve<Worker>('Worker');

    // Sync hooks finish before `execute` returns, so it hands back no promise to await.
    expect(new HooksRunner('sync').execute(worker, { scope: container })).toBeUndefined();
    expect(worker.calls).toEqual(['job:sync']);

    await new HooksRunner('async').execute(worker, { scope: container });

    expect(worker.calls).toEqual(['job:sync', 'job:async']);
  });
});
