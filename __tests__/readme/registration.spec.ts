import 'reflect-metadata';
import { Container, key, provider, register, Registration as R, scope, singleton } from '../../lib';
import { DependencyMissingKeyError } from '../../lib/errors/DependencyMissingKeyError';

describe('Registration module', function () {
  const createContainer = () => new Container({ tags: ['root'] });

  it('should register class', function () {
    @register(key('ILogger'), scope((s) => s.hasTag('root')))
    @provider(singleton())
    class Logger {}

    const root = createContainer().add(R.toClass(Logger));

    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register value', function () {
    const root = createContainer().add(R.toValue('smth').fromKey('ISmth'));

    expect(root.resolve('ISmth')).toBe('smth');
  });

  it('should register fn', function () {
    const root = createContainer().add(R.toFn(() => 'smth').fromKey('ISmth'));

    expect(root.resolve('ISmth')).toBe('smth');
  });

  it('should raise an error if key is not provider', () => {
    expect(() => {
      createContainer().add(R.toValue('smth'));
    }).toThrowError(DependencyMissingKeyError);
  });

  it('should register dependency by class name if @key is not provided', function () {
    class FileLogger {}

    const root = createContainer().add(R.toClass(FileLogger));

    expect(root.resolve('FileLogger')).toBeInstanceOf(FileLogger);
  });

  it('should assign additional key which redirects to original one', function () {
    @register(key('ILogger', 'Logger'))
    @provider(singleton())
    class Logger {}

    const root = createContainer().add(R.toClass(Logger));

    expect(root.resolve('Logger')).toBeInstanceOf(Logger);
    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });
});
