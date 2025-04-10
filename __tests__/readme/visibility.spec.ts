import 'reflect-metadata';
import {
  asKey,
  Container,
  DependencyNotFoundError,
  register,
  Registration as R,
  scope,
  singleton,
  scopeAccess,
} from '../../lib';

describe('Visibility', function () {
  it('should hide from children', () => {
    @register(
      asKey('logger'),
      scope((s) => s.hasTag('root')),
      singleton(),
      scopeAccess(({ invocationScope, providerScope }) => invocationScope === providerScope),
    )
    class FileLogger {}

    const parent = new Container({ tags: ['root'] }).addRegistration(R.fromClass(FileLogger));

    const child = parent.createScope({ tags: ['child'] });

    expect(() => child.resolveOne('logger')).toThrowError(DependencyNotFoundError);
    expect(parent.resolveOne('logger')).toBeInstanceOf(FileLogger);
  });
});
