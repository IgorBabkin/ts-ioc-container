import 'reflect-metadata';
import { expectTypeOf } from 'vitest';
import {
  Container,
  EmptyContainer,
  hasHooks,
  hook,
  HookContext,
  type HookFn,
  inject,
  injectProp,
  MetadataInjector,
  MethodNotImplementedError,
  oncePerInstance,
  OnConstructModule,
  OnDisposeModule,
  onResolve,
  OnResolvedModule,
  Provider,
  Registration as R,
  parallel,
  sequential,
  HookCollector,
} from '../../lib';
import { perform, runSequential, runSync } from '../hooks/runners';
import {
  onConstruct,
  onConstructHooks,
  onResolved,
  onResolvedHooks,
  onScopeDisposed,
  onScopeDisposedHooks,
} from '../hooks/decorators';

const invoke: HookFn = (context) => {
  context.invokeMethod();
};

// The library collects; the caller runs. These stand in for an app's own runners:
// one which never awaits, one which awaits each action before the next.
const performSync = (key: string) => perform(runSync(), new HookCollector({ key }));
const performAwaited = (key: string) => perform(runSequential(), new HookCollector({ key }));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    const container = new Container()
      .useModule(new OnConstructModule(runSync(), onConstructHooks))
      .useModule(new OnDisposeModule(runSync(), onScopeDisposedHooks))
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

      @onResolved(invoke)
      use(): void {
        this.usedTimes += 1;
      }

      @onResolved(oncePerInstance(invoke))
      open(): void {
        this.openedTimes += 1;
      }
    }

    const connection = new Connection();
    const container = new Container()
      .useModule(new OnResolvedModule(runSync(), onResolvedHooks))
      .addRegistration(R.fromValue(connection).bindToKey('Connection'))
      .addRegistration(R.fromValue(connection).bindToKey('ReadOnlyConnection'));

    container.resolve('Connection');
    container.createScope().resolve('ReadOnlyConnection');

    expect([connection.usedTimes, connection.openedTimes]).toEqual([2, 1]);
  });

  it('runs hooks combined with sequential in declaration order', () => {
    const invoked: string[] = [];
    const h1: HookFn = () => {
      invoked.push('h1');
    };
    const h2: HookFn = () => {
      invoked.push('h2');
    };

    class Resource {
      @onConstruct(sequential(h1, h2))
      initialize(): void {}
    }

    const container = new Container()
      .useModule(new OnConstructModule(runSync(), onConstructHooks))
      .addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');

    expect(invoked).toEqual(['h1', 'h2']);
  });

  it('starts hooks combined with parallel at once', async () => {
    const invoked: string[] = [];

    class Resource {
      @onConstruct(
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
      initialize(): void {}
    }

    const container = new Container()
      .useModule(new OnConstructModule(runSequential(), onConstructHooks))
      .addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');

    await vi.waitFor(() => expect(invoked).toEqual(['fast', 'slow']));
  });

  it('keeps only the last hook declared for a member under one key', () => {
    const invoked: string[] = [];
    const push =
      (label: string): HookFn =>
      () => {
        invoked.push(label);
      };

    class Resource {
      // A member carries one hook per key, and decorators are applied bottom-up,
      // so the topmost decorator is the one which stays.
      @onConstruct(sequential(push('h1'), push('h2')))
      @onConstruct(sequential(push('h3'), push('h4')))
      initialize(): void {}
    }

    const container = new Container()
      .useModule(new OnConstructModule(runSync(), onConstructHooks))
      .addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');

    expect(invoked).toEqual(['h1', 'h2']);
  });

  it('runs @onScopeDisposed hooks combined with sequential in declaration order', () => {
    const invoked: string[] = [];

    class Resource {
      @onScopeDisposed(
        sequential(
          () => {
            invoked.push('h1');
          },
          () => {
            invoked.push('h2');
          },
        ),
      )
      destroy(): void {}
    }

    const container = new Container()
      .useModule(new OnDisposeModule(runSync(), onScopeDisposedHooks))
      .addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');
    container.dispose();

    expect(invoked).toEqual(['h1', 'h2']);
  });

  it('runs async hooks combined with sequential in declaration order', async () => {
    const invoked: string[] = [];

    class Resource {
      @onConstruct(
        sequential(
          async () => {
            invoked.push('h1');
          },
          async () => {
            invoked.push('h2');
          },
        ),
      )
      async initialize(): Promise<void> {}
    }

    const container = new Container()
      .useModule(new OnConstructModule(runSequential(), onConstructHooks))
      .addRegistration(R.fromClass(Resource));

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

    const container = new Container()
      .useModule(new OnConstructModule(runSequential(), onConstructHooks))
      .addRegistration(R.fromClass(Resource));

    const resource = container.resolve<Resource>('Resource');

    expect(resource.initialized).toBe(false);

    await vi.waitFor(() => expect(resource.initialized).toBe(true));
  });

  it('reports rejected async construct hooks to the caller’s error handler', async () => {
    const failure = new Error('boom');

    class BrokenResource {
      @onConstruct(() => Promise.reject(failure))
      initialize(): void {}
    }

    let captured: unknown;
    const container = new Container()
      .useModule(
        new OnConstructModule(
          runSequential(() => (ex) => (captured = ex)),
          onConstructHooks,
        ),
      )
      .addRegistration(R.fromClass(BrokenResource));

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

    const container = new Container()
      .useModule(new OnConstructModule(runSync(), onConstructHooks))
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

      @hook('workflow', AuditHook)
      start(): void {
        this.calls.push('start');
      }

      @hook('workflow', invoke)
      stop(): void {
        this.calls.push('stop');
      }
    }

    const performWorkflow = performSync('workflow');
    const container = new Container().addRegistration(R.fromClass(AuditHook)).addRegistration(R.fromClass(Worker));
    const worker = container.resolve<Worker>('Worker');

    performWorkflow(worker, {
      scope: container,
      predicate: (methodName) => methodName === 'start',
    });

    expect(hasHooks(worker, 'workflow')).toBe(true);
    expect(worker.calls).toEqual(['start']);
  });

  it('runs direct disposal callbacks subscribed to scopeDisposed', () => {
    const disposed: string[] = [];

    const container = new Container({ tags: ['app'] });
    container.scopeDisposed.subscribe((c) => {
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

    const container = new Container({ injector, tags: ['app'] });
    // Scope domain — the container's own events.
    container.scopeCreated.subscribe((scope) => log.push(`scopeCreated:${scope.hasTag('request')}`));
    container.scopeDisposed.subscribe(() => log.push('scopeDisposed'));
    container.registered.subscribe((_provider, key) => log.push(`registered:${String(key)}`));

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

  it('exposes scope events as typed events which a hook can be detached from', () => {
    const log: string[] = [];
    const container = new Container({ tags: ['app'] });

    const stopCreated = container.scopeCreated.subscribe((scope) => log.push(`created:${scope.hasTag('request')}`));
    const onRegistered = (_provider: unknown, key: unknown) => log.push(`registered:${String(key)}`);
    container.registered.subscribe(onRegistered);
    container.scopeDisposed.subscribe(() => log.push('disposed'));

    container.register('a', Provider.fromValue(1));
    container.createScope({ tags: ['request'] }).dispose();

    stopCreated();
    container.registered.unsubscribe(onRegistered);

    container.register('b', Provider.fromValue(2));
    container.createScope({ tags: ['request'] }).dispose();

    // The container's own scopeDisposed event fires for the container itself, not for its children.
    expect(log).toEqual(['registered:a', 'created:true', 'disposed', 'disposed']);
    // The exposed event is the subscriber's side only - it carries no emit.
    expectTypeOf(container.scopeCreated).not.toHaveProperty('emit');
    expectTypeOf(container.registered).not.toHaveProperty('emit');
  });

  it('gives a child scope a copy of the parent listeners, so later detaching on either stays local', () => {
    const log: string[] = [];
    const container = new Container({ tags: ['app'] });
    const stop = container.scopeCreated.subscribe((scope) => log.push(`created:${scope.hasTag('child')}`));

    const child = container.createScope({ tags: ['child'] });
    stop();

    child.createScope({ tags: ['grandchild'] });
    container.createScope({ tags: ['child'] });

    expect(log).toEqual(['created:true', 'created:false']);
  });

  it('rejects scope events on the empty container', () => {
    const empty = new EmptyContainer();

    expect(() => empty.scopeCreated).toThrowError(MethodNotImplementedError);
    expect(() => empty.scopeDisposed).toThrowError(MethodNotImplementedError);
    expect(() => empty.registered).toThrowError(MethodNotImplementedError);
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

  it('resolves hook method arguments and runs sync and async hooks through keyed collectors', async () => {
    class Worker {
      calls: string[] = [];

      @hook('sync', invoke)
      start(@inject('prefix') prefix: string): void {
        this.calls.push(`${prefix}:sync`);
      }

      @hook('async', async (context) => {
        context.invokeMethod();
      })
      stop(@inject('prefix') prefix: string): void {
        this.calls.push(`${prefix}:async`);
      }
    }

    const container = new Container()
      .addRegistration(R.fromValue('job').bindToKey('prefix'))
      .addRegistration(R.fromClass(Worker));
    const worker = container.resolve<Worker>('Worker');

    // Sync hooks finish before the runner returns.
    performSync('sync')(worker, { scope: container });
    expect(worker.calls).toEqual(['job:sync']);

    // Async hooks are started by the runner and settle afterwards.
    performAwaited('async')(worker, { scope: container });

    await vi.waitFor(() => expect(worker.calls).toEqual(['job:sync', 'job:async']));
  });
});
