import 'reflect-metadata';
import { alias, by, Container, DependencyNotFoundError, inject, register, Registration as R, scope } from '../../lib';

describe('alias', () => {
  const IMiddlewareKey = 'IMiddleware';
  const middleware = register(alias(IMiddlewareKey));

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
      constructor(@inject(by.many(IMiddlewareKey)) public middleware: IMiddleware[]) {}

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

    const container = new Container().add(R.fromClass(LoggerMiddleware)).add(R.fromClass(ErrorHandlerMiddleware));

    const app = container.resolve(App);
    app.run();

    expect(app.isMiddlewareApplied('LoggerMiddleware')).toBe(true);
    expect(app.isMiddlewareApplied('ErrorHandlerMiddleware')).toBe(true);
  });

  it('should resolve by some alias', () => {
    @register(alias('ILogger'))
    class FileLogger {}

    const container = new Container().add(R.fromClass(FileLogger));

    expect(by.one('ILogger').resolve(container)).toBeInstanceOf(FileLogger);
    expect(() => by.one('logger').resolve(container)).toThrowError(DependencyNotFoundError);
  });

  it('should resolve by alias', () => {
    @register(alias('ILogger'), scope((s) => s.hasTag('root')))
    class FileLogger {}

    @register(alias('ILogger'), scope((s) => s.hasTag('child')))
    class DbLogger {}

    const container = new Container({ tags: ['root'] }).add(R.fromClass(FileLogger)).add(R.fromClass(DbLogger));

    const result1 = by.one('ILogger').resolve(container);
    const child = container.createScope({ tags: ['child'] });
    const result2 = by.one('ILogger').resolve(child);

    expect(result1).toBeInstanceOf(FileLogger);
    expect(result2).toBeInstanceOf(DbLogger);
  });

  it('should resolve by aliases', () => {
    interface ILogger {}

    @register(alias('ILogger'))
    class FileLogger implements ILogger {}

    @register(alias('ILogger'))
    class DbLogger implements ILogger {}

    class App {
      constructor(@inject(by.aliasOne('ILogger')) public loggers: ILogger[]) {}
    }

    const container = new Container().add(R.fromClass(FileLogger));

    const loggers = container.resolve(App).loggers;
    container.add(R.fromClass(DbLogger));
    const loggers2 = container.resolve(App).loggers;

    expect(loggers).toEqual(loggers2);
  });
});
