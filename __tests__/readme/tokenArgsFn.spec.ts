import { args, bindTo, Container, inject, register, Registration as R, SingleToken } from '../../lib';

interface IConfig {
  apiUrl: string;
  timeout: number;
}

@register(bindTo('IConfig'))
class ConfigService implements IConfig {
  constructor(
    @inject(args(0)) public apiUrl: string,
    @inject(args(1)) public timeout: number,
  ) {}
}

const IConfigKey = new SingleToken<IConfig>('IConfig');

class App {
  constructor(
    @inject(IConfigKey.argsFn((scope) => [scope.resolve('API_URL'), 5000]))
    public config: IConfig,
  ) {}
}

describe('Token Dynamic Arguments', function () {
  it('should resolve arguments dynamically', function () {
    const container = new Container()
      .addRegistration(R.fromValue('https://api.example.com').bindToKey('API_URL'))
      .addRegistration(R.fromClass(ConfigService));

    const app = container.resolve(App);
    expect(app.config.apiUrl).toBe('https://api.example.com');
    expect(app.config.timeout).toBe(5000);
  });
});
