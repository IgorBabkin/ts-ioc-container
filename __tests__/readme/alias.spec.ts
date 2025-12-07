import 'reflect-metadata';
import {
  bindTo,
  Container,
  DependencyNotFoundError,
  inject,
  register,
  Registration as R,
  scope,
  select as s,
} from '../../lib';

/**
 * User Management Domain - Alias Pattern (Multiple Implementations)
 *
 * Aliases allow multiple services to be registered under the same key.
 * This is useful for:
 * - Plugin systems (multiple notification channels)
 * - Strategy pattern (multiple authentication providers)
 * - Event handlers (multiple listeners for same event)
 *
 * Example: NotificationService with Email, SMS, and Push implementations
 */
describe('alias', () => {
  // All notification services share this alias
  const INotificationChannel = 'INotificationChannel';
  const notificationChannel = register(bindTo(s.alias(INotificationChannel)));

  interface INotificationChannel {
    send(userId: string, message: string): void;
    getDeliveredMessages(): string[];
  }

  // Email notification - always available
  @notificationChannel
  class EmailNotifier implements INotificationChannel {
    private delivered: string[] = [];

    send(userId: string, message: string): void {
      this.delivered.push(`EMAIL to ${userId}: ${message}`);
    }

    getDeliveredMessages(): string[] {
      return this.delivered;
    }
  }

  // SMS notification - for urgent messages
  @notificationChannel
  class SmsNotifier implements INotificationChannel {
    private delivered: string[] = [];

    send(userId: string, message: string): void {
      this.delivered.push(`SMS to ${userId}: ${message}`);
    }

    getDeliveredMessages(): string[] {
      return this.delivered;
    }
  }

  it('should notify through all channels', () => {
    // NotificationManager broadcasts to ALL registered channels
    class NotificationManager {
      constructor(@inject(s.alias(INotificationChannel)) private channels: INotificationChannel[]) {}

      notifyUser(userId: string, message: string): void {
        for (const channel of this.channels) {
          channel.send(userId, message);
        }
      }

      getChannelCount(): number {
        return this.channels.length;
      }
    }

    const container = new Container()
      .addRegistration(R.fromClass(EmailNotifier))
      .addRegistration(R.fromClass(SmsNotifier));

    const manager = container.resolve(NotificationManager);
    manager.notifyUser('user-123', 'Your password was reset');

    // Both channels received the message
    expect(manager.getChannelCount()).toBe(2);
  });

  it('should resolve single implementation by alias', () => {
    // Sometimes you only need one implementation (e.g., primary email service)
    @register(bindTo(s.alias('IPrimaryNotifier')))
    class PrimaryEmailNotifier {
      readonly type = 'email';
    }

    const container = new Container().addRegistration(R.fromClass(PrimaryEmailNotifier));

    // resolveOneByAlias returns first matching implementation
    const notifier = container.resolveOneByAlias<PrimaryEmailNotifier>('IPrimaryNotifier');
    expect(notifier.type).toBe('email');

    // Direct key resolution fails - only alias is registered
    expect(() => container.resolve('IPrimaryNotifier')).toThrowError(DependencyNotFoundError);
  });

  it('should use different implementations per scope', () => {
    // Development: Console logger for easy debugging
    @register(bindTo(s.alias('ILogger')), scope((s) => s.hasTag('development')))
    class ConsoleLogger {
      readonly type = 'console';
    }

    // Production: Database logger for audit trail
    @register(bindTo(s.alias('ILogger')), scope((s) => s.hasTag('production')))
    class DatabaseLogger {
      readonly type = 'database';
    }

    // Development environment
    const devContainer = new Container({ tags: ['development'] })
      .addRegistration(R.fromClass(ConsoleLogger))
      .addRegistration(R.fromClass(DatabaseLogger));

    // Production environment
    const prodContainer = new Container({ tags: ['production'] })
      .addRegistration(R.fromClass(ConsoleLogger))
      .addRegistration(R.fromClass(DatabaseLogger));

    const devLogger = devContainer.resolveOneByAlias<ConsoleLogger | DatabaseLogger>('ILogger');
    const prodLogger = prodContainer.resolveOneByAlias<ConsoleLogger | DatabaseLogger>('ILogger');

    expect(devLogger.type).toBe('console');
    expect(prodLogger.type).toBe('database');
  });
});
