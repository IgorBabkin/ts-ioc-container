import 'reflect-metadata';
import {
  bindTo,
  Container,
  type IContainer,
  Provider,
  ProviderDecorator,
  register,
  Registration as R,
  scope,
  select,
  SingleToken,
  GroupAliasToken,
  singleton,
} from '../../lib';

describe('IContainer', function () {
  it('should run addOnDisposeHook callback when disposing', function () {
    let isRootDisposed = false;
    const onDispose = (c: IContainer) => {
      if (c.hasTag('root')) {
        isRootDisposed = true;
      }
    };

    const container = new Container({ tags: ['root'] }).addOnDisposeHook(onDispose);

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

  it('should support ProviderDecorator for custom provider wrapping', function () {
    class MyProvider extends ProviderDecorator<string> {
      constructor() {
        super(new Provider((c, { args = [] }) => `hello ${args[0]}`));
      }
    }

    const provider = new MyProvider().setArgs(() => ['world']);
    const root = new Container({ tags: ['root'] }).register('myProvider', provider, { aliases: ['greeting'] });

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
});
