import {
  asAlias,
  asKey,
  Container,
  DependencyNotFoundError,
  depKey,
  type IContainer,
  inject,
  Is,
  Provider,
  ProviderDecorator,
  register,
  Registration,
  Registration as R,
  singleton,
} from '../lib';

describe('IContainer', function () {
  it('should accept a symbol as dependency key', function () {
    expect(Is.dependencyKey(Symbol('key'))).toBe(true);
  });
  it('should accept a string as dependency key', function () {
    expect(Is.dependencyKey('key')).toBe(true);
  });

  it('should run onDispose callback when disposing every child', function () {
    let isRootDisposed = false;
    const onDispose = (c: IContainer) => {
      if (c.hasTag('root')) {
        isRootDisposed = true;
      }
    };

    const container = new Container({ tags: ['root'], onDispose });

    container.dispose();

    expect(isRootDisposed).toBe(true);
  });

  it('should assign a dependency key to a registration', function () {
    interface ILogger {}

    const ILoggerKey = depKey<ILogger>('ILogger')
      .when((c) => c.hasTag('child1'))
      .pipe(singleton());

    const ILoggerKey2 = depKey<ILogger>('ILogger2');
    const ILoggerKey3 = depKey<ILogger>('ILogger3');

    @register(ILoggerKey.asKey, ILoggerKey2.asAlias, asAlias(ILoggerKey3), asAlias('ILogger4'), asAlias('ILogger5'))
    class FileLogger {}

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(FileLogger));
    const child1 = root.createScope({ tags: ['child1'] });
    const child2 = root.createScope({ tags: ['child2'] });

    expect(ILoggerKey.resolve(child1)).toBe(ILoggerKey2.resolve(child1));
    expect(ILoggerKey.resolve(child1)).toBe(ILoggerKey3.resolve(child1));
    expect(ILoggerKey.resolve(child1)).toBe(child1.resolveOne('ILogger4'));
    expect(ILoggerKey.resolve(child1)).toBe(child1.resolveOne('ILogger5'));
    expect(() => ILoggerKey.resolve(child2)).toThrow(DependencyNotFoundError);
  });

  it('should test register decorator', function () {
    interface ILogger {}

    const ILoggerKey = depKey<ILogger>('ILogger');

    @register(ILoggerKey.asKey)
    class FileLogger {}

    @register(asKey('INormalizer'))
    class Normalizer {}

    const root = new Container({ tags: ['root'] })
      .addRegistration(R.fromClass(FileLogger))
      .addRegistration(R.fromClass(Normalizer));

    expect(ILoggerKey.resolve(root)).toBeInstanceOf(FileLogger);
    expect(root.resolveOne('INormalizer')).toBeInstanceOf(Normalizer);
  });

  it('should test isDepKey', function () {
    interface ILogger {}

    const ILoggerKey = depKey<ILogger>('ILogger')
      .when((c) => c.hasTag('child1'))
      .pipe(singleton());

    expect(Is.DepKey(ILoggerKey)).toBe(true);
  });

  it('should test provider decorator', function () {
    class MyProvider extends ProviderDecorator<string> {
      constructor() {
        super(new Provider((c, { args }) => `hello ${args[0]}`));
      }
    }

    const provider = new MyProvider().setArgs(() => ['world']);
    const root = new Container({ tags: ['root'] }).register('myProvider', provider, { aliases: ['greeting'] });

    expect(root.resolveOne('myProvider')).toBe('hello world');
    expect(root.resolveOne('greeting')).toBe('hello world');
  });

  it('should getInstances only from current scope if cascade is false', () => {
    class FileLogger {}

    const root = new Container({ tags: ['root'] });
    const child1 = root.createScope({ tags: ['child1'] });

    const logger1 = root.resolveOne(FileLogger);
    child1.resolveOne(FileLogger);

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
    const app = root.resolveClass(TestApp);
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
      const deps = child.resolveMany('valueAlias');
      expect(deps.length).toEqual(20);
      child.dispose();
    }

    container.dispose();
  });
});
