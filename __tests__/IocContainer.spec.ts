import 'reflect-metadata';
import {
  singleton,
  Container,
  ContainerDisposedError,
  DependencyNotFoundError,
  key,
  provider,
  MetadataInjector,
  Registration as R,
  args,
  register,
  by,
} from '../lib';

@register(key('logger'))
class Logger {
  constructor(public topic: string) {}
}

describe('IocContainer', function () {
  function createContainer() {
    return new Container();
  }

  it('should resolve dependency', function () {
    const container = createContainer().add(R.toClass(Logger));

    expect(container.resolve('logger')).toBeInstanceOf(Logger);
  });

  it('should resolve unique dependency per every request', function () {
    const container = createContainer().add(R.toClass(Logger));

    expect(container.resolve('logger')).not.toBe(container.resolve('logger'));
  });

  it('should register provider as constructor name if key is not provided', function () {
    class TestClass {}

    const container = createContainer();
    container.add(R.toClass(TestClass));

    expect(container.resolve('TestClass')).toBeInstanceOf(TestClass);
  });

  it('should keep all instances', function () {
    const container = createContainer().add(R.toClass(Logger));

    const logger = container.resolve<Logger>('logger');

    expect(by.instances()(container)).toContain(logger);
  });

  it('should dispose all instances', function () {
    const container = createContainer().add(R.toClass(Logger));

    container.resolve('logger');
    container.dispose();

    expect(by.instances()(container).length).toBe(0);
  });

  it('should throw an error if provider is not registered', function () {
    const container = createContainer();

    expect(() => container.resolve('logger')).toThrowError(DependencyNotFoundError);
  });

  it('should throw an error when trying to resolve a dependency of disposed container', function () {
    const container = createContainer().add(R.toClass(Logger));

    container.dispose();

    expect(() => container.resolve('logger')).toThrowError(ContainerDisposedError);
  });

  it('should throw an error when trying to register a provider of disposed container', function () {
    const container = createContainer();

    container.dispose();

    expect(() => container.add(R.toClass(Logger))).toThrowError(ContainerDisposedError);
  });

  it('should keep argument for provider', function () {
    const container = createContainer().add(R.toClass(Logger).pipe(args('main')));

    expect(container.resolve<Logger>('logger').topic).toBe('main');
  });

  it('should use builder decorators', function () {
    @provider(singleton())
    class Logger1 {}

    const container = createContainer().add(R.toClass(Logger1).fromKey('logger'));

    expect(container.resolve('logger')).toBe(container.resolve('logger'));
  });
});
