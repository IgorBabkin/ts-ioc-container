import { args, appendArgs, bindTo, Container, inject, register, Registration as R, SingleToken } from '../../lib';

interface IConfig {
  apiUrl: string;
}

@register(bindTo('IConfig'), appendArgs('https://api.example.com'))
class ConfigService implements IConfig {
  constructor(@inject(args(0)) public apiUrl: string) {}
}

const IConfigToken = new SingleToken<IConfig>('IConfig');

class App {
  constructor(@inject(IConfigToken.lazy()) public config: IConfig) {}
}

describe('Token Lazy Loading', function () {
  it('should support lazy loading with tokens', function () {
    const container = new Container().addRegistration(R.fromClass(ConfigService));

    const app = container.resolve(App);
    expect(app.config).toBeDefined();
    expect(app.config.apiUrl).toBe('https://api.example.com');
  });
});
