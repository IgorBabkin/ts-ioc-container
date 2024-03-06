import 'reflect-metadata';
import { Container, ProxyInjector, args, Registration } from '../lib';

describe('ProxyInjector', function () {
  it('should pass dependency to constructor as dictionary', function () {
    class Logger {}

    class App {
      logger: Logger;

      constructor({ logger }: { logger: Logger }) {
        this.logger = logger;
      }
    }

    const container = new Container(new ProxyInjector()).use(Registration.fromClass(Logger).to('logger'));

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
      .use(Registration.fromClass(App).to('App').pipe(args({ greetingTemplate })))
      .use(Registration.fromClass(Logger).to('logger'));

    const app = container.resolve<App>('App', { name: `world` });
    expect(app.greeting).toBe('Hello world');
  });
});
