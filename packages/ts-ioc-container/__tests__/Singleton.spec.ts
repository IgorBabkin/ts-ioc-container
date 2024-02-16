import 'reflect-metadata';
import { singleton, Container, key, provider, ReflectionInjector, Registration } from 'ts-ioc-container';

@key('logger')
@provider(singleton())
class Logger {}

describe('Singleton', function () {
  function createContainer() {
    return new Container(new ReflectionInjector());
  }

  it('should resolve the same container per every request', function () {
    const container = createContainer().use(Registration.fromClass(Logger));

    expect(container.resolve('logger')).toBe(container.resolve('logger'));
  });

  it('should resolve different dependency per scope', function () {
    const container = createContainer().use(Registration.fromClass(Logger));
    const child = container.createScope();

    expect(container.resolve('logger')).not.toBe(child.resolve('logger'));
  });

  it('should resolve the same dependency for scope', function () {
    const container = createContainer().use(Registration.fromClass(Logger));
    const child = container.createScope();

    expect(child.resolve('logger')).toBe(child.resolve('logger'));
  });
});
