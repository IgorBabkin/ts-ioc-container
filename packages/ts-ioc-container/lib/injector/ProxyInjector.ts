import { IInjector, InjectOptions, Injector } from './IInjector';
import { type constructor } from '../utils/basic';

/**
 * Injector that passes one proxy object as the first constructor argument:
 * reading `deps.someKey` resolves `'someKey'`, a property name containing
 * "alias" resolves by alias, and `deps.args` returns the runtime args. Needs no
 * decorators or `reflect-metadata`.
 *
 * @example
 * class App {
 *   constructor({ logger }: { logger: ILogger }) {}
 * }
 * new Container({ injector: new ProxyInjector() });
 */
export class ProxyInjector extends Injector implements IInjector {
  protected createInstance<T>(Target: constructor<T>, { scope, args = [] }: InjectOptions): T {
    const proxy = new Proxy(
      {},
      {
        get(target: {}, prop: string | symbol): any {
          if (prop === 'args') {
            return args;
          }
          return prop.toString().search(/alias/gi) >= 0 ? scope.resolveByAlias(prop) : scope.resolve(prop);
        },
      },
    );
    return new Target(proxy);
  }
}
