import { Container, IContainer, isDependencyKey, MetadataInjector } from '../lib';

describe('IContainer', function () {
  it('should accept a symbol as dependency key', function () {
    expect(isDependencyKey(Symbol('key'))).toBe(true);
  });
  it('should accept a string as dependency key', function () {
    expect(isDependencyKey('key')).toBe(true);
  });

  it('should run onDispose callback when disposing every child', function () {
    let isRootDisposed = false;
    let isChild1Disposed = false;
    let isChild2Disposed = false;
    const onDispose = (c: IContainer) => {
      if (c.hasTag('root')) {
        isRootDisposed = true;
      }

      if (c.hasTag('child1')) {
        isChild1Disposed = true;
      }

      if (c.hasTag('child2')) {
        isChild2Disposed = true;
      }
    };

    const container = new Container(new MetadataInjector(), { tags: ['root'], onDispose });

    const child1 = container.createScope({ tags: ['child1'] });
    const child2 = container.createScope({ tags: ['child2'] });

    container.dispose();

    expect(isRootDisposed).toBe(true);
    expect(isChild1Disposed).toBe(true);
    expect(isChild2Disposed).toBe(true);
  });
});
