import { asAlias, asKey, Container, register, Registration as R, scope, singleton } from '../../lib';
import { DependencyMissingKeyError } from '../../lib/errors/DependencyMissingKeyError';

describe('Registration module', function () {
  const createContainer = () => new Container({ tags: ['root'] });

  it('should register class', function () {
    @register(asKey('ILogger'), scope((s) => s.hasTag('root')), singleton())
    class Logger {}

    const root = createContainer().addRegistration(R.fromClass(Logger));

    expect(root.resolveOne('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register value', function () {
    const root = createContainer().addRegistration(R.fromValue('smth').bindToKey('ISmth'));

    expect(root.resolveOne('ISmth')).toBe('smth');
  });

  it('should register fn', function () {
    const root = createContainer().addRegistration(R.fromFn(() => 'smth').bindToKey('ISmth'));

    expect(root.resolveOne('ISmth')).toBe('smth');
  });

  it('should raise an error if key is not provider', () => {
    expect(() => {
      createContainer().addRegistration(R.fromValue('smth'));
    }).toThrowError(DependencyMissingKeyError);
  });

  it('should register dependency by class name if @key is not provided', function () {
    class FileLogger {}

    const root = createContainer().addRegistration(R.fromClass(FileLogger));

    expect(root.resolveOne('FileLogger')).toBeInstanceOf(FileLogger);
  });

  it('should assign additional key which redirects to original one', function () {
    @register(asKey('ILogger'), asAlias('Logger'), singleton())
    class Logger {}

    const root = createContainer().addRegistration(R.fromClass(Logger));

    expect(root.resolveOne('Logger')).toBeInstanceOf(Logger);
    expect(root.resolveOne('ILogger')).toBeInstanceOf(Logger);
  });
});
