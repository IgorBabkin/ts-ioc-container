import 'reflect-metadata';
import { bindTo, Container, register, Registration as R, singleton } from '../../lib';

/**
 * User Management Domain - Singleton Pattern
 *
 * Singletons are services that should only have one instance per scope.
 * Common examples:
 * - PasswordHasher: Expensive to initialize (loads crypto config)
 * - DatabasePool: Connection pool shared across requests
 * - ConfigService: Application configuration loaded once
 *
 * Note: "singleton" in ts-ioc-container means "one instance per scope",
 * not "one instance globally". Each scope gets its own singleton instance.
 */

// PasswordHasher is expensive to create - should be singleton
@register(bindTo('IPasswordHasher'), singleton())
class PasswordHasher {
  private readonly salt: string;

  constructor() {
    // Simulate expensive initialization (loading crypto config, etc.)
    this.salt = 'random_salt_' + Math.random().toString(36);
  }

  hash(password: string): string {
    return `hashed_${password}_${this.salt}`;
  }

  verify(password: string, hash: string): boolean {
    return this.hash(password) === hash;
  }
}

describe('Singleton', function () {
  function createAppContainer() {
    return new Container({ tags: ['application'] });
  }

  it('should resolve the same PasswordHasher for every request in same scope', function () {
    const appContainer = createAppContainer().addRegistration(R.fromClass(PasswordHasher));

    // Multiple resolves return the same instance
    const hasher1 = appContainer.resolve<PasswordHasher>('IPasswordHasher');
    const hasher2 = appContainer.resolve<PasswordHasher>('IPasswordHasher');

    expect(hasher1).toBe(hasher2);
    expect(hasher1.hash('password')).toBe(hasher2.hash('password'));
  });

  it('should create different singleton per request scope', function () {
    // Application-level singleton
    const appContainer = createAppContainer().addRegistration(R.fromClass(PasswordHasher));

    // Each request scope gets its own singleton instance
    // This is useful when you want per-request caching
    const request1 = appContainer.createScope({ tags: ['request'] });
    const request2 = appContainer.createScope({ tags: ['request'] });

    const appHasher = appContainer.resolve<PasswordHasher>('IPasswordHasher');
    const request1Hasher = request1.resolve<PasswordHasher>('IPasswordHasher');
    const request2Hasher = request2.resolve<PasswordHasher>('IPasswordHasher');

    // Each scope has its own instance
    expect(appHasher).not.toBe(request1Hasher);
    expect(request1Hasher).not.toBe(request2Hasher);
  });

  it('should maintain singleton within a scope', function () {
    const appContainer = createAppContainer().addRegistration(R.fromClass(PasswordHasher));
    const requestScope = appContainer.createScope({ tags: ['request'] });

    // Within the same scope, singleton is maintained
    const hasher1 = requestScope.resolve<PasswordHasher>('IPasswordHasher');
    const hasher2 = requestScope.resolve<PasswordHasher>('IPasswordHasher');

    expect(hasher1).toBe(hasher2);
  });
});
