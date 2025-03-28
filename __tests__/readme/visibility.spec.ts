import 'reflect-metadata';
import {
  Container,
  DependencyNotFoundError,
  key,
  register,
  Registration as R,
  scope,
  singleton,
  visible,
} from '../../lib';

describe('Visibility', function () {
  it('should hide from children', () => {
    @register(key('logger'), scope((s) => s.hasTag('root')), singleton(), visible(({ isParent }) => isParent))
    class FileLogger {}

    const parent = new Container({ tags: ['root'] }).addRegistration(R.fromClass(FileLogger));

    const child = parent.createScope({ tags: ['child'] });

    expect(() => child.resolve('logger')).toThrowError(DependencyNotFoundError);
    expect(parent.resolve('logger')).toBeInstanceOf(FileLogger);
  });
});
