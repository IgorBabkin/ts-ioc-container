import {
  Container,
  isDependencyKey,
  MetadataInjector,
  Registration as R,
  ContainerDisposedError,
  EmptyContainer,
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
});
