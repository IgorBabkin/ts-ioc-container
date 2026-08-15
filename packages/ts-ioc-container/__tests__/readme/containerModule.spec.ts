import 'reflect-metadata';
import { bindTo, Container, type IContainer, type IContainerModule, register, Registration as R } from '../../lib';

/**
 * User Management Domain - Container Modules
 *
 * Modules organize related registrations and allow swapping implementations
 * based on environment (development, testing, production).
 *
 * Common module patterns:
 * - ProductionModule: Real database, external APIs, email service
 * - DevelopmentModule: In-memory database, mock APIs, console logging
 * - TestingModule: Mocks with assertion capabilities
 *
 * This enables:
 * - Easy environment switching
 * - Isolated testing without external dependencies
 * - Feature flags via module composition
 */

// Auth service interface - same API for all environments
interface IAuthService {
  authenticate(email: string, password: string): boolean;
  getServiceType(): string;
}

// Production: Real authentication with database lookup
@register(bindTo('IAuthService'))
class ProductionAuthService implements IAuthService {
  authenticate(email: string, password: string): boolean {
    // In production, this would query the database
    return email === 'admin@example.com' && password === 'secure_password';
  }

  getServiceType(): string {
    return 'production';
  }
}

// Development: Accepts any credentials for easy testing
@register(bindTo('IAuthService'))
class DevelopmentAuthService implements IAuthService {
  authenticate(_email: string, _password: string): boolean {
    // Always succeed in development for easier testing
    return true;
  }

  getServiceType(): string {
    return 'development';
  }
}

// Production module - real services with security
class ProductionModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(ProductionAuthService));
    // In a real app, also register:
    // - Real database connection
    // - External email service
    // - Payment gateway
  }
}

// Development module - mocks and conveniences
class DevelopmentModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(DevelopmentAuthService));
    // In a real app, also register:
    // - In-memory database
    // - Console email logger
    // - Mock payment gateway
  }
}

describe('Container Modules', function () {
  function createContainer(isProduction: boolean) {
    const module = isProduction ? new ProductionModule() : new DevelopmentModule();
    return new Container().useModule(module);
  }

  it('should use production auth with strict validation', function () {
    const container = createContainer(true);
    const auth = container.resolve<IAuthService>('IAuthService');

    expect(auth.getServiceType()).toBe('production');
    expect(auth.authenticate('admin@example.com', 'secure_password')).toBe(true);
    expect(auth.authenticate('admin@example.com', 'wrong_password')).toBe(false);
  });

  it('should use development auth with permissive validation', function () {
    const container = createContainer(false);
    const auth = container.resolve<IAuthService>('IAuthService');

    expect(auth.getServiceType()).toBe('development');
    // Development mode accepts any credentials
    expect(auth.authenticate('any@email.com', 'any_password')).toBe(true);
  });

  it('should allow composing multiple modules', function () {
    // Modules can be composed for feature flags or A/B testing
    class FeatureFlagModule implements IContainerModule {
      constructor(private enableNewFeature: boolean) {}

      applyTo(container: IContainer): void {
        if (this.enableNewFeature) {
          // Register new feature implementations
        }
      }
    }

    const container = new Container().useModule(new ProductionModule()).useModule(new FeatureFlagModule(true));

    // Base services from ProductionModule
    expect(container.resolve<IAuthService>('IAuthService').getServiceType()).toBe('production');
  });
});
