import { Container, isDependencyKey, MetadataInjector } from '../lib';

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
});
