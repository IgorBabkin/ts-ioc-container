import 'reflect-metadata';
import {
  Container,
  type HookFn,
  type HookType,
  OnResolvedModule,
  Provider,
  Registration as R,
  onResolved,
  oncePerInstance,
  resolved,
  SequentialAsync,
  SequentialSync,
  singleton,
} from '../../lib';

const invokeMethod: HookFn = (context) => {
  context.invokeMethod();
};

type OnError = (scope: unknown) => (ex: unknown) => void;
// Sync hooks run under the sync strategy; async ones under a strategy which awaits them.
const sync = () => new SequentialSync({ key: 'onResolved' });
const sequential = (onError?: OnError) =>
  new SequentialAsync({ key: 'onResolved', methodStrategy: 'sequential', onError });

class Service {
  resolvedTimes = 0;
  openedTimes = 0;

  @onResolved(invokeMethod)
  track(): void {
    this.resolvedTimes += 1;
  }

  @onResolved(oncePerInstance(invokeMethod))
  open(): void {
    this.openedTimes += 1;
  }
}

class AsyncService {
  resolvedTimes = 0;
  openedTimes = 0;

  @onResolved(invokeMethod)
  async track(): Promise<void> {
    await Promise.resolve();
    this.resolvedTimes += 1;
  }

  @onResolved(oncePerInstance(invokeMethod))
  async open(): Promise<void> {
    await Promise.resolve();
    this.openedTimes += 1;
  }
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('OnResolvedModule', () => {
  it('should run the hooks when a dependency is resolved', () => {
    const container = new Container().useModule(new OnResolvedModule(sync())).addRegistration(R.fromClass(Service));

    const service = container.resolve<Service>('Service');

    expect([service.resolvedTimes, service.openedTimes]).toEqual([1, 1]);
  });

  it('should not run the hooks until the dependency is resolved', () => {
    const service = new Service();

    new Container().useModule(new OnResolvedModule(sync())).addRegistration(R.fromValue(service).bindToKey('Service'));

    expect(service.resolvedTimes).toBe(0);
  });

  it('should run plain hooks on every resolve of the same object', () => {
    const service = new Service();

    const container = new Container()
      .useModule(new OnResolvedModule(sync()))
      .addRegistration(R.fromValue(service).bindToKey('Service'));

    container.resolve('Service');
    container.resolve('Service');

    expect(service.resolvedTimes).toBe(2);
  });

  it('should run once-per-instance hooks a single time however often the object is resolved', () => {
    const service = new Service();

    const container = new Container()
      .useModule(new OnResolvedModule(sync()))
      .addRegistration(R.fromValue(service).bindToKey('Service'));

    container.resolve('Service');
    container.resolve('Service');

    expect(service.openedTimes).toBe(1);
  });

  it('should run once-per-instance hooks a single time for an object resolved through several keys', () => {
    const service = new Service();

    const container = new Container()
      .useModule(new OnResolvedModule(sync()))
      .addRegistration(R.fromValue(service).bindToKey('Service'))
      .addRegistration(R.fromValue(service).bindToKey('OtherService'));

    container.resolve('Service');
    container.resolve('OtherService');

    expect(service.openedTimes).toBe(1);
  });

  it('should run once-per-instance hooks a single time for an object resolved from several scopes', () => {
    const service = new Service();

    const root = new Container({ tags: ['root'] })
      .useModule(new OnResolvedModule(sync()))
      .addRegistration(R.fromValue(service).bindToKey('Service'));

    root.createScope({ tags: ['child'] }).resolve('Service');
    root.createScope({ tags: ['child'] }).resolve('Service');

    expect(service.openedTimes).toBe(1);
  });

  it('should run once-per-instance hooks for every distinct object of the same class', () => {
    const container = new Container().useModule(new OnResolvedModule(sync())).addRegistration(R.fromClass(Service));

    const first = container.resolve<Service>('Service');
    const second = container.resolve<Service>('Service');

    expect(first).not.toBe(second);
    expect([first.openedTimes, second.openedTimes]).toEqual([1, 1]);
  });

  it('should run the hooks of a singleton on the resolve that filled its cache', () => {
    const container = new Container()
      .useModule(new OnResolvedModule(sync()))
      .addRegistration(R.fromClass(Service).pipe(singleton()));

    container.resolve('Service');
    const service = container.resolve<Service>('Service');

    expect([service.resolvedTimes, service.openedTimes]).toEqual([1, 1]);
  });

  it('should accept several explicit hooks', () => {
    const invoked: string[] = [];
    const record =
      (name: string): HookFn =>
      () => {
        invoked.push(name);
      };

    class Documented {
      @onResolved(oncePerInstance(record('first')), oncePerInstance(record('second')))
      initialize(): void {
        invoked.push('method');
      }
    }

    const container = new Container().useModule(new OnResolvedModule(sync())).addRegistration(R.fromClass(Documented));

    container.resolve('Documented');
    container.resolve('Documented');

    expect(invoked).toEqual(['first', 'second', 'first', 'second']);
  });

  it('should invoke the decorated method through the invokeMethod hook', () => {
    const invoked: string[] = [];

    class Documented {
      @onResolved(invokeMethod)
      track(): void {
        invoked.push('track');
      }

      @onResolved(oncePerInstance(invokeMethod))
      open(): void {
        invoked.push('open');
      }
    }

    const documented = new Documented();
    const container = new Container()
      .useModule(new OnResolvedModule(sync()))
      .addRegistration(R.fromValue(documented).bindToKey('Documented'));

    container.resolve('Documented');
    container.resolve('Documented');

    const timesOf = (method: string) => invoked.filter((call) => call === method).length;

    expect([timesOf('track'), timesOf('open')]).toEqual([2, 1]);
  });

  it('should accept a single hook', () => {
    const invoked: string[] = [];

    class Documented {
      @onResolved((context) => {
        invoked.push(context.methodName ?? '');
      })
      initialize(): void {}
    }

    new Container()
      .useModule(new OnResolvedModule(sync()))
      .addRegistration(R.fromClass(Documented))
      .resolve('Documented');

    expect(invoked).toEqual(['initialize']);
  });

  it('should accept a spread list of hooks', () => {
    const invoked: string[] = [];
    const record =
      (name: string): HookFn =>
      (context) => {
        invoked.push(`${name}:${context.methodName}`);
      };
    const hooks: HookType[] = [record('first'), record('second')];

    class Documented {
      @onResolved(...hooks)
      track(): void {}

      @onResolved(...hooks.map(oncePerInstance))
      open(): void {}
    }

    const documented = new Documented();
    const container = new Container()
      .useModule(new OnResolvedModule(sync()))
      .addRegistration(R.fromValue(documented).bindToKey('Documented'));

    container.resolve('Documented');
    container.resolve('Documented');

    const callsOf = (method: string) => invoked.filter((call) => call.endsWith(`:${method}`));

    // Both hooks of each decorator ran: `track` on both resolves, `open` only on the first.
    expect(callsOf('track')).toEqual(['first:track', 'second:track', 'first:track', 'second:track']);
    expect(callsOf('open')).toEqual(['first:open', 'second:open']);
  });

  it('should run once-per-instance hooks a single time per instance', () => {
    const invoked: string[] = [];

    class Documented {
      @onResolved(oncePerInstance(invokeMethod))
      open(): void {
        invoked.push('open');
      }
    }

    const service = new Documented();
    const container = new Container()
      .useModule(new OnResolvedModule(sync()))
      .addRegistration(R.fromValue(service).bindToKey('Documented'));

    container.resolve('Documented');
    container.resolve('Documented');

    expect(invoked).toEqual(['open']);
  });

  it('should pass the resolving scope to the hooks', () => {
    const scopes: unknown[] = [];

    class ScopeAware {
      @onResolved((context) => {
        scopes.push(context.scope);
      })
      initialize(): void {}
    }

    const root = new Container({ tags: ['root'] })
      .useModule(new OnResolvedModule(sync()))
      .addRegistration(R.fromClass(ScopeAware));
    const child = root.createScope({ tags: ['child'] });

    child.resolve('ScopeAware');

    expect(scopes).toEqual([child]);
  });

  it('should skip dependencies which are not objects', () => {
    const container = new Container()
      .useModule(new OnResolvedModule(sync()))
      .addRegistration(R.fromValue(1).bindToKey('One'));

    expect(container.resolve('One')).toBe(1);
  });

  it('should not hook providers registered before the module was applied', () => {
    const service = new Service();

    const container = new Container()
      .addRegistration(R.fromValue(service).bindToKey('Service'))
      .useModule(new OnResolvedModule(sync()));

    container.resolve('Service');

    expect(service.resolvedTimes).toBe(0);
  });

  it('should report what a hook threw to the strategy onError handler', () => {
    const failure = new Error('hook failed');

    class Broken {
      @onResolved(() => {
        throw failure;
      })
      initialize(): void {}
    }

    const exceptions: unknown[] = [];
    const container = new Container()
      .useModule(
        new OnResolvedModule(new SequentialSync({ key: 'onResolved', onError: () => (ex) => exceptions.push(ex) })),
      )
      .addRegistration(R.fromClass(Broken));

    expect(() => container.resolve('Broken')).not.toThrow();
    expect(exceptions).toEqual([failure]);
  });

  it('should keep once-per-instance hooks deduplicated across containers', () => {
    const service = new Service();

    const first = new Container().useModule(new OnResolvedModule(sync()));
    const second = new Container().useModule(new OnResolvedModule(sync()));
    first.register('Service', Provider.fromValue(service));
    second.register('Service', Provider.fromValue(service));

    first.resolve('Service');
    second.resolve('Service');

    expect([service.openedTimes, service.resolvedTimes]).toEqual([1, 2]);
  });
});

describe('resolved(sync())', () => {
  it('should run the hooks when the piped dependency is resolved', () => {
    const container = new Container().addRegistration(R.fromClass(Service).pipe(resolved(sync())));

    const service = container.resolve<Service>('Service');

    expect([service.resolvedTimes, service.openedTimes]).toEqual([1, 1]);
  });

  it('should run once-per-instance hooks a single time however often the object is resolved', () => {
    const service = new Service();

    const container = new Container().addRegistration(R.fromValue(service).bindToKey('Service').pipe(resolved(sync())));

    container.resolve('Service');
    container.resolve('Service');

    expect([service.openedTimes, service.resolvedTimes]).toEqual([1, 2]);
  });

  it('should run once-per-instance hooks a single time for an object resolved from several scopes', () => {
    const service = new Service();

    const root = new Container({ tags: ['root'] }).addRegistration(
      R.fromValue(service).bindToKey('Service').pipe(resolved(sync())),
    );

    root.createScope({ tags: ['child'] }).resolve('Service');
    root.createScope({ tags: ['child'] }).resolve('Service');

    expect(service.openedTimes).toBe(1);
  });

  it('should leave registrations it was not piped into alone', () => {
    const container = new Container()
      .addRegistration(R.fromClass(Service).pipe(resolved(sync())))
      .addRegistration(R.fromClass(Service).bindToKey('OtherService'));

    expect(container.resolve<Service>('OtherService').resolvedTimes).toBe(0);
  });

  it('should skip dependencies which are not objects', () => {
    const container = new Container().addRegistration(R.fromValue(1).bindToKey('One').pipe(resolved(sync())));

    expect(container.resolve('One')).toBe(1);
  });
});

describe('OnResolvedModule with async hooks', () => {
  it('should start the hooks on resolve and settle after it returns', async () => {
    const container = new Container()
      .useModule(new OnResolvedModule(sequential()))
      .addRegistration(R.fromClass(AsyncService));

    const service = container.resolve<AsyncService>('AsyncService');

    expect(service.resolvedTimes).toBe(0);

    await settle();

    expect([service.resolvedTimes, service.openedTimes]).toEqual([1, 1]);
  });

  it('should run plain hooks on every resolve of the same object', async () => {
    const service = new AsyncService();

    const container = new Container()
      .useModule(new OnResolvedModule(sequential()))
      .addRegistration(R.fromValue(service).bindToKey('Service'));

    container.resolve('Service');
    container.resolve('Service');
    await settle();

    expect(service.resolvedTimes).toBe(2);
  });

  it('should run once-per-instance hooks a single time however often the object is resolved', async () => {
    const service = new AsyncService();

    const container = new Container()
      .useModule(new OnResolvedModule(sequential()))
      .addRegistration(R.fromValue(service).bindToKey('Service'));

    container.resolve('Service');
    container.resolve('Service');
    await settle();

    expect(service.openedTimes).toBe(1);
  });

  it('should run once-per-instance hooks a single time for an object resolved from several scopes', async () => {
    const service = new AsyncService();

    const root = new Container({ tags: ['root'] })
      .useModule(new OnResolvedModule(sequential()))
      .addRegistration(R.fromValue(service).bindToKey('Service'));

    root.createScope({ tags: ['child'] }).resolve('Service');
    root.createScope({ tags: ['child'] }).resolve('Service');
    await settle();

    expect(service.openedTimes).toBe(1);
  });

  it('should accept a spread list of async hooks', async () => {
    const invoked: string[] = [];
    const record =
      (name: string): HookFn =>
      async (context) => {
        invoked.push(`${name}:${context.methodName}`);
      };
    const hooks: HookType[] = [record('first'), record('second')];

    class Documented {
      @onResolved(...hooks)
      track(): void {}

      @onResolved(...hooks.map(oncePerInstance))
      open(): void {}
    }

    const documented = new Documented();
    const container = new Container()
      .useModule(new OnResolvedModule(sequential()))
      .addRegistration(R.fromValue(documented).bindToKey('Documented'));

    container.resolve('Documented');
    container.resolve('Documented');
    await settle();

    const callsOf = (method: string) => invoked.filter((call) => call.endsWith(`:${method}`));

    // Both hooks of each decorator ran: `track` on both resolves, `open` only on the first.
    // Overlapping resolves interleave their awaits, so only the tally is deterministic.
    expect(callsOf('track').sort()).toEqual(['first:track', 'first:track', 'second:track', 'second:track']);
    expect(callsOf('open').sort()).toEqual(['first:open', 'second:open']);
  });

  it('should report a rejected hook to the onError handler', async () => {
    class Broken {
      @onResolved(async () => {
        throw new Error('hook failed');
      })
      initialize(): void {}
    }

    const exceptions: unknown[] = [];
    const container = new Container()
      .useModule(new OnResolvedModule(sequential(() => (ex) => exceptions.push(ex))))
      .addRegistration(R.fromClass(Broken));

    container.resolve('Broken');
    await settle();

    expect(exceptions).toEqual([new Error('hook failed')]);
  });

  it('should report what a sync hook threw to the onError handler', async () => {
    class Broken {
      @onResolved(() => {
        throw new Error('hook failed');
      })
      initialize(): void {}
    }

    const exceptions: unknown[] = [];
    const container = new Container()
      .useModule(new OnResolvedModule(sequential(() => (ex) => exceptions.push(ex))))
      .addRegistration(R.fromClass(Broken));

    expect(() => container.resolve('Broken')).not.toThrow();
    await settle();

    expect(exceptions).toEqual([new Error('hook failed')]);
  });

  it('should skip dependencies which carry no hooks', () => {
    class Plain {}

    const container = new Container()
      .useModule(new OnResolvedModule(sequential()))
      .addRegistration(R.fromClass(Plain))
      .addRegistration(R.fromValue(1).bindToKey('One'));

    expect(container.resolve('One')).toBe(1);
    expect(container.resolve('Plain')).toBeInstanceOf(Plain);
  });
});

describe('resolved() with async hooks', () => {
  it('should run the hooks when the piped dependency is resolved', async () => {
    const container = new Container().addRegistration(R.fromClass(AsyncService).pipe(resolved(sequential())));

    const service = container.resolve<AsyncService>('AsyncService');
    await settle();

    expect([service.resolvedTimes, service.openedTimes]).toEqual([1, 1]);
  });

  it('should run once-per-instance hooks a single time for an object resolved from several scopes', async () => {
    const service = new AsyncService();

    const root = new Container({ tags: ['root'] }).addRegistration(
      R.fromValue(service).bindToKey('Service').pipe(resolved(sequential())),
    );

    root.createScope({ tags: ['child'] }).resolve('Service');
    root.createScope({ tags: ['child'] }).resolve('Service');
    await settle();

    expect([service.openedTimes, service.resolvedTimes]).toEqual([1, 2]);
  });

  it('should leave registrations it was not piped into alone', async () => {
    const container = new Container()
      .addRegistration(R.fromClass(AsyncService).pipe(resolved(sequential())))
      .addRegistration(R.fromClass(AsyncService).bindToKey('OtherService'));

    const service = container.resolve<AsyncService>('OtherService');
    await settle();

    expect(service.resolvedTimes).toBe(0);
  });

  it('should report a rejected hook to the onError handler', async () => {
    class Broken {
      @onResolved(async () => {
        throw new Error('hook failed');
      })
      initialize(): void {}
    }

    const exceptions: unknown[] = [];
    const container = new Container().addRegistration(
      R.fromClass(Broken).pipe(resolved(sequential(() => (ex) => exceptions.push(ex)))),
    );

    container.resolve('Broken');
    await settle();

    expect(exceptions).toEqual([new Error('hook failed')]);
  });
});
