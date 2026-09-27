import 'reflect-metadata';
import {
  arg,
  bindTo,
  by,
  Container,
  DependencyNotFoundError,
  hook,
  HookCollector,
  type HookType,
  inject,
  register,
  Registration as R,
  runInOrder,
  scope,
  singleton,
  SingleToken,
  toTask,
} from '../../lib';

/**
 * The recipes and pitfalls documented in the package's AGENTS.md, kept
 * executable so the guide an AI agent reads cannot drift from the API.
 */
describe('AGENTS.md recipes', () => {
  interface ILogger {
    log(message: string): void;
  }
  const ILoggerToken = new SingleToken<ILogger>('ILogger');

  // Without scope(...) a registration is copied into every child scope, so each
  // request would get its own "singleton"; pin it to the application scope.
  @register(bindTo(ILoggerToken), scope((s) => s.hasTag('application')), singleton())
  class Logger implements ILogger {
    readonly messages: string[] = [];
    log(message: string) {
      this.messages.push(message);
    }
  }

  it('registers a singleton and injects it by token', () => {
    class App {
      constructor(@inject(by(ILoggerToken)) readonly logger: ILogger) {}
    }

    const container = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));

    const app = container.resolve(App);
    expect(app.logger).toBeInstanceOf(Logger);
    expect(container.resolve(App).logger).toBe(app.logger);
  });

  it('registers a request-scoped service that depends on an application singleton', () => {
    const IRepositoryToken = new SingleToken<Repository>('IRepository');

    @register(bindTo(IRepositoryToken), scope((s) => s.hasTag('request')), singleton())
    class Repository {
      constructor(@inject(by(ILoggerToken)) readonly logger: ILogger) {}
    }

    const app = new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromClass(Repository));
    const request = app.createScope({ tags: ['request'] });

    expect(IRepositoryToken.resolve(request).logger).toBe(ILoggerToken.resolve(app));
    // Registered only in request scopes, so the application scope cannot see it
    expect(() => IRepositoryToken.resolve(app)).toThrow(DependencyNotFoundError);
  });

  it('registers values and factories with the fluent API', () => {
    const container = new Container()
      .addRegistration(R.fromValue('https://api.example.com').bindTo('API_URL'))
      .addRegistration(R.fromFn(({ scope }) => `${scope.resolve<string>('API_URL')}/v1`).bindTo('API_V1'));

    expect(container.resolve('API_V1')).toBe('https://api.example.com/v1');
  });

  it('passes runtime args to a constructor', () => {
    const IClientToken = new SingleToken<Client>('IClient');

    @register(bindTo(IClientToken))
    class Client {
      constructor(@inject(arg(0)) readonly baseUrl: string) {}
    }

    const container = new Container().addRegistration(R.fromClass(Client));

    expect(IClientToken.args('https://a.example.com').resolve(container).baseUrl).toBe('https://a.example.com');
    // container.resolve takes a key or a class; resolve a token through the token itself
    expect(IClientToken.resolve(container, { args: ['https://b.example.com'] }).baseUrl).toBe('https://b.example.com');
    expect(container.resolve<Client>('IClient', { args: ['https://c.example.com'] }).baseUrl).toBe(
      'https://c.example.com',
    );
  });

  it('runs hooks only when the application runs what the collector returns', () => {
    const onInit = (fn: HookType) => hook('onInit', fn);
    const onInitHooks = new HookCollector({ key: 'onInit' });

    class Service {
      ready = false;

      @onInit((ctx) => {
        ctx.invokeMethod({ args: ctx.resolveArgs() });
      })
      init() {
        this.ready = true;
      }
    }

    const container = new Container();
    container.getInjector().onConstructed((instance, scope) => {
      void runInOrder(onInitHooks.getActions(instance, { scope }).map(toTask));
    });

    expect(container.resolve(Service).ready).toBe(true);
  });

  describe('pitfalls', () => {
    it('leaves a constructor param without @inject undefined', () => {
      class App {
        constructor(readonly logger?: ILogger) {}
      }

      const container = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));

      expect(container.resolve(App).logger).toBeUndefined();
    });

    it('copies a registration without scope(...) into every child scope', () => {
      @register(bindTo('Cache'), singleton())
      class Cache {}

      const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Cache));
      const request = app.createScope({ tags: ['request'] });

      expect(request.resolve('Cache')).not.toBe(app.resolve('Cache'));
    });

    it('rejects a token passed to container.resolve at compile time', () => {
      const container = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));

      // @ts-expect-error container.resolve takes a key or a class: use ILoggerToken.resolve(container)
      expect(() => container.resolve(ILoggerToken)).toThrow(DependencyNotFoundError);
    });

    it('rejects a bare token in @inject at compile time', () => {
      class App {
        // @ts-expect-error inject takes one InjectFn: wrap the token with by(...)
        constructor(@inject(ILoggerToken) readonly logger: ILogger) {}
      }

      expect(App).toBeDefined();
    });

    it('hands a token in args to the constructor as-is', () => {
      class Holder {
        constructor(@inject(arg(0)) readonly value: unknown) {}
      }

      const container = new Container();

      expect(container.resolve(Holder, { args: [ILoggerToken] }).value).toBe(ILoggerToken);
    });
  });
});
