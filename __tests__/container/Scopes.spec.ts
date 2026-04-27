import 'reflect-metadata';
import {
  bindTo,
  type constructor,
  Container,
  DependencyNotFoundError,
  register,
  Registration as R,
  scope,
  select,
  singleton,
} from '../../lib';

@register(bindTo('logger'))
@register(scope((s) => s.hasTag('home')), singleton())
@register(singleton())
class Logger {}

describe('Scopes', function () {
  it('should resolve the same instance when singleton is registered at root with matching tag', function () {
    const container = new Container({ tags: ['home'] }).addRegistration(R.fromClass(Logger));

    const child1 = container.createScope();
    const child2 = container.createScope();

    expect(child1.resolve('logger')).toBe(child2.resolve('logger'));
  });

  it('should resolve unique instance per matching scope when scope rule differs', function () {
    const container = new Container().addRegistration(R.fromClass(Logger));

    const home1 = container.createScope({ tags: ['home'] });
    const home2 = container.createScope({ tags: ['home'] });

    expect(home1.resolve('logger')).not.toBe(home2.resolve('logger'));
  });

  it('should not share singleton between parent and child when both match scope rule', function () {
    const container = new Container({ tags: ['home'] }).addRegistration(R.fromClass(Logger));

    const child1 = container.createScope({ tags: ['home'] });

    expect(child1.resolve('logger')).not.toBe(container.resolve('logger'));
  });

  it('should collect instances from all child scopes', function () {
    const container = new Container().addRegistration(R.fromClass(Logger));

    const childScope1 = container.createScope({ tags: ['home'] });
    const childScope2 = container.createScope({ tags: ['home'] });

    const logger1 = childScope1.resolve('logger');
    const logger2 = childScope2.resolve('logger');
    const instances = select.instances().resolve(container);

    expect(instances).toContain(logger1);
    expect(instances).toContain(logger2);
  });

  it('should not be visible from parent when scope rule excludes parent', () => {
    @register(bindTo('logger'), scope((s) => s.hasTag('child')))
    class FileLogger {}

    const parent = new Container({ tags: ['root'] }).addRegistration(R.fromClass(FileLogger));
    const child = parent.createScope({ tags: ['child'] });

    expect(() => parent.resolve('logger')).toThrowError(DependencyNotFoundError);
    expect(child.resolve('logger')).toBeInstanceOf(FileLogger);
  });

  it('should register a class as a value and allow reading metadata', () => {
    @register(bindTo('logger'), scope((s) => s.hasTag('child')))
    class FileLogger {}

    const parent = new Container({ tags: ['root'] }).addRegistration(R.fromValue(FileLogger));
    const child = parent.createScope({ tags: ['child'] });

    const LoggerClass = child.resolve<constructor<FileLogger>>('logger');
    expect(new LoggerClass()).toBeInstanceOf(FileLogger);
    expect(() => parent.resolve('logger')).toThrowError(DependencyNotFoundError);
  });

  it('should override the same key in different scopes', () => {
    @register(bindTo('logger'), scope((s) => s.hasTag('root')))
    class FileLogger {}

    @register(bindTo('logger'), scope((s) => s.hasTag('child')))
    class DbLogger {}

    const parent = new Container({ tags: ['root'] })
      .addRegistration(R.fromClass(FileLogger))
      .addRegistration(R.fromClass(DbLogger));

    const child = parent.createScope({ tags: ['child'] });

    expect(parent.resolve('logger')).toBeInstanceOf(FileLogger);
    expect(child.resolve('logger')).toBeInstanceOf(DbLogger);
  });

  it('should propagate registrations added to a child scope into its own children', () => {
    @register(bindTo('logger'), scope((s) => s.hasTag('child')))
    class DbLogger {}

    const parent = new Container({ tags: ['root'] });
    const child = parent.createScope({ tags: ['child'] }).addRegistration(R.fromClass(DbLogger));

    expect(child.resolve('logger')).toBeInstanceOf(DbLogger);
    expect(child.createScope().resolve('logger')).toBeInstanceOf(DbLogger);
  });
});
