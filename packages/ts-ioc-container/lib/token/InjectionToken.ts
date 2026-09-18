import { type DependencyKey, type IContainer } from '../container/IContainer';
import { ArgsFn, ProviderOptions } from '../provider/IProvider';
import { type constructor, Is } from '../utils/basic';

/**
 * The default `getArgsFn` of every token: the runtime `args` a token is
 * resolved with reach the provider as they are, and `token.args(...)` /
 * `token.argsFn(...)` append after them.
 */
export const forwardArgs: ArgsFn = (_, { args = [] } = {}) => args;

export abstract class InjectionToken<T = any> {
  abstract resolve(s: IContainer, options?: ProviderOptions): T;
  abstract args(...deps: unknown[]): InjectionToken<T>;
  abstract argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<T>;
  abstract lazy(): InjectionToken<T>;
  /**
   * @throws {MethodNotImplementedError} when the token has no underlying key (e.g. `FunctionToken`, `ConstantToken`, `GroupInstanceToken`).
   */
  abstract getKey(): DependencyKey | constructor<T>;
}

export function isInjectionToken(target: unknown): target is InjectionToken {
  return Is.object(target) && 'resolve' in target && 'args' in target && 'argsFn' in target && 'lazy' in target;
}
