import 'reflect-metadata';
import {
  bindTo,
  Container,
  DependencyNotFoundError,
  type IContainer,
  inject,
  register,
  Registration as R,
  scope,
  select,
  singleton,
} from '../../lib';

/**
 * User Management Domain - Request Scopes
 *
 * In web applications, each HTTP request typically gets its own scope.
 * This allows request-specific data (current user, request ID, etc.)
 * to be isolated between concurrent requests.
 *
 * Scope hierarchy:
 *   Application (singleton services)
 *     └── Request (per-request services)
 *           └── Transaction (database transaction boundary)
 */

// SessionService is only available in request scope - not at application level
@register(bindTo('ISessionService'), scope((s) => s.hasTag('request')), singleton())
class SessionService {
  private userId: string | null = null;

  setCurrentUser(userId: string) {
    this.userId = userId;
  }

  getCurrentUserId(): string | null {
    return this.userId;
  }
}

describe('Scopes', function () {
  it('should isolate request-scoped services', function () {
    // Application container - lives for entire app lifetime
    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(SessionService));

    // Simulate two concurrent HTTP requests
    const request1Scope = appContainer.createScope({ tags: ['request'] });
    const request2Scope = appContainer.createScope({ tags: ['request'] });

    // Each request has its own SessionService instance
    const session1 = request1Scope.resolve<SessionService>('ISessionService');
    const session2 = request2Scope.resolve<SessionService>('ISessionService');

    session1.setCurrentUser('user-1');
    session2.setCurrentUser('user-2');

    // Sessions are isolated - user data doesn't leak between requests
    expect(session1.getCurrentUserId()).toBe('user-1');
    expect(session2.getCurrentUserId()).toBe('user-2');
    expect(session1).not.toBe(session2);

    // SessionService is NOT available at application level (security!)
    expect(() => appContainer.resolve('ISessionService')).toThrow(DependencyNotFoundError);
  });

  it('should create child scopes for transactions', function () {
    const appContainer = new Container({ tags: ['application'] });

    // RequestHandler can create a transaction scope for database operations
    class RequestHandler {
      constructor(@inject(select.scope.create({ tags: ['transaction'] })) public transactionScope: IContainer) {}

      executeInTransaction(): boolean {
        // Transaction scope inherits from request scope
        // Database operations can be rolled back together
        return this.transactionScope.hasTag('transaction');
      }
    }

    const handler = appContainer.resolve(RequestHandler);

    expect(handler.transactionScope).not.toBe(appContainer);
    expect(handler.transactionScope.hasTag('transaction')).toBe(true);
    expect(handler.executeInTransaction()).toBe(true);
  });
});
