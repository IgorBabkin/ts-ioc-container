import 'reflect-metadata';
import {
  singleton,
  Container,
  ContainerDisposedError,
  key,
  provider,
  MetadataInjector,
  Registration as R,
  scope,
  register,
  visible,
  DependencyNotFoundError,
} from '../lib';

@register(key('logger'))
@provider(singleton(), scope((s) => s.hasTag('home')))
class Logger {}

describe('Singleton', function () {
  it('should resolve the same dependency if provider registered per root', function () {
    const container = new Container(new MetadataInjector(), { tags: ['home'] }).use(R.fromClass(Logger));

    const child1 = container.createScope();
    const child2 = container.createScope();

    expect(child1.resolve('logger')).toBe(child2.resolve('logger'));
  });

  it('should resolve unique dependency for every registered scope', function () {
    const container = new Container(new MetadataInjector()).use(R.fromClass(Logger));

    const home1 = container.createScope('home');
    const home2 = container.createScope('home');

    expect(home1.resolve('logger')).not.toBe(home2.resolve('logger'));
  });

  it('should resolve unique dependency if registered scope has another registered scope', function () {
    const container = new Container(new MetadataInjector(), { tags: ['home'] }).use(R.fromClass(Logger));

    const child1 = container.createScope('home');

    expect(child1.resolve('logger')).not.toBe(container.resolve('logger'));
  });

  it('should dispose all scopes', function () {
    const container = new Container(new MetadataInjector()).use(R.fromClass(Logger));

    const child1 = container.createScope('home');
    const child2 = container.createScope('home');

    child1.resolve('logger');
    child2.resolve('logger');

    container.dispose();

    expect(() => child1.resolve('logger')).toThrowError(ContainerDisposedError);
    expect(() => child2.resolve('logger')).toThrowError(ContainerDisposedError);
  });

  it('should collect instances from all scopes', function () {
    const container = new Container(new MetadataInjector()).use(R.fromClass(Logger));

    const childScope1 = container.createScope('home');
    const childScope2 = container.createScope('home');

    const logger1 = childScope1.resolve('logger');
    const logger2 = childScope2.resolve('logger');
    const instances = container.getInstances();

    expect(instances).toContain(logger1);
    expect(instances).toContain(logger2);
  });

  it('should clear all instances on dispose', function () {
    const container = new Container(new MetadataInjector()).use(R.fromClass(Logger));

    const child1 = container.createScope('home');
    const child2 = container.createScope('home');
    child1.resolve('logger');
    child2.resolve('logger');
    container.dispose();

    expect(container.getInstances().length).toBe(0);
  });

  it('should hide from children', () => {
    @register(key('logger'))
    @provider(singleton(), scope((s) => s.hasTag('root')), visible(({ isParent }) => isParent))
    class FileLogger {}

    const parent = new Container(new MetadataInjector(), { tags: ['root'] }).use(R.fromClass(FileLogger));

    const child = parent.createScope('child');

    expect(() => child.resolve('logger')).toThrowError(DependencyNotFoundError);
    expect(parent.resolve('logger')).toBeInstanceOf(FileLogger);
  });

  it('should be not visible from root', () => {
    @register(key('logger'))
    @provider(scope((s) => s.hasTag('child')))
    class FileLogger {}

    const parent = new Container(new MetadataInjector(), { tags: ['root'] }).use(R.fromClass(FileLogger));

    const child = parent.createScope('child');

    expect(() => parent.resolve('logger')).toThrowError(DependencyNotFoundError);
    expect(child.resolve('logger')).toBeInstanceOf(FileLogger);
  });
});
