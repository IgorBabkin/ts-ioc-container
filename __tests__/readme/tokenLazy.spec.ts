import { args, bindTo, setArgs, Container, inject, register, Registration as R, SingleToken } from '../../lib';

interface IConfig {
  apiUrl: string;
}

@register(bindTo('IConfig'), setArgs('https://api.example.com'))
class ConfigService implements IConfig {
  constructor(@inject(args(0)) public apiUrl: string) {}
}

class App {
  constructor(
    @inject(new SingleToken<IConfig>('IConfig').lazy())
    public config: IConfig,
  ) {}
}

describe('Token Lazy Loading', function () {
  it('should support lazy loading with tokens', function () {
    const container = new Container().addRegistration(R.fromClass(ConfigService));

    const app = container.resolve(App);
    expect(app.config).toBeDefined();
    expect(app.config.apiUrl).toBe('https://api.example.com');
  });
});
