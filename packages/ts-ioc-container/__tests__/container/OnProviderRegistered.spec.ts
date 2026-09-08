import {
  Container,
  EmptyContainer,
  type IContainer,
  type IProvider,
  MethodNotImplementedError,
  Provider,
  Registration,
  TransientProvider,
} from '../../lib';

describe('onProviderRegistered', () => {
  const record = (log: unknown[]) => (provider: IProvider) => {
    log.push(provider.resolve(new Container(), {}));
  };

  it('should run the hook when a provider is registered', () => {
    const log: unknown[] = [];

    new Container().onProviderRegistered(record(log)).register('key', Provider.fromValue(1));

    expect(log).toEqual([1]);
  });

  it('should run every hook in the order it was added', () => {
    const log: string[] = [];

    new Container()
      .onProviderRegistered(
        () => log.push('first'),
        () => log.push('second'),
      )
      .onProviderRegistered(() => log.push('third'))
      .register('key', Provider.fromValue(1));

    expect(log).toEqual(['first', 'second', 'third']);
  });

  it('should pass the registering scope to the hook', () => {
    let hookScope: IContainer | undefined;

    const root = new Container({ tags: ['root'] }).onProviderRegistered((_p, s) => {
      hookScope = s;
    });
    root.register('key', Provider.fromValue(1));

    expect(hookScope).toBe(root);
  });

  it('should run the hook when a registration is added', () => {
    const log: unknown[] = [];

    new Container().onProviderRegistered(record(log)).addRegistration(Registration.fromValue(1).bindTo('key'));

    expect(log).toEqual([1]);
  });

  it('should run inherited hooks for providers cloned into a child scope', () => {
    const log: unknown[] = [];

    const root = new Container({ tags: ['root'] })
      .onProviderRegistered(record(log))
      .addRegistration(Registration.fromValue(1).bindTo('key'));
    log.length = 0;

    const child = root.createScope({ tags: ['child'] });

    expect(log).toEqual([1]);
    expect(child.resolve('key')).toBe(1);
  });

  it('should not run the hook for registrations which do not match the child scope', () => {
    const log: unknown[] = [];

    const root = new Container({ tags: ['root'] }).onProviderRegistered(record(log)).addRegistration(
      Registration.fromValue(1)
        .bindTo('key')
        .when((s) => s.hasTag('other')),
    );
    log.length = 0;

    root.createScope({ tags: ['child'] });

    expect(log).toEqual([]);
  });

  it('should not run hooks added to a child scope when its parent registers a provider', () => {
    const log: unknown[] = [];

    const root = new Container({ tags: ['root'] });
    root.createScope({ tags: ['child'] }).onProviderRegistered(record(log));

    root.register('key', Provider.fromValue(1));

    expect(log).toEqual([]);
  });

  it('should run the hook for the TransientProvider made up for a class resolved by its constructor', () => {
    class Service {}

    const providers: IProvider[] = [];
    const container = new Container().onProviderRegistered((provider) => providers.push(provider));

    container.resolve(Service);

    expect(providers).toHaveLength(1);
    expect(providers[0]).toBeInstanceOf(TransientProvider);
    expect(providers[0].resolve(container, {})).toBeInstanceOf(Service);
  });

  it('should let a hook tell a made-up provider from a declared one', () => {
    class Service {}

    const declared: IProvider[] = [];
    const container = new Container().onProviderRegistered((provider) => {
      if (provider instanceof TransientProvider) {
        return;
      }
      declared.push(provider);
    });

    container.register('key', Provider.fromValue(1));
    container.resolve(Service);

    expect(declared).toHaveLength(1);
    expect(declared[0].resolve(container, {})).toBe(1);
  });

  it('should run the hook once per class, however often it is resolved by its constructor', () => {
    class Service {}

    let calls = 0;
    const container = new Container().onProviderRegistered(() => (calls += 1));

    container.resolve(Service);
    container.resolve(Service);

    expect(calls).toBe(1);
  });

  it('should make up a separate TransientProvider per scope for the same class', () => {
    class Service {}

    const scopes: IContainer[] = [];
    const root = new Container({ tags: ['root'] }).onProviderRegistered((_p, s) => scopes.push(s));
    const child = root.createScope({ tags: ['child'] });

    root.resolve(Service);
    child.resolve(Service);

    expect(scopes).toEqual([root, child]);
  });

  it('should raise an error when registering the hook on an empty container', () => {
    expect(() => new EmptyContainer().onProviderRegistered(() => {})).toThrowError(MethodNotImplementedError);
  });
});
