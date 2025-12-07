import 'reflect-metadata';
import { Container, inject, register, Registration as R, select as s, singleton } from '../../lib';

/**
 * User Management Domain - Lazy Loading
 *
 * Some services are expensive to initialize:
 * - EmailNotifier: Establishes SMTP connection
 * - ReportGenerator: Loads templates, initializes PDF engine
 * - ExternalApiClient: Authenticates with third-party service
 *
 * Lazy loading defers instantiation until first use.
 * This improves startup time and avoids initializing unused services.
 *
 * Use cases:
 * - Services used only in specific code paths (error notification)
 * - Optional features that may not be triggered
 * - Breaking circular dependencies
 */
describe('lazy provider', () => {
  // Tracks whether SMTP connection was established
  @register(singleton())
  class SmtpConnectionStatus {
    isConnected = false;

    connect() {
      this.isConnected = true;
    }
  }

  // EmailNotifier is expensive - establishes SMTP connection on construction
  class EmailNotifier {
    constructor(@inject('SmtpConnectionStatus') private smtp: SmtpConnectionStatus) {
      // Simulate expensive SMTP connection
      this.smtp.connect();
    }

    sendPasswordReset(email: string): string {
      return `Password reset sent to ${email}`;
    }
  }

  // AuthService might need to send password reset emails
  // But most login requests don't need email (only password reset does)
  class AuthService {
    constructor(@inject(s.token('EmailNotifier').lazy()) public emailNotifier: EmailNotifier) {}

    login(email: string, password: string): boolean {
      // Most requests just validate credentials - no email needed
      return email === 'admin@example.com' && password === 'secret';
    }

    requestPasswordReset(email: string): string {
      // Only here do we actually need the EmailNotifier
      return this.emailNotifier.sendPasswordReset(email);
    }
  }

  function createContainer() {
    const container = new Container();
    container.addRegistration(R.fromClass(SmtpConnectionStatus)).addRegistration(R.fromClass(EmailNotifier));
    return container;
  }

  it('should not connect to SMTP until email is actually needed', () => {
    const container = createContainer();

    // AuthService is created, but EmailNotifier is NOT instantiated yet
    container.resolve(AuthService);
    const smtp = container.resolve<SmtpConnectionStatus>('SmtpConnectionStatus');

    // SMTP connection was NOT established - lazy loading deferred it
    expect(smtp.isConnected).toBe(false);
  });

  it('should connect to SMTP only when sending email', () => {
    const container = createContainer();

    const authService = container.resolve(AuthService);
    const smtp = container.resolve<SmtpConnectionStatus>('SmtpConnectionStatus');

    // Trigger password reset - this actually uses EmailNotifier
    const result = authService.requestPasswordReset('user@example.com');

    // Now SMTP connection was established
    expect(result).toBe('Password reset sent to user@example.com');
    expect(smtp.isConnected).toBe(true);
  });

  it('should only create one instance even with multiple method calls', () => {
    const container = createContainer();

    const authService = container.resolve(AuthService);

    // Multiple password resets
    authService.requestPasswordReset('user1@example.com');
    authService.requestPasswordReset('user2@example.com');

    // Only one EmailNotifier instance was created
    const emailNotifiers = Array.from(container.getInstances()).filter((x) => x instanceof EmailNotifier);
    expect(emailNotifiers.length).toBe(1);
  });

  it('should trigger instantiation when accessing property on lazy object', () => {
    const container = createContainer();

    const authService = container.resolve(AuthService);
    const smtp = container.resolve<SmtpConnectionStatus>('SmtpConnectionStatus');

    // Just getting the proxy doesn't trigger instantiation
    const notifier = authService.emailNotifier;
    expect(notifier).toBeDefined();
    expect(smtp.isConnected).toBe(false); // Still lazy!

    // Accessing a property ON the lazy object triggers instantiation
    const method = notifier.sendPasswordReset;
    expect(method).toBeDefined();
    expect(smtp.isConnected).toBe(true); // Now instantiated!
  });
});
