import 'reflect-metadata';
import { Container, key, provider, register, Registration as R, scope, singleton } from '../../lib';
import { DependencyMissingKeyError } from '../../lib/errors/DependencyMissingKeyError';

describe('Registration module', function () {
  const createContainer = () => new Container({ tags: ['root'] });

  it('should register class', function () {
    @register('ILogger', scope((s) => s.hasTag('root')), provider(singleton()))
    class Logger {}

    const root = createContainer().addRegistration(R.fromClass(Logger));

    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register value', function () {
    const root = createContainer().addRegistration(R.fromValue('smth').assignToKey('ISmth'));

    expect(root.resolve('ISmth')).toBe('smth');
  });

  it('should register fn', function () {
    const root = createContainer().addRegistration(R.fromFn(() => 'smth').assignToKey('ISmth'));

    expect(root.resolve('ISmth')).toBe('smth');
  });

  it('should raise an error if key is not provider', () => {
    expect(() => {
      createContainer().addRegistration(R.fromValue('smth'));
    }).toThrowError(DependencyMissingKeyError);
  });

  it('should register dependency by class name if @key is not provided', function () {
    class FileLogger {}

    const root = createContainer().addRegistration(R.fromClass(FileLogger));

    expect(root.resolve('FileLogger')).toBeInstanceOf(FileLogger);
  });

  it('should assign additional key which redirects to original one', function () {
    @register('ILogger', 'Logger', provider(singleton()))
    class Logger {}

    const root = createContainer().addRegistration(R.fromClass(Logger));

    expect(root.resolve('Logger')).toBeInstanceOf(Logger);
    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });
});
