import { InjectOptions, Injector } from './IInjector';
import type { IContainer } from '../container/IContainer';
import type { constructor } from '../utils';

function getProp(target: object, key: string | symbol): unknown {
  // @ts-ignore
  return target[key];
}

export class ProxyInjector extends Injector {
  protected createInstance<T>(scope: IContainer, Target: constructor<T>, { args: deps = [] }: InjectOptions = {}): T {
    const args = (deps as object[]).reduce((acc, it) => ({ ...acc, ...it }), {});
    const proxy = new Proxy(
      {},
      {
        get(target: {}, prop: string | symbol): any {
          // eslint-disable-next-line no-prototype-builtins
          return args.hasOwnProperty(prop)
            ? getProp(args, prop)
            : prop.toString().search(/array/gi) >= 0
              ? scope.resolveMany(prop)
              : scope.resolveOne(prop);
        },
      },
    );
    return new Target(proxy);
  }
}
