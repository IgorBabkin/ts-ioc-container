import 'reflect-metadata';
import {
  Container,
  type HookFn,
  type HookType,
  OnResolvedModule,
  Provider,
  Registration as R,
  onResolved,
  onceResolved,
  resolved,
  singleton,
} from '../../lib';

class Service {
  resolvedTimes = 0;
  openedTimes = 0;

  @onResolved()
  track(): void {
    this.resolvedTimes += 1;
  }

  @onceResolved()
  open(): void {
    this.openedTimes += 1;
  }
}

describe('OnResolvedModule', () => {
  it('should run the hooks when a dependency is resolved', () => {
    const container = new Container().useModule(new OnResolvedModule()).addRegistration(R.fromClass(Service));

    const service = container.resolve<Service>('Service');

    expect([service.resolvedTimes, service.openedTimes]).toEqual([1, 1]);
  });

  it('should not run the hooks until the dependency is resolved', () => {
    const service = new Service();

    new Container().useModule(new OnResolvedModule()).addRegistration(R.fromValue(service).bindToKey('Service'));

    expect(service.resolvedTimes).toBe(0);
  });

  it('should run plain hooks on every resolve of the same object', () => {
    const service = new Service();

    const container = new Container()
      .useModule(new OnResolvedModule())
      .addRegistration(R.fromValue(service).bindToKey('Service'));

    container.resolve('Service');
    container.resolve('Service');

    expect(service.resolvedTimes).toBe(2);
  });

  it('should run `onceResolved` hooks a single time however often the object is resolved', () => {
    const service = new Service();

    const container = new Container()
      .useModule(new OnResolvedModule())
      .addRegistration(R.fromValue(service).bindToKey('Service'));

    container.resolve('Service');
    container.resolve('Service');

    expect(service.openedTimes).toBe(1);
  });

  it('should run `onceResolved` hooks a single time for an object resolved through several keys', () => {
    const service = new Service();

    const container = new Container()
      .useModule(new OnResolvedModule())
      .addRegistration(R.fromValue(service).bindToKey('Service'))
      .addRegistration(R.fromValue(service).bindToKey('OtherService'));

    container.resolve('Service');
    container.resolve('OtherService');

    expect(service.openedTimes).toBe(1);
  });

  it('should run `onceResolved` hooks a single time for an object resolved from several scopes', () => {
    const service = new Service();

    const root = new Container({ tags: ['root'] })
      .useModule(new OnResolvedModule())
      .addRegistration(R.fromValue(service).bindToKey('Service'));

    root.createScope({ tags: ['child'] }).resolve('Service');
    root.createScope({ tags: ['child'] }).resolve('Service');

    expect(service.openedTimes).toBe(1);
  });

  it('should run `onceResolved` hooks for every distinct object of the same class', () => {
    const container = new Container().useModule(new OnResolvedModule()).addRegistration(R.fromClass(Service));

    const first = container.resolve<Service>('Service');
    const second = container.resolve<Service>('Service');

    expect(first).not.toBe(second);
    expect([first.openedTimes, second.openedTimes]).toEqual([1, 1]);
  });

  it('should run the hooks of a singleton on the resolve that filled its cache', () => {
    const container = new Container()
      .useModule(new OnResolvedModule())
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
      @onceResolved(record('first'), record('second'))
      initialize(): void {
        invoked.push('method');
      }
    }

    const container = new Container().useModule(new OnResolvedModule()).addRegistration(R.fromClass(Documented));

    container.resolve('Documented');
    container.resolve('Documented');

    expect(invoked).toEqual(['first', 'second', 'first', 'second']);
  });

  it('should accept a single hook', () => {
    const invoked: string[] = [];

    class Documented {
      @onResolved((context) => {
        invoked.push(context.methodName ?? '');
      })
      initialize(): void {}
    }

    new Container().useModule(new OnResolvedModule()).addRegistration(R.fromClass(Documented)).resolve('Documented');

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

      @onceResolved(...hooks)
      open(): void {}
    }

    const documented = new Documented();
    const container = new Container()
      .useModule(new OnResolvedModule())
      .addRegistration(R.fromValue(documented).bindToKey('Documented'));

    container.resolve('Documented');
    container.resolve('Documented');

    const callsOf = (method: string) => invoked.filter((call) => call.endsWith(`:${method}`));

    // Both hooks of each decorator ran: `track` on both resolves, `open` only on the first.
    expect(callsOf('track')).toEqual(['first:track', 'second:track', 'first:track', 'second:track']);
    expect(callsOf('open')).toEqual(['first:open', 'second:open']);
  });

  it('should run `onceResolved` hooks a single time per instance', () => {
    const invoked: string[] = [];

    class Documented {
      @onceResolved()
      open(): void {
        invoked.push('open');
      }
    }

    const service = new Documented();
    const container = new Container()
      .useModule(new OnResolvedModule())
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
      .useModule(new OnResolvedModule())
      .addRegistration(R.fromClass(ScopeAware));
    const child = root.createScope({ tags: ['child'] });

    child.resolve('ScopeAware');

    expect(scopes).toEqual([child]);
  });

  it('should skip dependencies which are not objects', () => {
    const container = new Container()
      .useModule(new OnResolvedModule())
      .addRegistration(R.fromValue(1).bindToKey('One'));

    expect(container.resolve('One')).toBe(1);
  });

  it('should not hook providers registered before the module was applied', () => {
    const service = new Service();

    const container = new Container()
      .addRegistration(R.fromValue(service).bindToKey('Service'))
      .useModule(new OnResolvedModule());

    container.resolve('Service');

    expect(service.resolvedTimes).toBe(0);
  });

  it('should rethrow whatever a hook threw', () => {
    class Broken {
      @onResolved(() => {
        throw new Error('hook failed');
      })
      initialize(): void {}
    }

    const container = new Container().useModule(new OnResolvedModule()).addRegistration(R.fromClass(Broken));

    expect(() => container.resolve('Broken')).toThrowError('hook failed');
  });

  it('should keep `onceResolved` hooks deduplicated across containers', () => {
    const service = new Service();

    const first = new Container().useModule(new OnResolvedModule());
    const second = new Container().useModule(new OnResolvedModule());
    first.register('Service', Provider.fromValue(service));
    second.register('Service', Provider.fromValue(service));

    first.resolve('Service');
    second.resolve('Service');

    expect([service.openedTimes, service.resolvedTimes]).toEqual([1, 2]);
  });
});

describe('resolved()', () => {
  it('should run the hooks when the piped dependency is resolved', () => {
    const container = new Container().addRegistration(R.fromClass(Service).pipe(resolved()));

    const service = container.resolve<Service>('Service');

    expect([service.resolvedTimes, service.openedTimes]).toEqual([1, 1]);
  });

  it('should run `onceResolved` hooks a single time however often the object is resolved', () => {
    const service = new Service();

    const container = new Container().addRegistration(R.fromValue(service).bindToKey('Service').pipe(resolved()));

    container.resolve('Service');
    container.resolve('Service');

    expect([service.openedTimes, service.resolvedTimes]).toEqual([1, 2]);
  });

  it('should run `onceResolved` hooks a single time for an object resolved from several scopes', () => {
    const service = new Service();

    const root = new Container({ tags: ['root'] }).addRegistration(
      R.fromValue(service).bindToKey('Service').pipe(resolved()),
    );

    root.createScope({ tags: ['child'] }).resolve('Service');
    root.createScope({ tags: ['child'] }).resolve('Service');

    expect(service.openedTimes).toBe(1);
  });

  it('should leave registrations it was not piped into alone', () => {
    const container = new Container()
      .addRegistration(R.fromClass(Service).pipe(resolved()))
      .addRegistration(R.fromClass(Service).bindToKey('OtherService'));

    expect(container.resolve<Service>('OtherService').resolvedTimes).toBe(0);
  });

  it('should skip dependencies which are not objects', () => {
    const container = new Container().addRegistration(R.fromValue(1).bindToKey('One').pipe(resolved()));

    expect(container.resolve('One')).toBe(1);
  });
});
