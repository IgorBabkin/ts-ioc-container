import 'reflect-metadata';
import { Container, ProxyInjector, args, Registration as R } from '../lib';

describe('ProxyInjector', function () {
  it('should pass dependency to constructor as dictionary', function () {
    class Logger {}

    class App {
      logger: Logger;

      constructor({ logger }: { logger: Logger }) {
        this.logger = logger;
      }
    }

    const container = new Container(new ProxyInjector()).add(R.toClass(Logger).fromKey('logger'));

    const app = container.resolve(App);
    expect(app.logger).toBeInstanceOf(Logger);
  });

  it('should pass arguments as objects', function () {
    class Logger {}

    class App {
      logger: Logger;
      greeting: string;

      constructor({
        logger,
        greetingTemplate,
        name,
      }: {
        logger: Logger;
        greetingTemplate: (name: string) => string;
        name: string;
      }) {
        this.logger = logger;
        this.greeting = greetingTemplate(name);
      }
    }

    const greetingTemplate = (name: string) => `Hello ${name}`;

    const container = new Container(new ProxyInjector())
      .add(R.toClass(App).fromKey('App').pipe(args({ greetingTemplate })))
      .add(R.toClass(Logger).fromKey('logger'));

    const app = container.resolve<App>('App', { args: [{ name: `world` }] });
    expect(app.greeting).toBe('Hello world');
  });
});
