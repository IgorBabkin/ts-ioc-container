import 'reflect-metadata';
import {
  alias,
  byAlias,
  byAliases,
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
import { constant } from '../../lib/utils';

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
      constructor(@inject(byAliases((it) => it.has(IMiddlewareKey))) public middleware: IMiddleware[]) {}

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
      .add(R.toClass(LoggerMiddleware))
      .add(R.toClass(ErrorHandlerMiddleware));

    const app = container.resolve(App);
    app.run();

    expect(app.isMiddlewareApplied('LoggerMiddleware')).toBe(true);
    expect(app.isMiddlewareApplied('ErrorHandlerMiddleware')).toBe(true);
  });

  it('should resolve by some alias', () => {
    @provider(alias('ILogger'))
    class FileLogger {}

    const container = new Container(new MetadataInjector()).add(R.toClass(FileLogger));

    expect(byAlias((aliases) => aliases.has('ILogger'))(container)).toBeInstanceOf(FileLogger);
    expect(() => byAlias((aliases) => aliases.has('logger'))(container)).toThrowError(DependencyNotFoundError);
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
      .add(R.toClass(FileLogger))
      .add(R.toClass(DbLogger));

    const result1 = byAlias((aliases) => aliases.has('ILogger'), { memoize: constant('ILogger') })(container);
    const child = container.createScope({ tags: ['child'] });
    const result2 = byAlias((aliases) => aliases.has('ILogger'), { memoize: constant('ILogger') })(child);
    const result3 = byAlias((aliases) => aliases.has('ILogger'))(child);

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
        @inject(byAliases((it) => it.has('ILogger'), { memoize: constant('ILogger') })) public loggers: ILogger[],
      ) {}
    }

    const container = new Container(new MetadataInjector())
      .register(IMemoKey, Provider.fromValue<IMemo>(new Map()))
      .add(R.toClass(FileLogger));

    const loggers = container.resolve(App).loggers;
    container.add(R.toClass(DbLogger));
    const loggers2 = container.resolve(App).loggers;

    expect(loggers).toEqual(loggers2);
  });
});
