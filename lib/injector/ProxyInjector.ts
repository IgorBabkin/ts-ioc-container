import { IInjector, InjectOptions, Injector } from './IInjector';
import type { IContainer } from '../container/IContainer';
import { type constructor } from '../utils/basic';

export class ProxyInjector extends Injector implements IInjector {
  protected createInstance<T>(scope: IContainer, Target: constructor<T>, { args = [] }: InjectOptions = {}): T {
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
