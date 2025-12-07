import 'reflect-metadata';
import { Container, type IContainer, inject, Registration as R, select } from '../../lib';

/**
 * User Management Domain - Basic Dependency Injection
 *
 * This example demonstrates how to wire up a simple authentication service
 * that depends on a user repository. This pattern is common in web applications
 * where services need database access.
 */
describe('Basic usage', function () {
  // Domain types
  interface User {
    id: string;
    email: string;
    passwordHash: string;
  }

  // Repository interface - abstracts database access
  interface IUserRepository {
    findByEmail(email: string): User | undefined;
  }

  // Concrete implementation
  class UserRepository implements IUserRepository {
    private users: User[] = [{ id: '1', email: 'admin@example.com', passwordHash: 'hashed_password' }];

    findByEmail(email: string): User | undefined {
      return this.users.find((u) => u.email === email);
    }
  }

  it('should inject dependencies', function () {
    // AuthService depends on IUserRepository
    class AuthService {
      constructor(@inject('IUserRepository') private userRepo: IUserRepository) {}

      authenticate(email: string): boolean {
        const user = this.userRepo.findByEmail(email);
        return user !== undefined;
      }
    }

    // Wire up the container
    const container = new Container().addRegistration(R.fromClass(UserRepository).bindTo('IUserRepository'));

    // Resolve AuthService - UserRepository is automatically injected
    const authService = container.resolve(AuthService);

    expect(authService.authenticate('admin@example.com')).toBe(true);
    expect(authService.authenticate('unknown@example.com')).toBe(false);
  });

  it('should inject current scope for request context', function () {
    // In Express.js, each request gets its own scope
    // Services can access the current scope to resolve request-specific dependencies
    const appContainer = new Container({ tags: ['application'] });

    class RequestHandler {
      constructor(@inject(select.scope.current) public requestScope: IContainer) {}

      handleRequest(): string {
        // Access request-scoped dependencies
        return this.requestScope.hasTag('application') ? 'app-scope' : 'request-scope';
      }
    }

    const handler = appContainer.resolve(RequestHandler);

    expect(handler.requestScope).toBe(appContainer);
    expect(handler.handleRequest()).toBe('app-scope');
  });
});
