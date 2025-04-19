import {
  args,
  asKey,
  by,
  Container,
  ContainerDisposedError,
  DependencyNotFoundError,
  register,
  Registration as R,
  singleton,
} from '../lib';

@register(asKey('logger'))
class Logger {
  constructor(public topic: string) {}
}

describe('IocContainer', function () {
  function createContainer() {
    return new Container();
  }

  it('should resolve dependency', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));

    expect(container.resolveOne('logger')).toBeInstanceOf(Logger);
  });

  it('should resolve unique dependency per every request', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));

    expect(container.resolveOne('logger')).not.toBe(container.resolveOne('logger'));
  });

  it('should register provider as constructor name if key is not provided', function () {
    class TestClass {}

    const container = createContainer();
    container.addRegistration(R.fromClass(TestClass));

    expect(container.resolveOne('TestClass')).toBeInstanceOf(TestClass);
  });

  it('should keep all instances', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));

    const logger = container.resolveOne<Logger>('logger');

    expect(by.instances().resolve(container)).toContain(logger);
  });

  it('should dispose all instances', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));

    container.resolveOne('logger');
    container.dispose();

    expect(by.instances().resolve(container).length).toBe(0);
  });

  it('should throw an error if provider is not registered', function () {
    const container = createContainer();

    expect(() => container.resolveOne('logger')).toThrowError(DependencyNotFoundError);
  });

  it('should throw an error when trying to resolve a dependency of disposed container', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));

    container.dispose();

    expect(() => container.resolveOne('logger')).toThrowError(ContainerDisposedError);
  });

  it('should throw an error when trying to register a provider of disposed container', function () {
    const container = createContainer();

    container.dispose();

    expect(() => container.addRegistration(R.fromClass(Logger))).toThrowError(ContainerDisposedError);
  });

  it('should keep argument for provider', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger).pipe(args('main')));

    expect(container.resolveOne<Logger>('logger').topic).toBe('main');
  });

  it('should use builder decorators', function () {
    @register(singleton())
    class Logger1 {}

    const container = createContainer().addRegistration(R.fromClass(Logger1).bindToKey('logger'));

    expect(container.resolveOne('logger')).toBe(container.resolveOne('logger'));
  });
});
