import { bindTo, Container, register, Registration as R, scope } from '../../lib';

describe('addTags', () => {
  it('should dynamically add tags to enable environment-based registration', () => {
    @register(bindTo('logger'), scope((s) => s.hasTag('development')))
    class ConsoleLogger {
      log(message: string) {
        console.log(`[DEV] ${message}`);
      }
    }

    @register(bindTo('logger'), scope((s) => s.hasTag('production')))
    class FileLogger {
      log(message: string) {
        console.log(`[PROD] ${message}`);
      }
    }

    // Create container and configure for environment
    const container = new Container();
    const environment = 'development';
    container.addTags(environment); // Add tag dynamically based on environment

    // Register services after tag is set
    container.addRegistration(R.fromClass(ConsoleLogger)).addRegistration(R.fromClass(FileLogger));

    // Resolve logger - gets ConsoleLogger because 'development' tag was added
    const logger = container.resolve<ConsoleLogger>('logger');
    expect(logger).toBeInstanceOf(ConsoleLogger);
  });

  it('should add multiple tags for feature-based configuration', () => {
    @register(bindTo('premiumFeature'), scope((s) => s.hasTag('premium')))
    class PremiumFeature {}

    @register(bindTo('betaFeature'), scope((s) => s.hasTag('beta')))
    class BetaFeature {}

    const container = new Container();

    // Add multiple tags at once
    container.addTags('premium', 'beta', 'experimental');

    // Verify all tags are present
    expect(container.hasTag('premium')).toBe(true);
    expect(container.hasTag('beta')).toBe(true);
    expect(container.hasTag('experimental')).toBe(true);

    // Register features after tags are added
    container.addRegistration(R.fromClass(PremiumFeature)).addRegistration(R.fromClass(BetaFeature));

    // Both features are available because container has both tags
    expect(container.resolve('premiumFeature')).toBeInstanceOf(PremiumFeature);
    expect(container.resolve('betaFeature')).toBeInstanceOf(BetaFeature);
  });

  it('should affect child scope creation', () => {
    @register(bindTo('service'), scope((s) => s.hasTag('api')))
    class ApiService {
      handleRequest() {
        return 'API response';
      }
    }

    const appContainer = new Container();

    // Add tag to parent
    appContainer.addTags('api');
    appContainer.addRegistration(R.fromClass(ApiService));

    // Create child scopes - they inherit parent's registrations
    const requestScope1 = appContainer.createScope({ tags: ['request'] });
    const requestScope2 = appContainer.createScope({ tags: ['request'] });

    // Both scopes can access the ApiService from parent
    expect(requestScope1.resolve<ApiService>('service').handleRequest()).toBe('API response');
    expect(requestScope2.resolve<ApiService>('service').handleRequest()).toBe('API response');
  });

  it('should enable incremental tag addition', () => {
    const container = new Container();

    // Start with basic tags
    container.addTags('application');
    expect(container.hasTag('application')).toBe(true);

    // Add more tags as needed
    container.addTags('monitoring', 'logging');
    expect(container.hasTag('monitoring')).toBe(true);
    expect(container.hasTag('logging')).toBe(true);

    // All tags are retained
    expect(container.hasTag('application')).toBe(true);
  });
});
