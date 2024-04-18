import 'reflect-metadata';
import {
  by,
  Container,
  inject,
  MetadataInjector,
  Registration as R,
  register,
  alias,
  DependencyNotFoundError,
} from '../../lib';

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
    @register(alias('ILogger'))
    class FileLogger {}

    const container = new Container(new MetadataInjector()).add(R.fromClass(FileLogger));

    expect(by.alias((aliases) => aliases.has('ILogger'))(container)).toBeInstanceOf(FileLogger);
    expect(() => by.alias((aliases) => aliases.has('logger'))(container)).toThrowError(DependencyNotFoundError);
  });
});
