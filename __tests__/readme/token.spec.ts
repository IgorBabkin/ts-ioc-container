import { SingleToken, Container, inject, Registration as R } from '../../lib';

/**
 * User Management Domain - Type-Safe Tokens
 *
 * Tokens provide type-safe dependency resolution without magic strings.
 * Benefits:
 * - Compile-time type checking for resolved dependencies
 * - IDE autocomplete and refactoring support
 * - Self-documenting dependency keys
 * - Prevents typos in dependency keys
 *
 * SingleToken<T> resolves a single dependency of type T.
 * Use it when you want type safety at the injection point.
 */

interface ILogger {
  log(message: string): void;
}

// Type-safe token - ensures resolved value is ILogger
const ILoggerToken = new SingleToken<ILogger>('ILogger');

class Logger implements ILogger {
  log(message: string) {
    console.log(message);
  }
}

class App {
  // Token provides type safety - logger is guaranteed to be ILogger
  constructor(@inject(ILoggerToken) public logger: ILogger) {}
}

describe('SingleToken', function () {
  it('should resolve dependency with type safety using SingleToken', function () {
    const container = new Container({ tags: ['application'] }).addRegistration(
      R.fromClass(Logger).bindToKey('ILogger'),
    );

    const app = container.resolve(App);

    // Type-safe access to logger methods
    app.logger.log('Application started');
    expect(app.logger).toBeInstanceOf(Logger);
    expect(app.logger).toBeDefined();
  });
});
