import 'reflect-metadata';
import {
  arg,
  args,
  argsFn,
  bindTo,
  Container,
  inject,
  type IInjector,
  pipe,
  ProxyInjector,
  register,
  Registration as R,
  SimpleInjector,
  toGroupAlias,
} from '../../lib';
import type { ProviderOptions } from '../../lib/provider/IProvider';
import type { constructor } from '../../lib/utils/basic';

describe('Spec: injector strategies', () => {
  it('resolves constructor metadata and runtime argument helpers', () => {
    class Logger {
      readonly name = 'logger';
    }

    class Controller {
      constructor(
        @inject(({ scope, args }) => scope.resolve('Logger', { args })) readonly logger: Logger,
        @inject(arg(0)) readonly id: number,
        @inject(argsFn((value) => typeof value === 'string')) readonly tenant: string,
        @inject(args) readonly allArgs: unknown[],
      ) {}
    }

    const container = new Container().addRegistration(R.fromClass(Logger)).addRegistration(R.fromClass(Controller));

    const controller = container.resolve<Controller>('Controller', { args: [100, 'tenant-a'] });

    expect(controller.logger).toBeInstanceOf(Logger);
    expect(controller.id).toBe(100);
    expect(controller.tenant).toBe('tenant-a');
    expect(controller.allArgs).toEqual([100, 'tenant-a']);
  });

  it('calls the one inject function with the resolution context and injects its result', () => {
    class Logger {
      readonly name = 'logger';
    }

    const seen: unknown[] = [];

    class Controller {
      constructor(
        @inject((options) => {
          seen.push(options);
          return options.scope.resolve<Logger>('Logger').name;
        })
        readonly loggerName: string,
      ) {}
    }

    const container = new Container().addRegistration(R.fromClass(Logger)).addRegistration(R.fromClass(Controller));

    const controller = container.resolve<Controller>('Controller', { args: ['request-1'] });

    expect(controller.loggerName).toBe('logger');
    expect(seen).toEqual([{ scope: container, args: ['request-1'] }]);
  });

  it('maps an injected value by composing the inject function with pipe', () => {
    class Config {
      readonly apiUrl = 'https://api.com/';
    }

    const stripTrailingSlash = (url: string) => url.replace(/\/$/, '');

    class ApiClient {
      constructor(
        @inject(
          pipe(
            ({ scope }) => scope.resolve(Config),
            (config) => config.apiUrl,
            stripTrailingSlash,
          ),
        )
        readonly apiUrl: string,
      ) {}
    }

    const container = new Container().addRegistration(R.fromClass(Config));

    expect(container.resolve(ApiClient).apiUrl).toBe('https://api.com');
  });

  it('leaves constructor parameters without @inject metadata as undefined', () => {
    class Logger {
      readonly name = 'logger';
    }

    class Controller {
      constructor(
        @inject(({ scope, args }) => scope.resolve('Logger', { args })) readonly logger: Logger,
        readonly unannotated?: string,
      ) {}
    }

    const container = new Container().addRegistration(R.fromClass(Logger)).addRegistration(R.fromClass(Controller));

    const controller = container.resolve<Controller>('Controller');

    expect(controller.logger).toBeInstanceOf(Logger);
    expect(controller.unannotated).toBeUndefined();
  });

  it('uses the simple injector for direct container access', () => {
    class Logger {
      readonly name = 'logger';
    }

    class Service {
      readonly logger: Logger;

      constructor(
        scope: Container,
        readonly tenant: string,
      ) {
        this.logger = scope.resolve('Logger');
      }
    }

    const container = new Container({ injector: new SimpleInjector() })
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromClass(Service));

    const service = container.resolve<Service>('Service', { args: ['tenant-a'] });

    expect(service.logger).toBeInstanceOf(Logger);
    expect(service.tenant).toBe('tenant-a');
    expect(container.getInstances()).toContain(service);
  });

  it('uses the proxy injector for property and alias resolution', () => {
    class Logger {
      readonly name = 'logger';
    }

    const PluginAlias = toGroupAlias<Plugin>('PluginAlias');

    @register(bindTo(PluginAlias))
    class Plugin {
      readonly name = 'plugin';
    }

    class Service {
      readonly loggerName: string;
      readonly argsValue: unknown[];
      readonly pluginCount: number;

      constructor(props: { Logger: Logger; PluginAlias: Plugin[]; args: unknown[] }) {
        this.loggerName = props.Logger.name;
        this.pluginCount = props.PluginAlias.length;
        this.argsValue = props.args;
      }
    }

    const container = new Container({ injector: new ProxyInjector() })
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromClass(Plugin))
      .addRegistration(R.fromClass(Service));

    const service = container.resolve<Service>('Service', { args: ['runtime'] });

    expect(service.loggerName).toBe('logger');
    expect(service.pluginCount).toBe(1);
    expect(service.argsValue).toEqual(['runtime']);
  });

  it('allows custom injector construction strategies', () => {
    class Service {
      constructor(readonly createdBy: string) {}
    }

    class StaticFactoryInjector implements IInjector {
      resolve<T>(Target: constructor<T>, { scope, args = [] }: ProviderOptions): T {
        const instance = new Target(`custom:${args[0]}`) as T;
        scope.addInstance(instance as never);
        return instance;
      }

      // Construct hooks are the injector's domain, so a from-scratch injector
      // either keeps its own list or, as here, declines to raise them.
      onConstructed(): this {
        return this;
      }
    }

    const container = new Container({ injector: new StaticFactoryInjector() }).addRegistration(R.fromClass(Service));

    const service = container.resolve<Service>('Service', { args: ['factory'] });

    expect(service.createdBy).toBe('custom:factory');
    expect(container.getInstances()).toContain(service);
  });
});
