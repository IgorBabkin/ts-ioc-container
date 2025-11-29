import {
  GroupAliasToken,
  bindTo,
  Container,
  DependencyNotFoundError,
  type IContainer,
  SingleToken,
  inject,
  isDependencyKey,
  Provider,
  ProviderDecorator,
  register,
  Registration,
  Registration as R,
  scope,
  select as s,
  singleton,
} from '../../lib';

describe('IContainer', function () {
  it('should accept a symbol as dependency key', function () {
    expect(isDependencyKey(Symbol('key'))).toBe(true);
  });
  it('should accept a string as dependency key', function () {
    expect(isDependencyKey('key')).toBe(true);
  });

  it('should run onDispose callback when disposing every child', function () {
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

  it('should assign a dependency key to a registration', function () {
    interface ILogger {}

    const ILoggerKey = new SingleToken<ILogger>('ILogger');
    const ILoggerKey2 = new GroupAliasToken<ILogger>('ILogger2');
    const ILoggerKey3 = new GroupAliasToken<ILogger>('ILogger3');

    @register(
      bindTo(ILoggerKey),
      bindTo(ILoggerKey2),
      bindTo(ILoggerKey3),
      bindTo(s.alias('ILogger4')),
      bindTo(s.alias('ILogger5')),
      scope((c) => c.hasTag('child1')),
      singleton(),
    )
    class FileLogger {}

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(FileLogger));
    const child1 = root.createScope({ tags: ['child1'] });
    const child2 = root.createScope({ tags: ['child2'] });

    expect(ILoggerKey.resolve(child1)).toBe(ILoggerKey2.resolve(child1)[0]);
    expect(ILoggerKey.resolve(child1)).toBe(ILoggerKey3.resolve(child1)[0]);
    expect(ILoggerKey.resolve(child1)).toBe(child1.resolveByAlias('ILogger4')[0]);
    expect(ILoggerKey.resolve(child1)).toBe(child1.resolveByAlias('ILogger5')[0]);
    expect(() => ILoggerKey.resolve(child2)).toThrow(DependencyNotFoundError);
  });

  it('should test register decorator', function () {
    interface ILogger {}

    const ILoggerKey = new SingleToken<ILogger>('ILogger');

    @register(bindTo(ILoggerKey))
    class FileLogger {}

    @register(bindTo('INormalizer'))
    class Normalizer {}

    const root = new Container({ tags: ['root'] })
      .addRegistration(R.fromClass(FileLogger))
      .addRegistration(R.fromClass(Normalizer));

    expect(ILoggerKey.resolve(root)).toBeInstanceOf(FileLogger);
    expect(root.resolve('INormalizer')).toBeInstanceOf(Normalizer);
  });

  it('should test provider decorator', function () {
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

  it('should getInstances only from current scope if cascade is false', () => {
    class FileLogger {}

    const root = new Container({ tags: ['root'] });
    const child1 = root.createScope({ tags: ['child1'] });

    const logger1 = root.resolve(FileLogger);
    child1.resolve(FileLogger);

    expect(root.getInstances()).toEqual([logger1]);
  });

  it('should create instance and inject it', () => {
    class Logger {
      name = 'Logger';
      messages: string[] = [];

      info(msg: string) {
        this.messages.push(msg);
      }

      output(): string {
        return this.messages.join('');
      }
    }
    class TestApp {
      constructor(@inject(Logger) private logger: Logger) {}

      run() {
        this.logger.info('Start');
      }

      stop() {
        this.logger.info('Stop');
      }

      display() {
        return this.logger.output();
      }
    }

    const root = new Container({ tags: ['root'] });
    const app = root.resolve(TestApp);
    app.run();
    app.stop();
    expect(app.display()).toEqual('StartStop');
  });

  it('Resolve with aliases', () => {
    const container = new Container();

    for (let i = 0; i < 20; i++) {
      container.addRegistration(
        Registration.fromFn(() => `value-${i}`)
          .bindToKey(`key-${i}`)
          .bindToAlias('valueAlias')
          .bindToAlias(`alias-${i}`),
      );
    }

    for (let i = 0; i < 20; i++) {
      const child = container.createScope();
      const deps = child.resolveByAlias('valueAlias');
      expect(deps.length).toEqual(20);
      child.dispose();
    }

    container.dispose();
  });
});
