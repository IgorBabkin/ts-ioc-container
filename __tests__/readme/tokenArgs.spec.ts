import { Container, inject, Registration as R, SingleToken } from '../../lib';

interface IConfig {
  apiUrl: string;
  timeout: number;
}

class ConfigService implements IConfig {
  constructor(
    public apiUrl: string,
    public timeout: number,
  ) {}
}

const IConfigKey = new SingleToken<IConfig>('IConfig');

class App {
  constructor(
    @inject(IConfigKey.args('https://api.example.com', 5000))
    public config: IConfig,
  ) {}
}

describe('Token Argument Binding', function () {
  it('should bind arguments to token', function () {
    const container = new Container().addRegistration(R.fromClass(ConfigService).bindToKey('IConfig'));

    const app = container.resolve(App);
    expect(app.config.apiUrl).toBe('https://api.example.com');
    expect(app.config.timeout).toBe(5000);
  });
});
