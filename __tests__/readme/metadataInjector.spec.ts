import { Container, inject, Registration as R } from '../../lib';

/**
 * User Management Domain - Metadata Injection
 *
 * The MetadataInjector (default) uses TypeScript decorators and reflect-metadata
 * to automatically inject dependencies into constructor parameters.
 *
 * How it works:
 * 1. @inject('key') decorator marks a parameter for injection
 * 2. Container reads metadata at resolution time
 * 3. Dependencies are resolved and passed to constructor
 *
 * This is the most common pattern in Angular, NestJS, and similar frameworks.
 * Requires: "experimentalDecorators" and "emitDecoratorMetadata" in tsconfig.
 */

class Logger {
  name = 'Logger';
}

class App {
  // @inject tells the container which dependency to resolve for this parameter
  constructor(@inject('ILogger') private logger: Logger) {}

  // Alternative: inject via function for dynamic resolution
  // constructor(@inject((container, ...args) => container.resolve('ILogger', ...args)) private logger: ILogger) {}

  getLoggerName(): string {
    return this.logger.name;
  }
}

describe('Metadata Injector', function () {
  it('should inject dependencies using @inject decorator', function () {
    const container = new Container({ tags: ['application'] }).addRegistration(
      R.fromClass(Logger).bindToKey('ILogger'),
    );

    // Container reads @inject metadata and resolves 'ILogger' for the logger parameter
    const app = container.resolve(App);

    expect(app.getLoggerName()).toBe('Logger');
  });
});
