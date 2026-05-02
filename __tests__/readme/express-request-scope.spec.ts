import 'reflect-metadata';
import { bindTo, Container, register, Registration as R, singleton } from '../../lib';

/**
 * Web Framework Integration - Per-Request Scope
 *
 * In Express/Next.js applications, each HTTP request typically gets its own
 * scope. This ensures request-specific state (logger context, current user,
 * correlation IDs) is isolated between concurrent requests.
 *
 * Scope hierarchy:
 *   Application (singleton services — live for entire app lifetime)
 *     └── Request (per-request services — created and disposed per request)
 */

@register(bindTo('ILogger'), singleton())
class Logger {
  readonly messages: string[] = [];

  log(message: string) {
    this.messages.push(message);
  }
}

describe('Express/Next per-request scope', () => {
  it('should give each request its own Logger instance', () => {
    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));

    // Simulate two concurrent HTTP requests
    const request1Scope = app.createScope({ tags: ['request'] });
    const request2Scope = app.createScope({ tags: ['request'] });

    const logger1 = request1Scope.resolve<Logger>('ILogger');
    const logger2 = request2Scope.resolve<Logger>('ILogger');

    logger1.log('req 1 started');
    logger2.log('req 2 started');

    // Each request has its own Logger — logs don't leak between requests
    expect(logger1.messages).toEqual(['req 1 started']);
    expect(logger2.messages).toEqual(['req 2 started']);
    expect(logger1).not.toBe(logger2);
  });

  it('should resolve the same Logger within a single request', () => {
    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));

    const requestScope = app.createScope({ tags: ['request'] });

    const logger1 = requestScope.resolve<Logger>('ILogger');
    const logger2 = requestScope.resolve<Logger>('ILogger');

    // Within one request, singleton is maintained
    expect(logger1).toBe(logger2);
  });
});
