import { asAlias, by, Container, DependencyNotFoundError, inject, register, Registration as R, scope } from '../../lib';

describe('alias', () => {
  const IMiddlewareKey = 'IMiddleware';
  const middleware = register(asAlias(IMiddlewareKey));

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

    const container = new Container()
      .addRegistration(R.fromClass(LoggerMiddleware))
      .addRegistration(R.fromClass(ErrorHandlerMiddleware));

    const app = container.resolveOne(App);
    app.run();

    expect(app.isMiddlewareApplied('LoggerMiddleware')).toBe(true);
    expect(app.isMiddlewareApplied('ErrorHandlerMiddleware')).toBe(true);
  });

  it('should resolve by some alias', () => {
    @register(asAlias('ILogger'))
    class FileLogger {}

    const container = new Container().addRegistration(R.fromClass(FileLogger));

    expect(container.resolveOne('ILogger')).toBeInstanceOf(FileLogger);
    expect(() => container.resolveOne('logger')).toThrowError(DependencyNotFoundError);
  });

  it('should resolve by alias', () => {
    @register(asAlias('ILogger'), scope((s) => s.hasTag('root')))
    class FileLogger {}

    @register(asAlias('ILogger'), scope((s) => s.hasTag('child')))
    class DbLogger {}

    const container = new Container({ tags: ['root'] })
      .addRegistration(R.fromClass(FileLogger))
      .addRegistration(R.fromClass(DbLogger));

    const result1 = container.resolveOne('ILogger');
    const child = container.createScope({ tags: ['child'] });
    const result2 = child.resolveOne('ILogger');

    expect(result1).toBeInstanceOf(FileLogger);
    expect(result2).toBeInstanceOf(DbLogger);
  });

  it('should resolve by aliases', () => {
    interface ILogger {}

    @register(asAlias('ILogger'))
    class FileLogger implements ILogger {}

    @register(asAlias('ILogger'))
    class DbLogger implements ILogger {}

    class App {
      constructor(@inject(by.aliasOne('ILogger')) public loggers: ILogger[]) {}
    }

    const container = new Container().addRegistration(R.fromClass(FileLogger));

    const loggers = container.resolveOne(App).loggers;
    container.addRegistration(R.fromClass(DbLogger));
    const loggers2 = container.resolveOne(App).loggers;

    expect(loggers).toEqual(loggers2);
  });
});
