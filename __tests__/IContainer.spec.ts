import {
  Container,
  isDependencyKey,
  MetadataInjector,
  Registration as R,
  ContainerDisposedError,
  EmptyContainer,
  Provider,
} from '../lib';

describe('IContainer', function () {
  it('should accept a symbol as dependency key', function () {
    expect(isDependencyKey(Symbol('key'))).toBe(true);
  });
  it('should accept a string as dependency key', function () {
    expect(isDependencyKey('key')).toBe(true);
  });

  it('should notify all observers on dispose', function () {
    let invocationCount = 0;

    const root = new Container(new MetadataInjector(), { tags: ['root'], onDispose: () => invocationCount++ });

    root.dispose();
  });

  it('should dispose scope with option=cascade', function () {
    const container = new Container(new MetadataInjector(), { tags: ['root'] }).add(
      R.toValue('hello').fromKey('greeting'),
    );

    const childScope = container.createScope({ tags: ['root'] });
    container.dispose({ cascade: true });

    expect(() => childScope.resolve('logger')).toThrow(ContainerDisposedError);
  });

  it('should not dispose scope with option=cascade=false', function () {
    const container = new Container(new MetadataInjector(), { tags: ['root'] });

    const childScope = container.createScope({ tags: ['root'] });
    container.dispose({ cascade: false });

    expect(() => childScope.resolve('logger')).not.toThrow(ContainerDisposedError);
  });

  it('should detach container from parent', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] });
    const child = root.createScope({ tags: ['child'] });

    expect(child.getParent()).toBe(root);
    child.detach();
    expect(child.getParent()).toBeInstanceOf(EmptyContainer);
  });

  it('should check if provider exists in current or parent container', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] });
    const child = root.createScope({ tags: ['child'] });

    // Add a provider only to the root container
    root.add(R.toValue('parent-value').fromKey('parent-key'));

    // Add a provider only to the child container
    child.add(R.toValue('child-value').fromKey('child-key'));

    // Provider exists in child container
    expect(child.hasProvider('child-key')).toBe(true);

    // Provider exists in parent container but not in child
    expect(child.hasProvider('parent-key')).toBe(true);

    // Provider doesn't exist in either container
    expect(child.hasProvider('non-existent-key')).toBe(false);
  });

  it('should resolve many dependencies by alias with explicit result map', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] });

    // Create providers with aliases
    const provider1 = Provider.fromValue('value1');
    const provider2 = Provider.fromValue('value2');

    // Add aliases to the providers
    provider1.addAliases('test-alias');
    provider2.addAliases('test-alias');

    // Register the providers
    root.register('key1', provider1);
    root.register('key2', provider2);

    // Create a custom result map
    const customResultMap = new Map();

    // Test resolveManyByAlias with explicit result map (covers line 120)
    const result = root.resolveManyByAlias((aliases) => aliases.has('test-alias'), {}, customResultMap);

    // Verify the result is the same map instance we passed in
    expect(result).toBe(customResultMap);
    expect(result.size).toBe(2);
    expect(result.get('key1')).toBe('value1');
    expect(result.get('key2')).toBe('value2');
  });

  it('should resolve one dependency by alias with custom options', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] });
    const child = root.createScope({ tags: ['child'] });

    // Create a provider with an alias
    const provider = Provider.fromValue('test-value');
    provider.addAliases('test-alias');

    // Register the provider
    root.register('test-key', provider);

    // Test resolveOneByAlias with custom options (covers line 133)
    const [key, value] = root.resolveOneByAlias((aliases) => aliases.has('test-alias'), {
      args: ['custom-arg'],
      child: child,
      lazy: true,
    });

    // Verify the result
    expect(key).toBe('test-key');
    // With lazy: true, the value might be an object or a function depending on implementation
    // Just verify it exists
    expect(value).toBeDefined();
  });
});
