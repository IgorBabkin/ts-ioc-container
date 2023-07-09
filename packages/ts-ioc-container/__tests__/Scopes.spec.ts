import 'reflect-metadata';
import {
  asSingleton,
  Container,
  ContainerDisposedError,
  forKey,
  perTags,
  provider,
  ReflectionInjector,
  Registration,
} from '../lib';

@forKey('logger')
@provider(asSingleton(), perTags('home'))
class Logger {}

describe('Singleton', function () {
  it('should resolve the same dependency if provider registered per root', function () {
    const container = new Container(new ReflectionInjector(), { tags: ['home'] }).add(Registration.fromClass(Logger));

    const child1 = container.createScope();
    const child2 = container.createScope();

    expect(child1.resolve('logger')).toBe(child2.resolve('logger'));
  });

  it('should resolve unique dependency for every registered scope', function () {
    const container = new Container(new ReflectionInjector()).add(Registration.fromClass(Logger));

    const child1 = container.createScope(['home']);
    const child2 = container.createScope(['home']);

    expect(child1.resolve('logger')).not.toBe(child2.resolve('logger'));
  });

  it('should resolve unique dependency if registered scope has another registered scope', function () {
    const container = new Container(new ReflectionInjector(), { tags: ['home'] }).add(Registration.fromClass(Logger));

    const child1 = container.createScope(['home']);

    expect(child1.resolve('logger')).not.toBe(container.resolve('logger'));
  });

  it('should dispose all scopes', function () {
    const container = new Container(new ReflectionInjector()).add(Registration.fromClass(Logger));

    const child1 = container.createScope(['home']);
    const child2 = container.createScope(['home']);

    child1.resolve('logger');
    child2.resolve('logger');

    container.dispose();

    expect(() => child1.resolve('logger')).toThrowError(ContainerDisposedError);
    expect(() => child2.resolve('logger')).toThrowError(ContainerDisposedError);
  });

  it('should collect instances from all scopes', function () {
    const container = new Container(new ReflectionInjector()).add(Registration.fromClass(Logger));

    const childScope1 = container.createScope(['home']);
    const childScope2 = container.createScope(['home']);

    const logger1 = childScope1.resolve('logger');
    const logger2 = childScope2.resolve('logger');
    const instances = container.getInstances();

    expect(instances).toContain(logger1);
    expect(instances).toContain(logger2);
  });

  it('should clear all instances on dispose', function () {
    const container = new Container(new ReflectionInjector()).add(Registration.fromClass(Logger));

    const child1 = container.createScope(['home']);
    const child2 = container.createScope(['home']);
    child1.resolve('logger');
    child2.resolve('logger');
    container.dispose();

    expect(container.getInstances().length).toBe(0);
  });
});
