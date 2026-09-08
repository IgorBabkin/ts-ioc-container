import 'reflect-metadata';
import {
  OnDisposeModule,
  OnResolvedAsyncModule,
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
  onContainerDisposed,
  onResolved,
  onResolvedAsync,
  onceResolved,
  Registration as R,
  UnexpectedHookResultError,
} from '../../lib';

const invoke: HookFn = (context) => {
  context.invokeMethod();
};

describe('Spec: lifecycle hooks', () => {
  it('runs resolve and dispose hooks through opt-in modules', () => {
    class Resource {
      initialized = false;
      disposed = false;

      @onResolved(invoke)
      initialize(): void {
        this.initialized = true;
      }

      @onContainerDisposed(invoke)
      destroy(): void {
        this.disposed = true;
      }
    }

    const container = new Container()
      .useModule(new OnResolvedModule())
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

  it('runs stacked @onResolved decorators in declaration order', () => {
    const invoked: string[] = [];
    const h1: HookFn = () => {
      invoked.push('h1');
    };
    const h2: HookFn = () => {
      invoked.push('h2');
    };

    class Resource {
      @onResolved(h1)
      @onResolved(h2)
      initialize(): void {}
    }

    const container = new Container().useModule(new OnResolvedModule()).addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');

    expect(invoked).toEqual(['h1', 'h2']);
  });

  it('runs hooks of a single @onResolved decorator in argument order', () => {
    const invoked: string[] = [];

    class Resource {
      @onResolved(
        () => {
          invoked.push('h1');
        },
        () => {
          invoked.push('h2');
        },
      )
      initialize(): void {}
    }

    const container = new Container().useModule(new OnResolvedModule()).addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');

    expect(invoked).toEqual(['h1', 'h2']);
  });

  it('keeps declaration order when stacked @onResolved decorators carry several hooks each', () => {
    const invoked: string[] = [];
    const push =
      (label: string): HookFn =>
      () => {
        invoked.push(label);
      };

    class Resource {
      @onResolved(push('h1'), push('h2'))
      @onResolved(push('h3'), push('h4'))
      initialize(): void {}
    }

    const container = new Container().useModule(new OnResolvedModule()).addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');

    expect(invoked).toEqual(['h1', 'h2', 'h3', 'h4']);
  });

  it('runs stacked @onContainerDisposed decorators in declaration order', () => {
    const invoked: string[] = [];

    class Resource {
      @onContainerDisposed(() => {
        invoked.push('h1');
      })
      @onContainerDisposed(() => {
        invoked.push('h2');
      })
      destroy(): void {}
    }

    const container = new Container().useModule(new OnDisposeModule()).addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');
    container.dispose();

    expect(invoked).toEqual(['h1', 'h2']);
  });

  it('runs stacked @onResolvedAsync decorators in declaration order', async () => {
    const invoked: string[] = [];

    class Resource {
      @onResolvedAsync(async () => {
        invoked.push('h1');
      })
      @onResolvedAsync(async () => {
        invoked.push('h2');
      })
      async initialize(): Promise<void> {}
    }

    const container = new Container().useModule(new OnResolvedAsyncModule()).addRegistration(R.fromClass(Resource));

    container.resolve<Resource>('Resource');

    await vi.waitFor(() => expect(invoked).toEqual(['h1', 'h2']));
  });

  it('runs async resolve hooks without blocking resolution', async () => {
    class Resource {
      initialized = false;

      @onResolvedAsync(async (context) => {
        await context.invokeMethod();
      })
      async initialize(): Promise<void> {
        await Promise.resolve();
        this.initialized = true;
      }
    }

    const container = new Container().useModule(new OnResolvedAsyncModule()).addRegistration(R.fromClass(Resource));

    const resource = container.resolve<Resource>('Resource');

    expect(resource.initialized).toBe(false);

    await vi.waitFor(() => expect(resource.initialized).toBe(true));
  });

  it('reports rejected async resolve hooks to the module exception handler', async () => {
    const failure = new Error('boom');

    class BrokenResource {
      @onResolvedAsync(() => Promise.reject(failure))
      initialize(): void {}
    }

    let captured: unknown;
    const container = new Container()
      .useModule(new OnResolvedAsyncModule((ex) => (captured = ex)))
      .addRegistration(R.fromClass(BrokenResource));

    container.resolve<BrokenResource>('BrokenResource');

    await vi.waitFor(() => expect(captured).toBe(failure));
  });

  it('injects properties through hook context scope', () => {
    class Logger {
      readonly name = 'logger';
    }

    class Service {
      @onResolved(injectProp('Logger'))
      logger!: Logger;
    }

    const container = new Container()
      .useModule(new OnResolvedModule())
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

  it('runs direct disposal callbacks registered with onDispose', () => {
    const disposed: string[] = [];

    const container = new Container({ tags: ['app'] }).onInstanceDisposed((c) => {
      if (c.hasTag('app')) disposed.push('app');
    });

    container.dispose();

    expect(disposed).toEqual(['app']);
  });

  it('resolves hook method arguments and separates sync from async execution', async () => {
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

      @hook('badAsync', append(async () => undefined))
      bad(): void {}
    }

    const container = new Container()
      .addRegistration(R.fromValue('job').bindToKey('prefix'))
      .addRegistration(R.fromClass(Worker));
    const worker = container.resolve<Worker>('Worker');

    new HooksRunner('sync').execute(worker, { scope: container });
    expect(() => new HooksRunner('badAsync').execute(worker, { scope: container })).toThrowError(
      UnexpectedHookResultError,
    );

    await new HooksRunner('async').executeAsync(worker, { scope: container });

    expect(worker.calls).toEqual(['job:sync', 'job:async']);
  });
});
