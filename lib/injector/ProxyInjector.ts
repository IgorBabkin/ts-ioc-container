import { IInjector, InjectOptions } from './IInjector';
import { IContainer } from '../container/IContainer';
import { constructor } from '../utils';

function getProp(target: object, key: string | symbol): unknown {
  // @ts-ignore
  return target[key];
}

export class ProxyInjector implements IInjector {
  resolve<T>(container: IContainer, Target: constructor<T>, { args: deps }: InjectOptions): T {
    const args = (deps as object[]).reduce((acc, it) => ({ ...acc, ...it }), {});
    const proxy = new Proxy(
      {},
      {
        get(target: {}, prop: string | symbol): any {
          // eslint-disable-next-line no-prototype-builtins
          return args.hasOwnProperty(prop)
            ? getProp(args, prop)
            : prop.toString().search(/array/gi) >= 0
              ? container.resolveMany(prop)
              : container.resolve(prop);
        },
      },
    );
    return new Target(proxy);
  }
}
