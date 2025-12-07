import { Container, inject, Registration as R, SingleToken } from '../../lib';

/**
 * Configuration - Token with Arguments
 *
 * Sometimes you want to pass configuration values directly at the injection point.
 * This is useful for:
 * - Reusable services that need different config in different places
 * - Configuring generic classes (like generic repositories or API clients)
 * - Passing primitive values (timeouts, URLs, flags) without creating dedicated config classes
 *
 * The `.args()` method on a token allows you to "curry" arguments for the provider.
 */

interface IApiClient {
  get(endpoint: string): string;
}

class ApiClient implements IApiClient {
  constructor(
    public baseUrl: string,
    public timeout: number,
  ) {}

  get(endpoint: string): string {
    return `GET ${this.baseUrl}${endpoint} (timeout: ${this.timeout})`;
  }
}

// Token for IApiClient
const ApiClientToken = new SingleToken<IApiClient>('IApiClient');

class DataService {
  constructor(
    // Inject ApiClient configured for the 'data' service
    @inject(ApiClientToken.args('https://data.api.com', 5000))
    public client: IApiClient,
  ) {}
}

class UserService {
  constructor(
    // Inject ApiClient configured for the 'users' service
    @inject(ApiClientToken.args('https://users.api.com', 1000))
    public client: IApiClient,
  ) {}
}

describe('Token Argument Binding', function () {
  it('should create different instances based on token arguments', function () {
    const container = new Container().addRegistration(R.fromClass(ApiClient).bindToKey('IApiClient'));

    const dataService = container.resolve(DataService);
    const userService = container.resolve(UserService);

    expect(dataService.client.get('/items')).toBe('GET https://data.api.com/items (timeout: 5000)');
    expect(userService.client.get('/me')).toBe('GET https://users.api.com/me (timeout: 1000)');
  });
});
