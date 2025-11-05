import {
  bindTo,
  Container,
  DependencyNotFoundError,
  register,
  Registration as R,
  scope,
  scopeAccess,
  singleton,
} from '../../lib';

describe('Visibility', function () {
  it('should hide from children', () => {
    @register(
      bindTo('logger'),
      scope((s) => s.hasTag('root')),
      singleton(),
      scopeAccess(({ invocationScope, providerScope }) => invocationScope === providerScope),
    )
    class FileLogger {}

    const parent = new Container({ tags: ['root'] }).addRegistration(R.fromClass(FileLogger));

    const child = parent.createScope({ tags: ['child'] });

    expect(() => child.resolve('logger')).toThrowError(DependencyNotFoundError);
    expect(parent.resolve('logger')).toBeInstanceOf(FileLogger);
  });
});
