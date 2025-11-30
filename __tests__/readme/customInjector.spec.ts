import { type constructor, Container, type IContainer, Injector, ProviderOptions } from '../../lib';

class CustomInjector extends Injector {
  createInstance<T>(container: IContainer, target: constructor<T>, { args = [] }: ProviderOptions = {}): T {
    return new App(args[0] as string) as T;
  }
}

class App {
  constructor(public version: string) {}
}

describe('Custom Injector', function () {
  it('should use custom injector for dependency injection', function () {
    const container = new Container({ injector: new CustomInjector() });

    const app = container.resolve<App>(App, { args: ['1.0.0'] });

    expect(app.version).toBe('1.0.0');
  });
});
