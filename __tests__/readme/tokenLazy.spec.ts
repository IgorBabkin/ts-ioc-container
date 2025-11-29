import { args, Container, inject, Registration as R, SingleToken } from '../../lib';

interface IConfig {
  apiUrl: string;
}

class ConfigService implements IConfig {
  constructor(public apiUrl: string) {}
}

class App {
  constructor(
    @inject(new SingleToken<IConfig>('IConfig').lazy())
    public config: IConfig,
  ) {}
}

describe('Token Lazy Loading', function () {
  it('should support lazy loading with tokens', function () {
    const container = new Container().addRegistration(
      R.fromClass(ConfigService).pipe(args('https://api.example.com')).bindToKey('IConfig'),
    );

    const app = container.resolve(App);
    expect(app.config).toBeDefined();
    expect(app.config.apiUrl).toBe('https://api.example.com');
  });
});
