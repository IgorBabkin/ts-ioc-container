import { type IContainer } from '../container/IContainer';
import { ArgsFn, ProviderOptions } from '../provider/IProvider';
import { Is } from '../utils/basic';

export abstract class InjectionToken<T = any> {
  abstract resolve(s: IContainer, options?: ProviderOptions): T;
  abstract args(...deps: unknown[]): InjectionToken<T>;
  abstract argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<T>;
  abstract lazy(): InjectionToken<T>;
}

export const setArgs =
  (...args: unknown[]): ArgsFn =>
  (s) =>
    args;

export function isInjectionToken(target: unknown): target is InjectionToken {
  return Is.object(target) && 'resolve' in target && 'args' in target && 'argsFn' in target && 'lazy' in target;
}
