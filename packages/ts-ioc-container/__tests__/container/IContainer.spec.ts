import 'reflect-metadata';
import {
  appendArgs,
  bindTo,
  Container,
  ProxyRegistry,
  type IContainer,
  Provider,
  register,
  Registration as R,
  scope,
  SingleToken,
  GroupAliasToken,
  singleton,
} from '../../lib';

describe('IContainer', function () {
  it('should run onDispose callback when disposing', function () {
    let isRootDisposed = false;
    const onDispose = (c: IContainer) => {
      if (c.hasTag('root')) {
        isRootDisposed = true;
      }
    };

    const container = new Container({ tags: ['root'] }).onInstanceDisposed(onDispose);

    container.dispose();

    expect(isRootDisposed).toBe(true);
  });

  it('should getInstances only from current scope when cascade is false', () => {
    class FileLogger {}

    const root = new Container({ tags: ['root'] });
    const child1 = root.createScope({ tags: ['child1'] });

    const logger1 = root.resolve(FileLogger);
    child1.resolve(FileLogger);

    expect(root.getInstances()).toEqual([logger1]);
  });

  it('should support custom Provider with appended args', function () {
    const greeting = appendArgs<string>('world').mapProvider(
      new Provider<string>((_, { args = [] }) => `hello ${args[0]}`),
    );
    const root = new Container({ tags: ['root'] }).register('myProvider', greeting, { aliases: ['greeting'] });

    expect(root.resolve('myProvider')).toBe('hello world');
    expect(root.resolveByAlias('greeting')[0]).toBe('hello world');
  });

  it('should bind a registration to multiple tokens and scope it', function () {
    interface ILogger {}

    const ILoggerToken = new SingleToken<ILogger>('ILogger');
    const ILoggerGroupToken = new GroupAliasToken<ILogger>('ILoggerGroup');

    @register(bindTo(ILoggerToken), bindTo(ILoggerGroupToken), scope((c) => c.hasTag('child1')), singleton())
    class FileLogger implements ILogger {}

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(FileLogger));
    const child1 = root.createScope({ tags: ['child1'] });

    const instance = ILoggerToken.resolve(child1);
    expect(instance).toBe(ILoggerGroupToken.resolve(child1)[0]);
  });

  describe('hasInstance', () => {
    class FileLogger {}

    it('should return true for an instance the scope owns', () => {
      const root = new Container({ tags: ['root'] });

      const logger = root.resolve(FileLogger);

      expect(root.hasInstance(logger)).toBe(true);
    });

    it('should return false for an instance owned by another scope', () => {
      const root = new Container({ tags: ['root'] });
      const child = root.createScope({ tags: ['child'] });

      const logger = child.resolve(FileLogger);

      expect(root.hasInstance(logger)).toBe(false);
      expect(child.hasInstance(logger)).toBe(true);
    });

    it('should return false for an unknown instance', () => {
      const root = new Container({ tags: ['root'] });

      expect(root.hasInstance(new FileLogger())).toBe(false);
    });

    it('should match a proxy of a tracked instance - it stands for its target', () => {
      const root = new Container({ tags: ['root'] });

      const logger = root.resolve(FileLogger);
      const proxy = ProxyRegistry.getInstance().createProxy(logger, {});

      expect(root.hasInstance(proxy)).toBe(true);
      expect(root.hasInstance(ProxyRegistry.getInstance().unwrap(proxy))).toBe(true);
    });

    it('should match a lazy proxy once it stands for a tracked instance', () => {
      const root = new Container({ tags: ['root'] });

      const lazy = ProxyRegistry.getInstance().createLazyProxy(() => root.resolve(FileLogger));

      expect(root.hasInstance(lazy)).toBe(true);
    });
  });
});
