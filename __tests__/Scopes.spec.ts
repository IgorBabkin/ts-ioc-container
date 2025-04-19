import {
  singleton,
  Container,
  Registration as R,
  scope,
  register,
  DependencyNotFoundError,
  type constructor,
  by,
  asKey,
} from '../lib';

@register(asKey('logger'), scope((s) => s.hasTag('home')), singleton())
class Logger {}

describe('Singleton', function () {
  it('should resolve the same dependency if provider registered per root', function () {
    const container = new Container({ tags: ['home'] }).addRegistration(R.fromClass(Logger));

    const child1 = container.createScope();
    const child2 = container.createScope();

    expect(child1.resolveOne('logger')).toBe(child2.resolveOne('logger'));
  });

  it('should resolve unique dependency for every registered scope', function () {
    const container = new Container().addRegistration(R.fromClass(Logger));

    const home1 = container.createScope({ tags: ['home'] });
    const home2 = container.createScope({ tags: ['home'] });

    expect(home1.resolveOne('logger')).not.toBe(home2.resolveOne('logger'));
  });

  it('should resolve unique dependency if registered scope has another registered scope', function () {
    const container = new Container({ tags: ['home'] }).addRegistration(R.fromClass(Logger));

    const child1 = container.createScope({ tags: ['home'] });

    expect(child1.resolveOne('logger')).not.toBe(container.resolveOne('logger'));
  });

  it('should collect instances from all scopes', function () {
    const container = new Container().addRegistration(R.fromClass(Logger));

    const childScope1 = container.createScope({ tags: ['home'] });
    const childScope2 = container.createScope({ tags: ['home'] });

    const logger1 = childScope1.resolveOne('logger');
    const logger2 = childScope2.resolveOne('logger');
    const instances = by.instances().resolve(container);

    expect(instances).toContain(logger1);
    expect(instances).toContain(logger2);
  });

  it('should be not visible from root', () => {
    @register(asKey('logger'), scope((s) => s.hasTag('child')))
    class FileLogger {}

    const parent = new Container({ tags: ['root'] }).addRegistration(R.fromClass(FileLogger));

    const child = parent.createScope({ tags: ['child'] });

    expect(() => parent.resolveOne('logger')).toThrowError(DependencyNotFoundError);
    expect(child.resolveOne('logger')).toBeInstanceOf(FileLogger);
  });

  it('should register class as value and read metadata', () => {
    @register(asKey('logger'), scope((s) => s.hasTag('child')))
    class FileLogger {}

    const parent = new Container({ tags: ['root'] }).addRegistration(R.fromValue(FileLogger));

    const child = parent.createScope({ tags: ['child'] });

    const LoggerClass = child.resolveOne<constructor<FileLogger>>('logger');
    expect(new LoggerClass()).toBeInstanceOf(FileLogger);
    expect(() => parent.resolveOne('logger')).toThrowError(DependencyNotFoundError);
  });

  it('should override keys', () => {
    @register(asKey('logger'), scope((s) => s.hasTag('root')))
    class FileLogger {}

    @register(asKey('logger'), scope((s) => s.hasTag('child')))
    class DbLogger {}

    const parent = new Container({ tags: ['root'] })
      .addRegistration(R.fromClass(FileLogger))
      .addRegistration(R.fromClass(DbLogger));

    const child = parent.createScope({ tags: ['child'] });

    expect(parent.resolveOne('logger')).toBeInstanceOf(FileLogger);
    expect(child.resolveOne('logger')).toBeInstanceOf(DbLogger);
  });

  it('should add registration to children', () => {
    @register(asKey('logger'), scope((s) => s.hasTag('child')))
    class DbLogger {}

    const parent = new Container({ tags: ['root'] });

    const child = parent.createScope({ tags: ['child'] }).addRegistration(R.fromClass(DbLogger));

    expect(child.resolveOne('logger')).toBeInstanceOf(DbLogger);
    expect(child.createScope().resolveOne('logger')).toBeInstanceOf(DbLogger);
  });
});
