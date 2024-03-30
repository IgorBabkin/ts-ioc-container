import 'reflect-metadata';
import { singleton, Container, provider, MetadataInjector, Registration as R, key, scope, register } from '../../lib';
import { DependencyMissingKeyError } from '../../lib/errors/DependencyMissingKeyError';

describe('Registration module', function () {
  const createContainer = () => new Container(new MetadataInjector(), { tags: ['root'] });

  it('should register class', function () {
    @register(key('ILogger'))
    @provider(singleton(), scope((s) => s.hasTag('root')))
    class Logger {}

    const root = createContainer().use(R.fromClass(Logger));

    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register value', function () {
    const root = createContainer().use(R.fromValue('smth').to('ISmth'));

    expect(root.resolve('ISmth')).toBe('smth');
  });

  it('should register fn', function () {
    const root = createContainer().use(R.fromFn(() => 'smth').to('ISmth'));

    expect(root.resolve('ISmth')).toBe('smth');
  });

  it('should raise an error if key is not provider', () => {
    expect(() => {
      createContainer().use(R.fromValue('smth'));
    }).toThrowError(DependencyMissingKeyError);
  });

  it('should register dependency by class name if @key is not provided', function () {
    class FileLogger {}

    const root = createContainer().use(R.fromClass(FileLogger));

    expect(root.resolve('FileLogger')).toBeInstanceOf(FileLogger);
  });
});
