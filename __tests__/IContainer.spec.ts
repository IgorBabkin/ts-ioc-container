import {
  alias,
  by,
  Container,
  DependencyNotFoundError,
  depKey,
  type IContainer,
  inject,
  isDependencyKey,
  Provider,
  ProviderDecorator,
  register,
  Registration,
  Registration as R,
  singleton,
} from '../lib';
import { isDepKey } from '../lib/DepKey';

describe('IContainer', function () {
  it('should accept a symbol as dependency key', function () {
    expect(isDependencyKey(Symbol('key'))).toBe(true);
  });
  it('should accept a string as dependency key', function () {
    expect(isDependencyKey('key')).toBe(true);
  });

  it('should run onDispose callback when disposing every child', function () {
    let isRootDisposed = false;
    let isChild1Disposed = false;
    let isChild2Disposed = false;
    const onDispose = (c: IContainer) => {
      if (c.hasTag('root')) {
        isRootDisposed = true;
      }

      if (c.hasTag('child1')) {
        isChild1Disposed = true;
      }

      if (c.hasTag('child2')) {
        isChild2Disposed = true;
      }
    };

    const container = new Container({ tags: ['root'], onDispose });

    const child1 = container.createScope({ tags: ['child1'] });
    const child2 = container.createScope({ tags: ['child2'] });

    container.dispose();

    expect(isRootDisposed).toBe(true);
    expect(isChild1Disposed).toBe(true);
    expect(isChild2Disposed).toBe(true);
  });

  it('should assign a dependency key to a registration', function () {
    interface ILogger {}

    const ILoggerKey = depKey<ILogger>('ILogger')
      .when((c) => c.hasTag('child1'))
      .pipe(singleton());

    const ILoggerKey2 = depKey<ILogger>('ILogger2');
    const ILoggerKey3 = depKey<ILogger>('ILogger3');

    @register(ILoggerKey.assignTo, ILoggerKey2.asAlias, ILoggerKey3, 'ILogger4', alias('ILogger5'))
    class FileLogger {}

    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(FileLogger));
    const child1 = root.createScope({ tags: ['child1'] });
    const child2 = root.createScope({ tags: ['child2'] });

    expect(ILoggerKey.resolve(child1)).toBe(ILoggerKey2.resolve(child1));
    expect(ILoggerKey.resolve(child1)).toBe(ILoggerKey3.resolve(child1));
    expect(ILoggerKey.resolve(child1)).toBe(child1.resolve('ILogger4'));
    expect(ILoggerKey.resolve(child1)).toBe(child1.resolve('ILogger5'));
    expect(() => ILoggerKey.resolve(child2)).toThrow(DependencyNotFoundError);
  });

  it('should test register decorator', function () {
    interface ILogger {}

    const ILoggerKey = depKey<ILogger>('ILogger');

    @register(ILoggerKey)
    class FileLogger {}

    @register('INormalizer')
    class Normalizer {}

    const root = new Container({ tags: ['root'] })
      .addRegistration(R.fromClass(FileLogger))
      .addRegistration(R.fromClass(Normalizer));

    expect(ILoggerKey.resolve(root)).toBeInstanceOf(FileLogger);
    expect(root.resolve('INormalizer')).toBeInstanceOf(Normalizer);
  });

  it('should test isDepKey', function () {
    interface ILogger {}

    const ILoggerKey = depKey<ILogger>('ILogger')
      .when((c) => c.hasTag('child1'))
      .pipe(singleton());

    expect(isDepKey(ILoggerKey)).toBe(true);
  });

  it('should test provider decorator', function () {
    class MyProvider extends ProviderDecorator<string> {
      constructor() {
        super(new Provider((c, { args }) => `hello ${args[0]}`));
      }
    }

    const provider = new MyProvider().setArgs(() => ['world']);
    const root = new Container({ tags: ['root'] }).register('myProvider', provider, { aliases: ['greeting'] });

    expect(root.resolve('myProvider')).toBe('hello world');
    expect(root.resolve('greeting')).toBe('hello world');
  });

  it('should getInstances from all scopes by default = cascade is true', function () {
    class FileLogger {}

    const root = new Container({ tags: ['root'] });
    const child1 = root.createScope({ tags: ['child1'] });

    const logger1 = root.resolve(FileLogger);
    const logger2 = child1.resolve(FileLogger);

    expect(root.getInstances()).toEqual([logger1, logger2]);
  });

  it('should getInstances only from current scope if cascade is false', () => {
    class FileLogger {}

    const root = new Container({ tags: ['root'] });
    const child1 = root.createScope({ tags: ['child1'] });

    const logger1 = root.resolve(FileLogger);
    const logger2 = child1.resolve(FileLogger);

    expect(root.getInstances({ cascade: false })).toEqual([logger1]);
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
      constructor(@inject(by.classOne(Logger)) private logger: Logger) {}

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
    const app = root.resolveByClass(TestApp);
    app.run();
    app.stop();
    expect(app.display()).toEqual('StartStop');
  });

  it('Resolve with aliases', () => {
    const container = new Container();

    for (let i = 0; i < 20; i++) {
      container.addRegistration(
        Registration.fromFn(() => `value-${i}`)
          .assignToKey(`key-${i}`)
          .assignToAliases('valueAlias', `alias-${i}`),
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
