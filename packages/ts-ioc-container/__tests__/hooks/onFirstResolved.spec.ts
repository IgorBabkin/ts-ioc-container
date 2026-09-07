import 'reflect-metadata';
import {
  Container,
  type HookFn,
  OnFirstResolvedModule,
  Provider,
  Registration as R,
  onFirstResolved,
  singleton,
} from '../../lib';

const invoke: HookFn = (context) => {
  context.invokeMethod();
};

describe('OnFirstResolvedModule', () => {
  class Service {
    initializedTimes = 0;

    @onFirstResolved(invoke)
    initialize(): void {
      this.initializedTimes += 1;
    }
  }

  it('should run the hooks when a dependency is resolved', () => {
    const container = new Container().useModule(new OnFirstResolvedModule()).addRegistration(R.fromClass(Service));

    expect(container.resolve<Service>('Service').initializedTimes).toBe(1);
  });

  it('should not run the hooks until the dependency is resolved', () => {
    const service = new Service();

    new Container().useModule(new OnFirstResolvedModule()).addRegistration(R.fromValue(service).bindToKey('Service'));

    expect(service.initializedTimes).toBe(0);
  });

  it('should run the hooks once per object, however many times it is resolved', () => {
    const container = new Container()
      .useModule(new OnFirstResolvedModule())
      .addRegistration(R.fromClass(Service).pipe(singleton()));

    container.resolve('Service');
    const service = container.resolve<Service>('Service');

    expect(service.initializedTimes).toBe(1);
  });

  it('should run the hooks once for an object resolved through several keys', () => {
    const service = new Service();

    const container = new Container()
      .useModule(new OnFirstResolvedModule())
      .addRegistration(R.fromValue(service).bindToKey('Service'))
      .addRegistration(R.fromValue(service).bindToKey('OtherService'));

    container.resolve('Service');
    container.resolve('OtherService');

    expect(service.initializedTimes).toBe(1);
  });

  it('should run the hooks once for an object resolved from several scopes', () => {
    const service = new Service();

    const root = new Container({ tags: ['root'] })
      .useModule(new OnFirstResolvedModule())
      .addRegistration(R.fromValue(service).bindToKey('Service'));

    root.createScope({ tags: ['child'] }).resolve('Service');
    root.createScope({ tags: ['child'] }).resolve('Service');

    expect(service.initializedTimes).toBe(1);
  });

  it('should run the hooks for every distinct object of the same class', () => {
    const container = new Container().useModule(new OnFirstResolvedModule()).addRegistration(R.fromClass(Service));

    const first = container.resolve<Service>('Service');
    const second = container.resolve<Service>('Service');

    expect(first).not.toBe(second);
    expect([first.initializedTimes, second.initializedTimes]).toEqual([1, 1]);
  });

  it('should pass the resolving scope to the hooks', () => {
    const scopes: unknown[] = [];

    class ScopeAware {
      @onFirstResolved((context) => {
        scopes.push(context.scope);
      })
      initialize(): void {}
    }

    const root = new Container({ tags: ['root'] })
      .useModule(new OnFirstResolvedModule())
      .addRegistration(R.fromClass(ScopeAware));
    const child = root.createScope({ tags: ['child'] });

    child.resolve('ScopeAware');

    expect(scopes).toEqual([child]);
  });

  it('should skip dependencies which are not objects', () => {
    const container = new Container()
      .useModule(new OnFirstResolvedModule())
      .addRegistration(R.fromValue(1).bindToKey('One'));

    expect(container.resolve('One')).toBe(1);
  });

  it('should not hook providers registered before the module was applied', () => {
    const service = new Service();

    const container = new Container()
      .addRegistration(R.fromValue(service).bindToKey('Service'))
      .useModule(new OnFirstResolvedModule());

    container.resolve('Service');

    expect(service.initializedTimes).toBe(0);
  });

  it('should keep dependencies of separate module instances apart', () => {
    const service = new Service();

    const first = new Container().useModule(new OnFirstResolvedModule());
    const second = new Container().useModule(new OnFirstResolvedModule());
    first.register('Service', Provider.fromValue(service));
    second.register('Service', Provider.fromValue(service));

    first.resolve('Service');
    second.resolve('Service');

    expect(service.initializedTimes).toBe(2);
  });

  it('should rethrow whatever a hook threw', () => {
    class Broken {
      @onFirstResolved(() => {
        throw new Error('hook failed');
      })
      initialize(): void {}
    }

    const container = new Container().useModule(new OnFirstResolvedModule()).addRegistration(R.fromClass(Broken));

    expect(() => container.resolve('Broken')).toThrowError('hook failed');
  });
});
