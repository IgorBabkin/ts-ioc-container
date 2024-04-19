import 'reflect-metadata';
import {
  Container,
  DependencyNotFoundError,
  key,
  MetadataInjector,
  provider,
  register,
  Registration as R,
  scope,
  singleton,
  visible,
} from '../../lib';

describe('Visibility', function () {
  it('should hide from children', () => {
    @register(key('logger'), scope((s) => s.hasTag('root')))
    @provider(singleton(), visible(({ isParent }) => isParent))
    class FileLogger {}

    const parent = new Container(new MetadataInjector(), { tags: ['root'] }).add(R.fromClass(FileLogger));

    const child = parent.createScope('child');

    expect(() => child.resolve('logger')).toThrowError(DependencyNotFoundError);
    expect(parent.resolve('logger')).toBeInstanceOf(FileLogger);
  });
});
