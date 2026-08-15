import 'reflect-metadata';
import {
  bindTo,
  Container,
  DependencyNotFoundError,
  register,
  Registration as R,
  scope,
  scopeAccess,
  singleton,
} from '../../lib';

/**
 * User Management Domain - Visibility Control
 *
 * Some services should only be accessible in specific scopes:
 * - AdminService: Only accessible in admin routes
 * - AuditLogger: Only accessible at application level (not per-request)
 * - DebugService: Only accessible in development environment
 *
 * scopeAccess() controls VISIBILITY - whether a registered service
 * can be resolved from a particular scope.
 *
 * This provides security-by-design:
 * - Prevents accidental access to sensitive services
 * - Enforces architectural boundaries
 * - Catches misuse at resolution time (not runtime)
 */
describe('Visibility', function () {
  it('should restrict admin services to admin routes only', () => {
    // UserManagementService can delete users - admin only!
    @register(
      bindTo('IUserManagement'),
      scope((s) => s.hasTag('application')), // Registered at app level
      singleton(),
      // Only accessible from admin scope, not regular request scope
      scopeAccess(({ invocationScope }) => invocationScope.hasTag('admin')),
    )
    class UserManagementService {
      deleteUser(userId: string): string {
        return `Deleted user ${userId}`;
      }
    }

    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(UserManagementService));

    // Admin route scope
    const adminScope = appContainer.createScope({ tags: ['request', 'admin'] });

    // Regular user route scope
    const userScope = appContainer.createScope({ tags: ['request', 'user'] });

    // Admin can access UserManagementService
    const adminService = adminScope.resolve<UserManagementService>('IUserManagement');
    expect(adminService.deleteUser('user-123')).toBe('Deleted user user-123');

    // Regular users cannot access it - security enforced at DI level
    expect(() => userScope.resolve('IUserManagement')).toThrowError(DependencyNotFoundError);
  });

  it('should restrict application-level services from request scope', () => {
    // AuditLogger should only be used at application initialization
    // Not from request handlers (to prevent log corruption from concurrent access)
    @register(
      bindTo('IAuditLogger'),
      scope((s) => s.hasTag('application')),
      singleton(),
      // Only accessible from the scope where it was registered
      scopeAccess(({ invocationScope, providerScope }) => invocationScope === providerScope),
    )
    class AuditLogger {
      log(message: string): string {
        return `AUDIT: ${message}`;
      }
    }

    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(AuditLogger));

    const requestScope = appContainer.createScope({ tags: ['request'] });

    // Application can use AuditLogger (for startup logging)
    expect(appContainer.resolve<AuditLogger>('IAuditLogger').log('App started')).toBe('AUDIT: App started');

    // Request handlers cannot access it directly
    expect(() => requestScope.resolve('IAuditLogger')).toThrowError(DependencyNotFoundError);
  });
});
