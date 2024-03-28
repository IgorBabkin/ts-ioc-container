import 'reflect-metadata';
import { Container, IContainer, Registration as R, SimpleInjector } from '../lib';

describe('SimpleInjector', function () {
  it('should pass container as first parameter', function () {
    class App {
      constructor(public container: IContainer) {}
    }

    const container = new Container(new SimpleInjector()).use(R.fromClass(App).to('App'));
    const app = container.resolve<App>('App');

    expect(app.container).toBeInstanceOf(Container);
  });

  it('should pass parameters alongside with container', function () {
    class App {
      constructor(
        container: IContainer,
        public greeting: string,
      ) {}
    }

    const container = new Container(new SimpleInjector()).use(R.fromClass(App).to('App'));
    const app = container.resolve<App>('App', 'Hello world');

    expect(app.greeting).toBe('Hello world');
  });
});
