import 'reflect-metadata';
import { bindTo, Container, inject, lazy, Provider, register, Registration as R, singleton } from '../../lib';

/**
 * Lazy Loading with registerPipe
 *
 * The lazy() registerPipe can be used in two ways:
 * 1. With @register decorator - lazy()
 * 2. Directly on provider - provider.lazy()
 *
 * Both approaches defer instantiation until first access,
 * improving startup time and memory usage.
 */
describe('lazy registerPipe', () => {
  // Track initialization for testing
  const initLog: string[] = [];

  beforeEach(() => {
    initLog.length = 0;
  });

  /**
   * Example 1: Using lazy() with @register decorator
   *
   * The lazy() registerPipe defers service instantiation until first use.
   * Perfect for expensive services that may not always be needed.
   */
  describe('with @register decorator', () => {
    // Database connection pool - expensive to initialize
    @register(bindTo('DatabasePool'), singleton())
    class DatabasePool {
      constructor() {
        initLog.push('DatabasePool initialized');
      }

      query(sql: string): string[] {
        return [`Results for: ${sql}`];
      }
    }

    // Analytics service - expensive, but only used occasionally
    @register(bindTo('AnalyticsService'), lazy(), singleton())
    class AnalyticsService {
      constructor(@inject('DatabasePool') private db: DatabasePool) {
        initLog.push('AnalyticsService initialized');
      }

      trackEvent(event: string): void {
        this.db.query(`INSERT INTO events VALUES ('${event}')`);
      }

      generateReport(): string {
        return 'Analytics Report';
      }
    }

    // Application service - always used
    class AppService {
      constructor(@inject('AnalyticsService') public analytics: AnalyticsService) {
        initLog.push('AppService initialized');
      }

      handleRequest(path: string): void {
        // Most requests don't need analytics
        if (path.includes('/admin')) {
          // Only admin requests use analytics
          this.analytics.trackEvent(`Admin access: ${path}`);
        }
      }
    }

    it('should defer AnalyticsService initialization until first access', () => {
      const container = new Container()
        .addRegistration(R.fromClass(DatabasePool))
        .addRegistration(R.fromClass(AnalyticsService))
        .addRegistration(R.fromClass(AppService));

      // Resolve AppService
      const app = container.resolve<AppService>(AppService);

      // AppService is initialized, but AnalyticsService is NOT (it's lazy)
      // DatabasePool is also not initialized because AnalyticsService hasn't been accessed
      expect(initLog).toEqual(['AppService initialized']);

      // Handle non-admin request - analytics not used
      app.handleRequest('/api/users');
      expect(initLog).toEqual(['AppService initialized']);
    });

    it('should initialize lazy service when first accessed', () => {
      const container = new Container()
        .addRegistration(R.fromClass(DatabasePool))
        .addRegistration(R.fromClass(AnalyticsService))
        .addRegistration(R.fromClass(AppService));

      const app = container.resolve<AppService>(AppService);

      // Handle admin request - now analytics IS used
      app.handleRequest('/admin/dashboard');

      // AnalyticsService was initialized on first access (DatabasePool too, as a dependency)
      expect(initLog).toEqual(['AppService initialized', 'DatabasePool initialized', 'AnalyticsService initialized']);
    });

    it('should create only one instance even with multiple accesses', () => {
      const container = new Container()
        .addRegistration(R.fromClass(DatabasePool))
        .addRegistration(R.fromClass(AnalyticsService))
        .addRegistration(R.fromClass(AppService));

      const app = container.resolve<AppService>(AppService);

      // Access analytics multiple times
      app.handleRequest('/admin/dashboard');
      app.analytics.generateReport();
      app.analytics.trackEvent('test');

      // AnalyticsService initialized only once (singleton + lazy)
      const analyticsCount = initLog.filter((msg) => msg === 'AnalyticsService initialized').length;
      expect(analyticsCount).toBe(1);
    });
  });

  /**
   * Example 2: Using lazy() directly on provider
   *
   * For manual registration, call .lazy() on the provider pipe.
   * This gives fine-grained control over lazy loading per dependency.
   */
  describe('with pure provider', () => {
    // Email service - expensive SMTP connection
    class EmailService {
      constructor() {
        initLog.push('EmailService initialized - SMTP connected');
      }

      send(to: string, subject: string): string {
        return `Email sent to ${to}: ${subject}`;
      }
    }

    // SMS service - expensive gateway connection
    class SmsService {
      constructor() {
        initLog.push('SmsService initialized - Gateway connected');
      }

      send(to: string, message: string): string {
        return `SMS sent to ${to}: ${message}`;
      }
    }

    // Notification service - uses email and SMS, but maybe not both
    class NotificationService {
      constructor(
        @inject('EmailService') public email: EmailService,
        @inject('SmsService') public sms: SmsService,
      ) {
        initLog.push('NotificationService initialized');
      }

      notifyByEmail(user: string, message: string): string {
        return this.email.send(user, message);
      }

      notifyBySms(phone: string, message: string): string {
        return this.sms.send(phone, message);
      }
    }

    it('should allow selective lazy loading - email lazy, SMS eager', () => {
      const container = new Container()
        // EmailService is lazy - won't connect to SMTP until used
        .addRegistration(
          R.fromClass(EmailService)
            .bindToKey('EmailService')
            .pipe(singleton(), (p) => p.lazy()),
        )
        // SmsService is eager - connects to gateway immediately
        .addRegistration(R.fromClass(SmsService).bindToKey('SmsService').pipe(singleton()))
        .addRegistration(R.fromClass(NotificationService));

      // Resolve NotificationService
      const notifications = container.resolve<NotificationService>(NotificationService);

      // SmsService initialized immediately (eager)
      // EmailService NOT initialized yet (lazy)
      expect(initLog).toEqual(['SmsService initialized - Gateway connected', 'NotificationService initialized']);

      // Send SMS - already initialized
      notifications.notifyBySms('555-1234', 'Test');
      expect(initLog).toEqual(['SmsService initialized - Gateway connected', 'NotificationService initialized']);
    });

    it('should initialize lazy email service when first accessed', () => {
      const container = new Container()
        .addRegistration(
          R.fromClass(EmailService)
            .bindToKey('EmailService')
            .pipe(singleton(), (p) => p.lazy()),
        )
        .addRegistration(R.fromClass(SmsService).bindToKey('SmsService').pipe(singleton()))
        .addRegistration(R.fromClass(NotificationService));

      const notifications = container.resolve<NotificationService>(NotificationService);

      // Send email - NOW EmailService is initialized
      const result = notifications.notifyByEmail('user@example.com', 'Welcome!');

      expect(result).toBe('Email sent to user@example.com: Welcome!');
      expect(initLog).toContain('EmailService initialized - SMTP connected');
    });

    it('should work with multiple lazy providers', () => {
      const container = new Container()
        // Both services are lazy
        .addRegistration(
          R.fromClass(EmailService)
            .bindToKey('EmailService')
            .pipe(singleton(), (p) => p.lazy()),
        )
        .addRegistration(
          R.fromClass(SmsService)
            .bindToKey('SmsService')
            .pipe(singleton(), (p) => p.lazy()),
        )
        .addRegistration(R.fromClass(NotificationService));

      const notifications = container.resolve<NotificationService>(NotificationService);

      // Neither service initialized yet
      expect(initLog).toEqual(['NotificationService initialized']);

      // Use SMS - only SMS initialized
      notifications.notifyBySms('555-1234', 'Test');
      expect(initLog).toEqual(['NotificationService initialized', 'SmsService initialized - Gateway connected']);

      // Use Email - now Email initialized
      notifications.notifyByEmail('user@example.com', 'Test');
      expect(initLog).toEqual([
        'NotificationService initialized',
        'SmsService initialized - Gateway connected',
        'EmailService initialized - SMTP connected',
      ]);
    });
  });

  /**
   * Example 3: Pure Provider usage (without Registration)
   *
   * Use Provider.fromClass() directly with lazy() for maximum flexibility.
   */
  describe('with pure Provider', () => {
    class CacheService {
      constructor() {
        initLog.push('CacheService initialized - Redis connected');
      }

      get(key: string): string | null {
        return `cached:${key}`;
      }
    }

    class ApiService {
      constructor(@inject('CacheService') private cache: CacheService) {
        initLog.push('ApiService initialized');
      }

      fetchData(id: string): string {
        const cached = this.cache.get(id);
        return cached || `fresh:${id}`;
      }
    }

    it('should use Provider.fromClass with lazy() helper', () => {
      // Create pure provider with lazy loading
      const cacheProvider = Provider.fromClass(CacheService).pipe(lazy(), singleton());

      const container = new Container();
      container.register('CacheService', cacheProvider);
      container.addRegistration(R.fromClass(ApiService));

      const api = container.resolve<ApiService>(ApiService);

      // CacheService not initialized yet (lazy)
      expect(initLog).toEqual(['ApiService initialized']);

      // Access cache - NOW it's initialized
      api.fetchData('user:1');
      expect(initLog).toContain('CacheService initialized - Redis connected');
    });

    it('should allow importing lazy as named export', () => {
      // Demonstrate that lazy() is imported from the library
      const cacheProvider = Provider.fromClass(CacheService).pipe(lazy());

      const container = new Container();
      container.register('CacheService', cacheProvider);

      const cache = container.resolve<CacheService>('CacheService');

      // Not initialized until accessed
      expect(initLog).toEqual([]);
      cache.get('test');
      expect(initLog).toEqual(['CacheService initialized - Redis connected']);
    });
  });

  /**
   * Example 4: Combining lazy with other pipes
   *
   * lazy() works seamlessly with other provider transformations.
   */
  describe('combining with other pipes', () => {
    class ConfigService {
      constructor(
        public apiUrl: string,
        public timeout: number,
      ) {
        initLog.push(`ConfigService initialized with ${apiUrl}`);
      }
    }

    it('should combine lazy with args and singleton', () => {
      const container = new Container().addRegistration(
        R.fromClass(ConfigService)
          .bindToKey('Config')
          .pipe(
            (p) => p.setArgs(() => ['https://api.example.com', 5000]),
            (p) => p.lazy(),
          )
          .pipe(singleton()),
      );

      // Config not initialized yet
      expect(initLog).toEqual([]);

      // Resolve - still not initialized (lazy)
      const config1 = container.resolve<ConfigService>('Config');
      expect(initLog).toEqual([]);

      // Access property - NOW initialized
      const url = config1.apiUrl;
      expect(url).toBe('https://api.example.com');
      expect(initLog).toEqual(['ConfigService initialized with https://api.example.com']);

      // Resolve again - same instance (singleton)
      const config2 = container.resolve<ConfigService>('Config');
      expect(config2).toBe(config1);
      expect(initLog.length).toBe(1); // Still only one initialization
    });
  });

  /**
   * Example 5: Real-world use case - Resource Management
   *
   * Lazy loading is ideal for:
   * - Database connections
   * - File handles
   * - External API clients
   * - Report generators
   */
  describe('real-world example - feature flags', () => {
    class FeatureFlagService {
      constructor() {
        initLog.push('FeatureFlagService initialized');
      }

      isEnabled(feature: string): boolean {
        return feature === 'premium';
      }
    }

    @register(bindTo('PremiumFeature'), lazy(), singleton())
    class PremiumFeature {
      constructor() {
        initLog.push('PremiumFeature initialized - expensive operation');
      }

      execute(): string {
        return 'Premium feature executed';
      }
    }

    class Application {
      constructor(
        @inject('FeatureFlagService') private flags: FeatureFlagService,
        @inject('PremiumFeature') private premium: PremiumFeature,
      ) {
        initLog.push('Application initialized');
      }

      handleRequest(feature: string): string {
        if (this.flags.isEnabled(feature)) {
          return this.premium.execute();
        }
        return 'Standard feature';
      }
    }

    it('should not initialize premium features for standard users', () => {
      const container = new Container()
        .addRegistration(R.fromClass(FeatureFlagService).bindToKey('FeatureFlagService').pipe(singleton()))
        .addRegistration(R.fromClass(PremiumFeature))
        .addRegistration(R.fromClass(Application));

      const app = container.resolve<Application>(Application);

      // Standard request - premium feature not initialized
      const result = app.handleRequest('standard');
      expect(result).toBe('Standard feature');
      expect(initLog).not.toContain('PremiumFeature initialized - expensive operation');
    });

    it('should initialize premium features only for premium users', () => {
      const container = new Container()
        .addRegistration(R.fromClass(FeatureFlagService).bindToKey('FeatureFlagService').pipe(singleton()))
        .addRegistration(R.fromClass(PremiumFeature))
        .addRegistration(R.fromClass(Application));

      const app = container.resolve<Application>(Application);

      // Premium request - NOW premium feature is initialized
      const result = app.handleRequest('premium');
      expect(result).toBe('Premium feature executed');
      expect(initLog).toContain('PremiumFeature initialized - expensive operation');
    });
  });
});
