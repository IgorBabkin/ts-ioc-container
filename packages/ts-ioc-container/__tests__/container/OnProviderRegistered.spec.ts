import {
  Container,
  EmptyContainer,
  type IContainer,
  type IProvider,
  MethodNotImplementedError,
  Provider,
  Registration,
  type DependencyKey,
} from '../../lib';

describe('onProviderRegistered', () => {
  const record = (log: [DependencyKey, unknown][]) => (provider: IProvider, key: DependencyKey) => {
    log.push([key, provider.resolve(new Container(), {})]);
  };

  it('should run the hook when a provider is registered', () => {
    const log: [DependencyKey, unknown][] = [];

    new Container().onProviderRegistered(record(log)).register('key', Provider.fromValue(1));

    expect(log).toEqual([['key', 1]]);
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

    const root = new Container({ tags: ['root'] }).onProviderRegistered((_p, _k, s) => {
      hookScope = s;
    });
    root.register('key', Provider.fromValue(1));

    expect(hookScope).toBe(root);
  });

  it('should run the hook when a registration is added', () => {
    const log: [DependencyKey, unknown][] = [];

    new Container().onProviderRegistered(record(log)).addRegistration(Registration.fromValue(1).bindTo('key'));

    expect(log).toEqual([['key', 1]]);
  });

  it('should run inherited hooks for providers cloned into a child scope', () => {
    const log: [DependencyKey, unknown][] = [];

    const root = new Container({ tags: ['root'] })
      .onProviderRegistered(record(log))
      .addRegistration(Registration.fromValue(1).bindTo('key'));
    log.length = 0;

    const child = root.createScope({ tags: ['child'] });

    expect(log).toEqual([['key', 1]]);
    expect(child.resolve('key')).toBe(1);
  });

  it('should not run the hook for registrations which do not match the child scope', () => {
    const log: [DependencyKey, unknown][] = [];

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
    const log: [DependencyKey, unknown][] = [];

    const root = new Container({ tags: ['root'] });
    root.createScope({ tags: ['child'] }).onProviderRegistered(record(log));

    root.register('key', Provider.fromValue(1));

    expect(log).toEqual([]);
  });

  it('should raise an error when registering the hook on an empty container', () => {
    expect(() => new EmptyContainer().onProviderRegistered(() => {})).toThrowError(MethodNotImplementedError);
  });
});
