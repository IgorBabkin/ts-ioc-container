import 'reflect-metadata';
import { Container, key, MetadataInjector, register, Registration as R, scope, singleton } from '../../lib';
import { DependencyMissingKeyError } from '../../lib/errors/DependencyMissingKeyError';

describe('Registration module', function () {
  const createContainer = () => new Container(new MetadataInjector(), { tags: ['root'] });

  it('should register class', function () {
    @register(key('ILogger'), scope((s) => s.hasTag('root')), singleton())
    class Logger {}

    const root = createContainer().add(R.fromClass(Logger));

    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register value', function () {
    const root = createContainer().add(R.fromValue('smth').to('ISmth'));

    expect(root.resolve('ISmth')).toBe('smth');
  });

  it('should register fn', function () {
    const root = createContainer().add(R.fromFn(() => 'smth').to('ISmth'));

    expect(root.resolve('ISmth')).toBe('smth');
  });

  it('should raise an error if key is not provider', () => {
    expect(() => {
      createContainer().add(R.fromValue('smth'));
    }).toThrowError(DependencyMissingKeyError);
  });

  it('should register dependency by class name if @key is not provided', function () {
    class FileLogger {}

    const root = createContainer().add(R.fromClass(FileLogger));

    expect(root.resolve('FileLogger')).toBeInstanceOf(FileLogger);
  });
});
