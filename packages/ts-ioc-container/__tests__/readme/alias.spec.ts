import 'reflect-metadata';
import {
  alias,
  by,
  Container,
  DependencyNotFoundError,
  IMemo,
  IMemoKey,
  inject,
  MetadataInjector,
  Provider,
  provider,
  register,
  Registration as R,
  scope,
} from '../../lib';
import { constant } from '../../lib/utils.ts';

describe('alias', () => {
  const IMiddlewareKey = 'IMiddleware';
  const middleware = provider(alias(IMiddlewareKey));

  interface IMiddleware {
    applyTo(application: IApplication): void;
  }

  interface IApplication {
    use(module: IMiddleware): void;
    markMiddlewareAsApplied(name: string): void;
  }

  @middleware
  class LoggerMiddleware implements IMiddleware {
    applyTo(application: IApplication): void {
      application.markMiddlewareAsApplied('LoggerMiddleware');
    }
  }

  @middleware
  class ErrorHandlerMiddleware implements IMiddleware {
    applyTo(application: IApplication): void {
      application.markMiddlewareAsApplied('ErrorHandlerMiddleware');
    }
  }

  it('should resolve by some alias', () => {
    class App implements IApplication {
      private appliedMiddleware: Set<string> = new Set();
      constructor(@inject(by.aliases((it) => it.has(IMiddlewareKey))) public middleware: IMiddleware[]) {}

      markMiddlewareAsApplied(name: string): void {
        this.appliedMiddleware.add(name);
      }

      isMiddlewareApplied(name: string): boolean {
        return this.appliedMiddleware.has(name);
      }

      use(module: IMiddleware): void {
        module.applyTo(this);
      }

      run() {
        for (const module of this.middleware) {
          module.applyTo(this);
        }
      }
    }

    const container = new Container(new MetadataInjector())
      .add(R.fromClass(LoggerMiddleware))
      .add(R.fromClass(ErrorHandlerMiddleware));

    const app = container.resolve(App);
    app.run();

    expect(app.isMiddlewareApplied('LoggerMiddleware')).toBe(true);
    expect(app.isMiddlewareApplied('ErrorHandlerMiddleware')).toBe(true);
  });

  it('should resolve by some alias', () => {
    @provider(alias('ILogger'))
    class FileLogger {}

    const container = new Container(new MetadataInjector()).add(R.fromClass(FileLogger));

    expect(by.alias((aliases) => aliases.has('ILogger'))(container)).toBeInstanceOf(FileLogger);
    expect(() => by.alias((aliases) => aliases.has('logger'))(container)).toThrowError(DependencyNotFoundError);
  });

  it('should resolve by memoized alias', () => {
    @provider(alias('ILogger'))
    @register(scope((s) => s.hasTag('root')))
    class FileLogger {}

    @provider(alias('ILogger'))
    @register(scope((s) => s.hasTag('child')))
    class DbLogger {}

    const container = new Container(new MetadataInjector(), { tags: ['root'] })
      .register(IMemoKey, Provider.fromValue<IMemo>(new Map()))
      .add(R.fromClass(FileLogger))
      .add(R.fromClass(DbLogger));

    const result1 = by.alias((aliases) => aliases.has('ILogger'), { memoize: constant('ILogger') })(container);
    const child = container.createScope('child');
    const result2 = by.alias((aliases) => aliases.has('ILogger'), { memoize: constant('ILogger') })(child);
    const result3 = by.alias((aliases) => aliases.has('ILogger'))(child);

    expect(result1).toBeInstanceOf(FileLogger);
    expect(result2).toBeInstanceOf(FileLogger);
    expect(result3).toBeInstanceOf(DbLogger);
  });

  it('should resolve by memoized aliases', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface ILogger {}

    @provider(alias('ILogger'))
    class FileLogger implements ILogger {}

    @provider(alias('ILogger'))
    class DbLogger implements ILogger {}

    class App {
      constructor(
        @inject(by.aliases((it) => it.has('ILogger'), { memoize: constant('ILogger') })) public loggers: ILogger[],
      ) {}
    }

    const container = new Container(new MetadataInjector())
      .register(IMemoKey, Provider.fromValue<IMemo>(new Map()))
      .add(R.fromClass(FileLogger));

    const loggers = container.resolve(App).loggers;
    container.add(R.fromClass(DbLogger));
    const loggers2 = container.resolve(App).loggers;

    expect(loggers).toEqual(loggers2);
  });
});
