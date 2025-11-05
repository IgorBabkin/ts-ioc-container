import {
  bindTo,
  Container,
  DependencyMissingKeyError,
  register,
  Registration as R,
  scope,
  singleton,
  toAlias,
} from '../../lib';

describe('Registration module', function () {
  const createContainer = () => new Container({ tags: ['root'] });

  it('should register class', function () {
    @register(bindTo('ILogger'), scope((s) => s.hasTag('root')), singleton())
    class Logger {}

    const root = createContainer().addRegistration(R.fromClass(Logger));

    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register value', function () {
    const root = createContainer().addRegistration(R.fromValue('smth').bindToKey('ISmth'));

    expect(root.resolve('ISmth')).toBe('smth');
  });

  it('should register fn', function () {
    const root = createContainer().addRegistration(R.fromFn(() => 'smth').bindToKey('ISmth'));

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
    @register(bindTo('ILogger'), bindTo(toAlias('Logger')), singleton())
    class Logger {}

    const root = createContainer().addRegistration(R.fromClass(Logger));

    expect(root.resolveByAlias('Logger')[0]).toBeInstanceOf(Logger);
    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });
});
