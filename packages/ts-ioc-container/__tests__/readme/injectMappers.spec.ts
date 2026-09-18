import 'reflect-metadata';
import { Container, inject, Registration as R, pipe, by } from '../../lib';

/**
 * Mapping injected values
 *
 * `@inject` takes one `InjectFn`, so mapping what it resolves is composition:
 * `pipe(fn, ...mappers)` applies each mapper to the previous result, left to
 * right, and is itself an `InjectFn`. Mappers are plain functions, so they
 * compose into reusable, named steps.
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
      constructor(
        @inject(pipe(by<Config>('Config'), takeApiUrl(), stripTrailingSlash(), requireHttps()))
        readonly apiUrl: string,
      ) {}
    }

    const container = new Container().addRegistration(
      R.fromValue<Config>({ apiUrl: 'https://api.com/', retries: 3 }).bindToKey('Config'),
    );

    expect(container.resolve(ApiClient).apiUrl).toBe('https://api.com');
  });

  it('should throw from a mapper when the resolved value is not acceptable', () => {
    class ApiClient {
      constructor(
        @inject(pipe(by<Config>('Config'), takeApiUrl(), requireHttps()))
        readonly apiUrl: string,
      ) {}
    }

    const container = new Container().addRegistration(
      R.fromValue<Config>({ apiUrl: 'http://api.com', retries: 3 }).bindToKey('Config'),
    );

    expect(() => container.resolve(ApiClient)).toThrow('Insecure api url: http://api.com');
  });
});
