import 'reflect-metadata';
import {
  args,
  argsFn,
  bindTo,
  Container,
  inject,
  type IInjector,
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
        @inject('Logger') readonly logger: Logger,
        @inject(args(0)) readonly tenant: string,
        @inject(argsFn(([tenant]) => `${tenant}:audit`)) readonly auditKey: string,
      ) {}
    }

    const container = new Container().addRegistration(R.fromClass(Logger)).addRegistration(R.fromClass(Controller));

    const controller = container.resolve<Controller>('Controller', { args: ['tenant-a'] });

    expect(controller.logger).toBeInstanceOf(Logger);
    expect(controller.tenant).toBe('tenant-a');
    expect(controller.auditKey).toBe('tenant-a:audit');
  });

  it('leaves constructor parameters without @inject metadata as undefined', () => {
    class Logger {
      readonly name = 'logger';
    }

    class Controller {
      constructor(
        @inject('Logger') readonly logger: Logger,
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
      resolve<T>(container: Container, Target: constructor<T>, options: ProviderOptions = {}): T {
        const instance = new Target(`custom:${options.args?.[0]}`) as T;
        container.addInstance(instance as never);
        return instance;
      }
    }

    const container = new Container({ injector: new StaticFactoryInjector() }).addRegistration(R.fromClass(Service));

    const service = container.resolve<Service>('Service', { args: ['factory'] });

    expect(service.createdBy).toBe('custom:factory');
    expect(container.getInstances()).toContain(service);
  });
});
