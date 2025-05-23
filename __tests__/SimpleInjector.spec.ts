import { Container, type IContainer, Registration as R, SimpleInjector } from '../lib';

describe('SimpleInjector', function () {
  it('should pass container as first parameter', function () {
    class App {
      constructor(public container: IContainer) {}
    }

    const container = new Container({ injector: new SimpleInjector() }).addRegistration(
      R.fromClass(App).bindToKey('App'),
    );
    const app = container.resolveOne<App>('App');

    expect(app.container).toBeInstanceOf(Container);
  });

  it('should pass parameters alongside with container', function () {
    class App {
      constructor(
        container: IContainer,
        public greeting: string,
      ) {}
    }

    const container = new Container({ injector: new SimpleInjector() }).addRegistration(
      R.fromClass(App).bindToKey('App'),
    );
    const app = container.resolveOne<App>('App', { args: ['Hello world'] });

    expect(app.greeting).toBe('Hello world');
  });
});
