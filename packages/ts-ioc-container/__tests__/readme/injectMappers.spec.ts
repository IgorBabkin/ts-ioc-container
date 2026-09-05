import 'reflect-metadata';
import { Container, inject, Registration as R } from '../../lib';

/**
 * Mapping injected values
 *
 * Every argument after the first one passed to `@inject` (or `injectProp`) is a
 * mapper applied to the resolved instance, left to right. Mappers are plain
 * functions, so they compose into reusable, named steps.
 */

interface Config {
  apiUrl: string;
  retries: number;
}

// Reusable mappers, each returning a `(value) => value` function
const takeApiUrl = () => (config: Config) => config.apiUrl;
const stripTrailingSlash = () => (url: string) => url.replace(/\/$/, '');
const requireHttps = () => (url: string) => {
  if (!url.startsWith('https://')) {
    throw new Error(`Insecure api url: ${url}`);
  }
  return url;
};

describe('inject mappers', () => {
  it('should pipe the resolved dependency through every mapper', () => {
    class ApiClient {
      constructor(@inject('Config', takeApiUrl(), stripTrailingSlash(), requireHttps()) readonly apiUrl: string) {}
    }

    const container = new Container().addRegistration(
      R.fromValue<Config>({ apiUrl: 'https://api.com/', retries: 3 }).bindToKey('Config'),
    );

    expect(container.resolve(ApiClient).apiUrl).toBe('https://api.com');
  });

  it('should throw from a mapper when the resolved value is not acceptable', () => {
    class ApiClient {
      constructor(@inject('Config', takeApiUrl(), requireHttps()) readonly apiUrl: string) {}
    }

    const container = new Container().addRegistration(
      R.fromValue<Config>({ apiUrl: 'http://api.com', retries: 3 }).bindToKey('Config'),
    );

    expect(() => container.resolve(ApiClient)).toThrow('Insecure api url: http://api.com');
  });
});
