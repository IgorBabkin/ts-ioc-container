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
  DependencyNotFoundError,
  constructor,
  by,
} from '../lib';

@register(key('logger'), scope((s) => s.hasTag('home')))
@provider(singleton())
class Logger {}

describe('Singleton', function () {
  it('should resolve the same dependency if provider registered per root', function () {
    const container = new Container(new MetadataInjector(), { tags: ['home'] }).add(R.toClass(Logger));

    const child1 = container.createScope();
    const child2 = container.createScope();

    expect(child1.resolve('logger')).toBe(child2.resolve('logger'));
  });

  it('should resolve unique dependency for every registered scope', function () {
    const container = new Container(new MetadataInjector()).add(R.toClass(Logger));

    const home1 = container.createScope({ tags: ['home'] });
    const home2 = container.createScope({ tags: ['home'] });

    expect(home1.resolve('logger')).not.toBe(home2.resolve('logger'));
  });

  it('should resolve unique dependency if registered scope has another registered scope', function () {
    const container = new Container(new MetadataInjector(), { tags: ['home'] }).add(R.toClass(Logger));

    const child1 = container.createScope({ tags: ['home'] });

    expect(child1.resolve('logger')).not.toBe(container.resolve('logger'));
  });

  it('should dispose all scopes', function () {
    const container = new Container(new MetadataInjector()).add(R.toClass(Logger));

    const child1 = container.createScope({ tags: ['home'] });
    const child2 = container.createScope({ tags: ['home'] });

    child1.resolve('logger');
    child2.resolve('logger');

    container.dispose();

    expect(() => child1.resolve('logger')).toThrowError(ContainerDisposedError);
    expect(() => child2.resolve('logger')).toThrowError(ContainerDisposedError);
  });

  it('should collect instances from all scopes', function () {
    const container = new Container(new MetadataInjector()).add(R.toClass(Logger));

    const childScope1 = container.createScope({ tags: ['home'] });
    const childScope2 = container.createScope({ tags: ['home'] });

    const logger1 = childScope1.resolve('logger');
    const logger2 = childScope2.resolve('logger');
    const instances = by.instances()(container);

    expect(instances).toContain(logger1);
    expect(instances).toContain(logger2);
  });

  it('should clear all instances on dispose', function () {
    const container = new Container(new MetadataInjector()).add(R.toClass(Logger));

    const child1 = container.createScope({ tags: ['home'] });
    const child2 = container.createScope({ tags: ['home'] });
    child1.resolve('logger');
    child2.resolve('logger');
    container.dispose();

    expect(by.instances()(container).length).toBe(0);
  });

  it('should be not visible from root', () => {
    @register(key('logger'), scope((s) => s.hasTag('child')))
    class FileLogger {}

    const parent = new Container(new MetadataInjector(), { tags: ['root'] }).add(R.toClass(FileLogger));

    const child = parent.createScope({ tags: ['child'] });

    expect(() => parent.resolve('logger')).toThrowError(DependencyNotFoundError);
    expect(child.resolve('logger')).toBeInstanceOf(FileLogger);
  });

  it('should register class as value and read metadata', () => {
    @register(key('logger'), scope((s) => s.hasTag('child')))
    class FileLogger {}

    const parent = new Container(new MetadataInjector(), { tags: ['root'] }).add(R.toValue(FileLogger));

    const child = parent.createScope({ tags: ['child'] });

    const LoggerClass = child.resolve<constructor<FileLogger>>('logger');
    expect(new LoggerClass()).toBeInstanceOf(FileLogger);
    expect(() => parent.resolve('logger')).toThrowError(DependencyNotFoundError);
  });

  it('should override keys', () => {
    @register(key('logger'), scope((s) => s.hasTag('root')))
    class FileLogger {}

    @register(key('logger'), scope((s) => s.hasTag('child')))
    class DbLogger {}

    const parent = new Container(new MetadataInjector(), { tags: ['root'] })
      .add(R.toClass(FileLogger))
      .add(R.toClass(DbLogger));

    const child = parent.createScope({ tags: ['child'] });

    expect(parent.resolve('logger')).toBeInstanceOf(FileLogger);
    expect(child.resolve('logger')).toBeInstanceOf(DbLogger);
  });

  it('should add registration to children', () => {
    @register(key('logger'), scope((s) => s.hasTag('child')))
    class DbLogger {}

    const parent = new Container(new MetadataInjector(), { tags: ['root'] });

    const child = parent.createScope({ tags: ['child'] }).add(R.toClass(DbLogger));

    expect(child.resolve('logger')).toBeInstanceOf(DbLogger);
    expect(child.createScope().resolve('logger')).toBeInstanceOf(DbLogger);
  });
});
