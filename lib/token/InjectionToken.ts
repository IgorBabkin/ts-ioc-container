import { type IContainer } from '../container/IContainer';
import { ArgsFn, ProviderOptions, WithLazy } from '../provider/IProvider';

export abstract class InjectionToken<T = any> {
  abstract resolve(s: IContainer, options?: ProviderOptions): T;
  abstract args(...deps: unknown[]): InjectionToken<T>;
  abstract argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<T>;
  abstract lazy(): InjectionToken<T>;
}

type WithArgsFn = {
  argsFn: ArgsFn;
};
export type TokenOptions = Partial<WithArgsFn> & Partial<WithLazy>;
export const setArgs =
  (...args: unknown[]): ArgsFn =>
  (s) =>
    args;
